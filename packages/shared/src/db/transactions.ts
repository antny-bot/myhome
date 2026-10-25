import { getDb, getPreparedStatement } from "./connection.js";
import { RegionInfo, TransactionNode, GraphFilter } from "../types.js";

/**
 * 실거래 식별 키 생성
 */
export function makeGraphDedupeKey(
  lawdCode: string,
  apartmentName: string,
  dealDate: string,
  areaM2: number | undefined,
  floor: number | undefined
): string {
  return [lawdCode, apartmentName, dealDate, areaM2 ?? "", floor ?? ""].join("|");
}

export type BatchUpsertItem = {
  complexName: string;
  tx: TransactionNode;
  addressInfo?: { dongName?: string; jibun?: string; roadName?: string };
};

/**
 * 실거래 데이터 단건 Upsert (하위 호환 유지)
 */
export async function upsertTransaction(
  region: RegionInfo,
  complexName: string,
  tx: TransactionNode,
  addressInfo?: { dongName?: string; jibun?: string; roadName?: string }
): Promise<void> {
  return upsertTransactionBatch(region, [{ complexName, tx, addressInfo }]);
}

/**
 * 실거래 데이터 배치 Upsert
 * 전체 records를 단일 트랜잭션으로 묶어 HDD 환경에서 fsync 횟수를 N→1회로 감소.
 * Synology 등 IOPS가 제한된 환경에서 수 분 → 수 초로 대폭 단축됨.
 */
export async function upsertTransactionBatch(
  region: RegionInfo,
  items: BatchUpsertItem[]
): Promise<void> {
  if (items.length === 0) return;

  const db = getDb();
  const now = new Date().toISOString();

  // Prepared statements 캐싱 활용
  const regionStmt = getPreparedStatement(`
    INSERT INTO regions (lawd_code, display_name, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(lawd_code) DO UPDATE SET display_name = excluded.display_name
  `);
  const complexStmt = getPreparedStatement(`
    INSERT INTO complexes (id, lawd_code, name, created_at, dong_name, jibun, road_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      dong_name = COALESCE(excluded.dong_name, complexes.dong_name),
      jibun = COALESCE(excluded.jibun, complexes.jibun),
      road_name = COALESCE(excluded.road_name, complexes.road_name)
  `);
  const txStmt = getPreparedStatement(`
    INSERT INTO transactions (dedupe_key, complex_id, lawd_code, deal_date, price_eok, area_m2, floor, collected_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(dedupe_key) DO UPDATE SET
      price_eok = excluded.price_eok,
      updated_at = ?
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    // region은 배치 전체에 공통 → 1번만 upsert
    let finalDisplayName = region.displayName;
    try {
      const existing = getPreparedStatement("SELECT display_name FROM regions WHERE lawd_code = ?").get(region.lawdCode) as { display_name: string } | undefined;
      if (existing && existing.display_name) {
        const existingHasSpace = existing.display_name.trim().includes(" ");
        const incomingHasSpace = region.displayName.trim().includes(" ");
        // 기존 이름은 정형화되어 있는데(공백 존재), 들어온 이름은 단편적이면(공백 없음) 기존 이름을 유지
        if (existingHasSpace && !incomingHasSpace) {
          finalDisplayName = existing.display_name;
        }
      }
    } catch (dbErr) {
      console.warn(`[db] regions 조회 실패 (기본 이름 사용):`, dbErr);
    }

    regionStmt.run(region.lawdCode, finalDisplayName, now);

    for (const { complexName, tx, addressInfo } of items) {
      const complexId = `${region.lawdCode}|${complexName}`;

      complexStmt.run(
        complexId, region.lawdCode, complexName, now,
        addressInfo?.dongName ?? null,
        addressInfo?.jibun ?? null,
        addressInfo?.roadName ?? null
      );

      txStmt.run(
        tx.dedupeKey,
        complexId,
        region.lawdCode,
        tx.dealDate,
        tx.priceEok,
        tx.areaM2 ?? null,
        tx.floor ?? null,
        now,
        now  // updated_at
      );
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * 다중 필터 조합 검색
 * - SARGable 직접 범위 비교 적용 (인덱스 레인지 스캔 활성화)
 * - t.lawd_code 직접 필터링
 * - LIMIT 안전 가드 적용
 */
export async function searchTransactions(filter: GraphFilter): Promise<any[]> {
  const db = getDb();
  
  let queryStr = `
    SELECT r.display_name AS regionName, r.lawd_code AS lawdCode, c.name AS apartmentName,
           t.deal_date AS dealDate, t.price_eok AS priceEok, t.area_m2 AS areaM2,
           m.supply_area_m2 AS supplyAreaM2, t.floor AS floor, t.dedupe_key AS dedupeKey
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    LEFT JOIN complex_area_mappings m ON t.complex_id = m.complex_id AND ROUND(t.area_m2, 2) = ROUND(m.area_m2, 2)
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter.lawdCodes && filter.lawdCodes.length > 0) {
    const placeholders = filter.lawdCodes.map(() => "?").join(",");
    queryStr += ` AND t.lawd_code IN (${placeholders})`;
    params.push(...filter.lawdCodes);
  } else if (filter.lawdCode) {
    queryStr += " AND t.lawd_code LIKE ? || '%'";
    params.push(filter.lawdCode);
  }
  if (filter.complexName) {
    queryStr += " AND c.name LIKE '%' || ? || '%'";
    params.push(filter.complexName);
  }
  if (filter.startDate) {
    const startVal = filter.startDate.length === 7 ? `${filter.startDate}-01` : filter.startDate;
    queryStr += " AND t.deal_date >= ?";
    params.push(startVal);
  }
  if (filter.endDate) {
    const endVal = filter.endDate.length === 7 ? `${filter.endDate}-31` : filter.endDate;
    queryStr += " AND t.deal_date <= ?";
    params.push(endVal);
  }
  if (filter.minArea !== undefined && filter.minArea !== null) {
    queryStr += " AND COALESCE(m.supply_area_m2, t.area_m2 / 0.78) >= ?";
    params.push(filter.minArea);
  }
  if (filter.maxArea !== undefined && filter.maxArea !== null) {
    queryStr += " AND COALESCE(m.supply_area_m2, t.area_m2 / 0.78) <= ?";
    params.push(filter.maxArea);
  }
  if (filter.minHouseholds !== undefined && filter.minHouseholds > 0) {
    queryStr += " AND c.total_households >= ?";
    params.push(filter.minHouseholds);
  }
  if (filter.minTotalParking !== undefined && filter.minTotalParking > 0) {
    queryStr += " AND c.total_parking >= ?";
    params.push(filter.minTotalParking);
  }
  if (filter.minParkingPerHousehold !== undefined && filter.minParkingPerHousehold > 0) {
    queryStr += " AND c.parking_per_household >= ?";
    params.push(filter.minParkingPerHousehold);
  }
  if (filter.minBuildYear !== undefined && filter.minBuildYear > 0) {
    queryStr += " AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) >= ?";
    params.push(filter.minBuildYear);
  }
  if (filter.maxBuildYear !== undefined && filter.maxBuildYear > 0) {
    queryStr += " AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) <= ?";
    params.push(filter.maxBuildYear);
  }

  queryStr += " ORDER BY t.deal_date DESC LIMIT 3000";

  const rows = db.prepare(queryStr).all(...params);
  return rows.map((r: any) => ({
    regionName: r.regionName,
    lawdCode: r.lawdCode,
    apartmentName: r.apartmentName,
    dealDate: r.dealDate,
    priceEok: r.priceEok,
    areaM2: r.areaM2,
    supplyAreaM2: r.supplyAreaM2,
    floor: r.floor,
    dedupeKey: r.dedupeKey,
  }));
}

/**
 * 특정 지역코드(lawdCode) 및 거래월(dealMonth: YYYYMM)에 적재된 로컬 실거래 건수 조회
 */
export function getLocalTransactionsCount(lawdCode: string, dealMonth: string): number {
  const dealMonthHyphen = `${dealMonth.slice(0, 4)}-${dealMonth.slice(4, 6)}`;
  const row = getPreparedStatement(`
    SELECT COUNT(*) AS count
    FROM transactions
    WHERE lawd_code = ? AND deal_date >= ? AND deal_date <= ?
  `).get(lawdCode, `${dealMonthHyphen}-01`, `${dealMonthHyphen}-31`) as { count: number } | undefined;
  return row?.count ?? 0;
}

/**
 * 특정 지역코드(lawdCode) 및 거래월(dealMonth: YYYYMM)의 실거래 목록을 로컬 DB로부터 직접 조회
 */
export function getLocalApartmentPrices(
  lawdCode: string,
  dealMonth: string
): { 
  apartmentName: string; 
  dealDate: string; 
  priceEok: number; 
  areaM2: number; 
  floor: number;
  dongName?: string | null;
  jibun?: string | null;
  roadName?: string | null;
  lat?: number | null;
  lng?: number | null;
}[] {
  const dealMonthHyphen = `${dealMonth.slice(0, 4)}-${dealMonth.slice(4, 6)}`;
  const rows = getPreparedStatement(`
    SELECT c.name AS apartmentName,
           t.deal_date AS dealDate,
           t.price_eok AS priceEok,
           t.area_m2 AS areaM2,
           t.floor AS floor,
           c.dong_name AS dongName,
           c.jibun AS jibun,
           c.road_name AS roadName,
           c.lat AS lat,
           c.lng AS lng
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE t.lawd_code = ? AND t.deal_date >= ? AND t.deal_date <= ?
    ORDER BY t.deal_date ASC
  `).all(lawdCode, `${dealMonthHyphen}-01`, `${dealMonthHyphen}-31`) as any[];
  return rows;
}
