import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { TransactionNode, RegionInfo, TrendPoint, GraphStats, GraphFilter, GraphTopologyData, ComplexSearchResult, DailyCollectStat, RegionCollectStat } from "./types.js";

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;

  const dbPath = process.env.SQLITE_DB_PATH ?? join(process.cwd(), "data", "myhome.db");
  _db = new DatabaseSync(dbPath);
  _db.exec("PRAGMA journal_mode = WAL"); // WAL 모드 활성화로 동시성 개선
  return _db;
}

export function initDb(): void {
  const db = getDb();
  
  // 테이블 정의
  db.exec(`
    CREATE TABLE IF NOT EXISTS regions (
      lawd_code TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complexes (
      id TEXT PRIMARY KEY, -- 'lawd_code|complex_name'
      lawd_code TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (lawd_code) REFERENCES regions(lawd_code),
      UNIQUE(lawd_code, name)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      dedupe_key TEXT PRIMARY KEY,
      complex_id TEXT NOT NULL,
      deal_date TEXT NOT NULL,
      price_eok REAL NOT NULL,
      area_m2 REAL,
      floor INTEGER,
      collected_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (complex_id) REFERENCES complexes(id)
    );

    CREATE TABLE IF NOT EXISTS region_apartment_cache (
      lawd_code TEXT NOT NULL,
      apartment_name TEXT NOT NULL,
      PRIMARY KEY (lawd_code, apartment_name)
    );

    CREATE TABLE IF NOT EXISTS region_apartment_cache_meta (
      lawd_code TEXT PRIMARY KEY,
      cached_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_deal_date ON transactions(deal_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_complex_id ON transactions(complex_id);
    CREATE INDEX IF NOT EXISTS idx_complexes_lawd_code ON complexes(lawd_code);
    CREATE INDEX IF NOT EXISTS idx_region_apartment_cache_lawd_code ON region_apartment_cache(lawd_code);
  `);

  // -- complexes 테이블 주소·좌표 컬럼 마이그레이션 (기존 DB 호환)
  const complexCols = db.prepare("PRAGMA table_info(complexes)").all() as { name: string }[];
  const colNames = new Set(complexCols.map((c: any) => c.name));
  if (!colNames.has('dong_name')) db.exec('ALTER TABLE complexes ADD COLUMN dong_name TEXT');
  if (!colNames.has('jibun')) db.exec('ALTER TABLE complexes ADD COLUMN jibun TEXT');
  if (!colNames.has('road_name')) db.exec('ALTER TABLE complexes ADD COLUMN road_name TEXT');
  if (!colNames.has('lat')) db.exec('ALTER TABLE complexes ADD COLUMN lat REAL');
  if (!colNames.has('lng')) db.exec('ALTER TABLE complexes ADD COLUMN lng REAL');
  if (!colNames.has('geocoded_at')) db.exec('ALTER TABLE complexes ADD COLUMN geocoded_at TEXT');

  // 좌표 보유 단지 조회 성능 인덱스
  db.exec('CREATE INDEX IF NOT EXISTS idx_complexes_geocoded ON complexes(lat, lng) WHERE lat IS NOT NULL');
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// 기존 closeGraphDb 호환용 래퍼
export async function closeGraphDb(): Promise<void> {
  closeDb();
}

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

/**
 * 실거래 데이터 Upsert
 */
export async function upsertTransaction(
  region: RegionInfo,
  complexName: string,
  tx: TransactionNode,
  addressInfo?: { dongName?: string; jibun?: string; roadName?: string }
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  db.exec("BEGIN TRANSACTION");
  try {
    // 1. region upsert
    db.prepare(`
      INSERT INTO regions (lawd_code, display_name, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT(lawd_code) DO UPDATE SET display_name = excluded.display_name
    `).run(region.lawdCode, region.displayName, now);

    // 2. complex upsert (주소 정보 포함)
    const complexId = `${region.lawdCode}|${complexName}`;
    db.prepare(`
      INSERT INTO complexes (id, lawd_code, name, created_at, dong_name, jibun, road_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        dong_name = COALESCE(excluded.dong_name, complexes.dong_name),
        jibun = COALESCE(excluded.jibun, complexes.jibun),
        road_name = COALESCE(excluded.road_name, complexes.road_name)
    `).run(
      complexId, region.lawdCode, complexName, now,
      addressInfo?.dongName ?? null,
      addressInfo?.jibun ?? null,
      addressInfo?.roadName ?? null
    );

    // 3. transaction upsert
    db.prepare(`
      INSERT INTO transactions (dedupe_key, complex_id, deal_date, price_eok, area_m2, floor, collected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(dedupe_key) DO UPDATE SET
        price_eok = excluded.price_eok,
        updated_at = ?
    `).run(
      tx.dedupeKey,
      complexId,
      tx.dealDate,
      tx.priceEok,
      tx.areaM2 ?? null,
      tx.floor ?? null,
      now,
      now
    );

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * 검색 단지명 유연 해석
 */
function resolveComplexName(db: DatabaseSync, complexName: string, lawdCode?: string): string {
  if (!complexName.trim()) return complexName;
  try {
    // 1. 정확히 일치하는 단지가 있는지 검사
    const exactQuery = db.prepare(`
      SELECT name FROM complexes
      WHERE name = ? ${lawdCode ? "AND lawd_code = ?" : ""}
      LIMIT 1
    `);
    const exactRow = lawdCode ? exactQuery.get(complexName, lawdCode) : exactQuery.get(complexName);
    if (exactRow) {
      return (exactRow as any).name;
    }

    // 2. 부분 일치하는 단지 중 실거래가 가장 많은 단지 1개 매칭
    const fuzzyQuery = db.prepare(`
      SELECT c.name, COUNT(t.dedupe_key) AS cnt
      FROM complexes c
      JOIN transactions t ON c.id = t.complex_id
      WHERE c.name LIKE '%' || ? || '%' ${lawdCode ? "AND c.lawd_code = ?" : ""}
      GROUP BY c.name
      ORDER BY cnt DESC
      LIMIT 1
    `);
    const fuzzyRow = lawdCode ? fuzzyQuery.get(complexName, lawdCode) : fuzzyQuery.get(complexName);
    if (fuzzyRow) {
      return (fuzzyRow as any).name;
    }
  } catch (err) {
    console.error("[SQLiteDB] resolveComplexName error", err);
  }
  return complexName;
}

/**
 * 특정 단지의 월별 평균 실거래가 추이
 */
export async function getComplexTrend(
  complexName: string,
  lawdCode?: string,
  area?: number
): Promise<any[]> {
  const db = getDb();
  const resolvedName = resolveComplexName(db, complexName, lawdCode);

  // 1. 해당 단지의 전체 월별 실거래 가격 및 평형 목록 가져오기
  let sql = `
    SELECT substr(t.deal_date, 1, 7) AS month,
           t.price_eok               AS priceEok,
           CAST(ROUND(t.area_m2) AS TEXT) || '㎡' AS area
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ?
  `;
  const params: any[] = [resolvedName];
  if (lawdCode) {
    sql += " AND c.lawd_code = ?";
    params.push(lawdCode);
  }
  if (area !== undefined && area !== null) {
    sql += " AND CAST(ROUND(t.area_m2) AS INTEGER) = ?";
    params.push(area);
  }
  sql += " ORDER BY month ASC";

  const rows = db.prepare(sql).all(...params) as { month: string; priceEok: number; area: string }[];

  // 월별 가격 그룹화
  const monthlyGroups = new Map<string, { prices: number[]; sizePrices: Map<string, number[]> }>();
  for (const row of rows) {
    let group = monthlyGroups.get(row.month);
    if (!group) {
      group = { prices: [], sizePrices: new Map() };
      monthlyGroups.set(row.month, group);
    }
    group.prices.push(row.priceEok);

    let sPrices = group.sizePrices.get(row.area);
    if (!sPrices) {
      sPrices = [];
      group.sizePrices.set(row.area, sPrices);
    }
    sPrices.push(row.priceEok);
  }

  // 중위값 계산 헬퍼 함수
  function getMedian(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  // 데이터 생성
  const trend: any[] = [];
  for (const [month, data] of monthlyGroups.entries()) {
    const prices = data.prices;
    const count = prices.length;
    const maxVal = Math.max(...prices);
    const minVal = Math.min(...prices);
    const sumVal = prices.reduce((sum, p) => sum + p, 0);
    const avgVal = sumVal / count;
    const medVal = getMedian(prices);

    const point: Record<string, any> = {
      month,
      거래량: count,
      최대가: Number(maxVal.toFixed(2)),
      최소가: Number(minVal.toFixed(2)),
      평균가: Number(avgVal.toFixed(2)),
      중위값: Number(medVal.toFixed(2)),
      overall: Number(avgVal.toFixed(2)) // 하위 호환용 전체 평균
    };

    // 평수별 평균가 (하위 호환용)
    for (const [areaName, aPrices] of data.sizePrices.entries()) {
      const aSum = aPrices.reduce((sum, p) => sum + p, 0);
      point[areaName] = Number((aSum / aPrices.length).toFixed(2));
    }

    trend.push(point);
  }

  return trend.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * 특정 지역의 월별 평균 실거래가 추이
 */
export async function getRegionTrend(
  lawdCode: string
): Promise<TrendPoint[]> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT substr(t.deal_date, 1, 7) AS month,
           AVG(t.price_eok)          AS avgPriceEok,
           COUNT(*)                  AS cnt
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.lawd_code = ?
    GROUP BY month
    ORDER BY month
  `).all(lawdCode);

  return rows.map((r: any) => ({
    month: r.month,
    avgPriceEok: r.avgPriceEok,
    count: r.cnt,
  }));
}

/**
 * 전체 데이터베이스 통계
 */
export async function getGraphStats(): Promise<GraphStats> {
  const db = getDb();
  const regions = (db.prepare("SELECT COUNT(*) AS count FROM regions").get() as any).count;
  const complexes = (db.prepare("SELECT COUNT(*) AS count FROM complexes").get() as any).count;
  const transactions = (db.prepare("SELECT COUNT(*) AS count FROM transactions").get() as any).count;

  return { regions, complexes, transactions };
}

/**
 * 다중 필터 조합 검색
 */
export async function searchTransactions(filter: GraphFilter): Promise<any[]> {
  const db = getDb();
  
  let queryStr = `
    SELECT r.display_name AS regionName, r.lawd_code AS lawdCode, c.name AS apartmentName,
           t.deal_date AS dealDate, t.price_eok AS priceEok, t.area_m2 AS areaM2, t.floor AS floor, t.dedupe_key AS dedupeKey
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter.lawdCode) {
    queryStr += " AND r.lawd_code LIKE ? || '%'";
    params.push(filter.lawdCode);
  }
  if (filter.complexName) {
    queryStr += " AND c.name LIKE '%' || ? || '%'";
    params.push(filter.complexName);
  }
  if (filter.startDate) {
    queryStr += " AND t.deal_date >= ?";
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    queryStr += " AND t.deal_date <= ?";
    params.push(filter.endDate);
  }
  if (filter.minArea !== undefined && filter.minArea !== null) {
    queryStr += " AND t.area_m2 >= ?";
    params.push(filter.minArea);
  }
  if (filter.maxArea !== undefined && filter.maxArea !== null) {
    queryStr += " AND t.area_m2 <= ?";
    params.push(filter.maxArea);
  }

  queryStr += " ORDER BY t.deal_date DESC";

  const rows = db.prepare(queryStr).all(...params);
  return rows.map((r: any) => ({
    regionName: r.regionName,
    lawdCode: r.lawdCode,
    apartmentName: r.apartmentName,
    dealDate: r.dealDate,
    priceEok: r.priceEok,
    areaM2: r.areaM2,
    floor: r.floor,
    dedupeKey: r.dedupeKey,
  }));
}

/**
 * 드릴다운: 시/도 레벨 집계
 */
export async function getDrilldownRegions(complexName?: string): Promise<any[]> {
  const db = getDb();
  let query = `
    SELECT r.lawd_code AS code, r.display_name AS name,
           COUNT(t.dedupe_key) AS count, AVG(t.price_eok) AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
  `;
  const params: any[] = [];
  if (complexName) {
    query += ` WHERE c.name LIKE ?`;
    params.push(`%${complexName}%`);
  }
  query += `
    GROUP BY r.lawd_code, r.display_name
    ORDER BY r.display_name
  `;

  const rows = db.prepare(query).all(...params);

  return rows.map((r: any) => ({
    code: r.code,
    name: r.name,
    count: r.count,
    avgPriceEok: Number(r.avgPriceEok.toFixed(2)),
  }));
}

/**
 * 드릴다운: 특정 지역의 아파트 단지별 집계
 */
export async function getDrilldownComplexes(lawdCode: string, complexName?: string): Promise<any[]> {
  const db = getDb();
  let query = `
    SELECT c.name AS name, COUNT(t.dedupe_key) AS count, AVG(t.price_eok) AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.lawd_code = ?
  `;
  const params: any[] = [lawdCode];
  if (complexName) {
    query += ` AND c.name LIKE ?`;
    params.push(`%${complexName}%`);
  }
  query += `
    GROUP BY c.name
    ORDER BY count DESC
  `;

  const rows = db.prepare(query).all(...params);

  return rows.map((r: any) => ({
    name: r.name,
    count: r.count,
    avgPriceEok: Number(r.avgPriceEok.toFixed(2)),
  }));
}

/**
 * 드릴다운: 특정 단지의 평수별 집계
 */
export async function getDrilldownAreas(complexName: string, lawdCode?: string): Promise<any[]> {
  const db = getDb();
  const resolvedName = resolveComplexName(db, complexName, lawdCode);

  const query = db.prepare(`
    SELECT CAST(ROUND(t.area_m2) AS TEXT) || '㎡' AS name,
           COUNT(*) AS count,
           AVG(t.price_eok) AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ? ${lawdCode ? "AND c.lawd_code = ?" : ""}
    GROUP BY name
    ORDER BY avgPriceEok DESC
  `);

  const rows = lawdCode ? query.all(resolvedName, lawdCode) : query.all(resolvedName);
  return rows.map((r: any) => ({
    name: r.name,
    count: r.count,
    avgPriceEok: Number(r.avgPriceEok.toFixed(2)),
  }));
}

/**
 * 노드-링크 시각화 데이터 (네트워크 뷰 폐기로 더미 데이터 리턴)
 */
export async function getGraphTopology(filter: GraphFilter): Promise<GraphTopologyData> {
  return {
    nodes: [],
    links: [],
  };
}

/**
 * 단지 상세 분석: 평수/층/최근 거래 종합
 */
export async function getComplexDetail(
  complexName: string,
  lawdCode?: string,
  area?: number
): Promise<any> {
  const db = getDb();
  const resolvedName = resolveComplexName(db, complexName, lawdCode);
  const trend = await getComplexTrend(resolvedName, lawdCode, area);

  // 1. 평수별 통계
  let areaSql = `
    SELECT CAST(ROUND(t.area_m2) AS TEXT) || '㎡' AS area,
           AVG(t.price_eok) AS avgPrice,
           COUNT(*) AS cnt
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ?
  `;
  const areaParams: any[] = [resolvedName];
  if (lawdCode) {
    areaSql += " AND c.lawd_code = ?";
    areaParams.push(lawdCode);
  }
  if (area !== undefined && area !== null) {
    areaSql += " AND CAST(ROUND(t.area_m2) AS INTEGER) = ?";
    areaParams.push(area);
  }
  areaSql += " GROUP BY area ORDER BY area";

  const areaRows = db.prepare(areaSql).all(...areaParams);
  const areaBreakdown = areaRows.map((r: any) => ({
    area: r.area,
    avgPriceEok: Number(r.avgPrice.toFixed(2)),
    count: r.cnt,
  }));
  // 숫자 기준 오름차순 정렬 (좌측 소형 -> 우측 대형)
  areaBreakdown.sort((a: any, b: any) => {
    const numA = parseInt(a.area) || 0;
    const numB = parseInt(b.area) || 0;
    return numA - numB;
  });

  // 2. 층별 분포
  let floorSql = `
    SELECT t.floor AS floor, COUNT(*) AS cnt, AVG(t.price_eok) AS avgPrice
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ? AND t.floor IS NOT NULL
  `;
  const floorParams: any[] = [resolvedName];
  if (lawdCode) {
    floorSql += " AND c.lawd_code = ?";
    floorParams.push(lawdCode);
  }
  if (area !== undefined && area !== null) {
    floorSql += " AND CAST(ROUND(t.area_m2) AS INTEGER) = ?";
    floorParams.push(area);
  }
  floorSql += " GROUP BY floor ORDER BY floor";

  const floorRows = db.prepare(floorSql).all(...floorParams);
  const floorDist = floorRows.map((r: any) => ({
    floor: r.floor,
    count: r.cnt,
    avgPriceEok: Number(r.avgPrice.toFixed(2)),
  }));

  // 3. 최근 거래 (최대 10건)
  let recentSql = `
    SELECT t.deal_date AS dealDate, t.price_eok AS priceEok, t.area_m2 AS areaM2, t.floor AS floor, t.dedupe_key AS dedupeKey
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ?
  `;
  const recentParams: any[] = [resolvedName];
  if (lawdCode) {
    recentSql += " AND c.lawd_code = ?";
    recentParams.push(lawdCode);
  }
  if (area !== undefined && area !== null) {
    recentSql += " AND CAST(ROUND(t.area_m2) AS INTEGER) = ?";
    recentParams.push(area);
  }
  recentSql += " ORDER BY t.deal_date DESC LIMIT 10";

  const recentRows = db.prepare(recentSql).all(...recentParams);
  const recentTx = recentRows.map((r: any) => ({
    apartmentName: resolvedName,
    dealDate: r.dealDate,
    priceEok: r.priceEok,
    areaM2: r.areaM2,
    floor: r.floor,
    dedupeKey: r.dedupeKey,
  }));

  return {
    trend,
    areaBreakdown,
    floorDist,
    recentTx,
  };
}

/**
 * 단지명 글로벌 검색 (지역 무관 또는 특정 지역 필터)
 */
export async function searchComplexNames(
  query: string,
  lawdCode?: string
): Promise<ComplexSearchResult[]> {
  const db = getDb();
  let queryStr = `
    SELECT DISTINCT c.name, c.lawd_code AS lawdCode, r.display_name AS regionName
    FROM complexes c
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE c.name LIKE '%' || ? || '%'
  `;
  const params: any[] = [query];
  if (lawdCode) {
    queryStr += ` AND c.lawd_code LIKE ? || '%'`;
    params.push(lawdCode);
  }
  queryStr += ` ORDER BY c.name LIMIT 30`;

  const rows = db.prepare(queryStr).all(...params);
  return rows.map((r: any) => ({
    name: r.name,
    lawdCode: r.lawdCode,
    regionName: r.regionName,
  }));
}

/**
 * LLM 프롬프트 생성을 위한 데이터 요약 텍스트
 */
export async function getDataContext(filter: GraphFilter): Promise<string> {
  const txs = await searchTransactions(filter);

  if (txs.length === 0) {
    return "조건에 일치하는 실거래 데이터가 없습니다.";
  }

  const count = txs.length;
  const prices = txs.map((t) => t.priceEok);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / count;
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);

  // 월별 추이 집계
  const monthlyMap = new Map<string, { count: number; sum: number }>();
  txs.forEach((t) => {
    const month = t.dealDate.substring(0, 7);
    const curr = monthlyMap.get(month) || { count: 0, sum: 0 };
    curr.count += 1;
    curr.sum += t.priceEok;
    monthlyMap.set(month, curr);
  });

  const monthlySummary = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => `- ${month}: 거래량 ${data.count}건, 평균가 ${(data.sum / data.count).toFixed(2)}억`)
    .join("\n");

  // 상위 거래 5건
  const topRecent = txs
    .slice(0, 5)
    .map((t) => `- [${t.dealDate}] ${t.apartmentName} (${t.floor}층, ${t.areaM2 ? Math.round(t.areaM2) : "-"}㎡) : ${t.priceEok}억`)
    .join("\n");

  return `[조회 필터 조건]
- 지역 코드: ${filter.lawdCode || "전체"}
- 아파트명 키워드: ${filter.complexName || "전체"}
- 기간: ${filter.startDate || "시작일 없음"} ~ ${filter.endDate || "종료일 없음"}
- 평형대(㎡): ${filter.minArea || 0}㎡ ~ ${filter.maxArea || "제한 없음"}㎡

[실거래 요약 통계]
- 총 거래 건수: ${count}건
- 평균 거래 금액: ${avgPrice.toFixed(2)}억 원
- 최고 거래 금액: ${maxPrice}억 원
- 최저 거래 금액: ${minPrice}억 원

[월별 거래 추이]
${monthlySummary}

[최근 실거래 내역 (상위 5건)]
${topRecent}
`;
}

/**
 * 캐시된 법정동 아파트 목록 조회
 */
export function getCachedApartments(lawdCode: string): { apartments: string[]; cachedAt: string | null } {
  const db = getDb();
  
  const meta = db.prepare(`
    SELECT cached_at FROM region_apartment_cache_meta WHERE lawd_code = ?
  `).get(lawdCode) as { cached_at: string } | undefined;

  if (!meta) {
    return { apartments: [], cachedAt: null };
  }

  const rows = db.prepare(`
    SELECT apartment_name FROM region_apartment_cache WHERE lawd_code = ? ORDER BY apartment_name ASC
  `).all(lawdCode) as { apartment_name: string }[];

  return {
    apartments: rows.map(r => r.apartment_name),
    cachedAt: meta.cached_at
  };
}

/**
 * 법정동 아파트 목록 캐시 갱신
 */
export function saveCachedApartments(lawdCode: string, apartments: string[]): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.exec("BEGIN TRANSACTION");
  try {
    // 1. 기존 캐시 삭제
    db.prepare("DELETE FROM region_apartment_cache WHERE lawd_code = ?").run(lawdCode);
    
    // 2. 신규 캐시 삽입
    const insertStmt = db.prepare("INSERT INTO region_apartment_cache (lawd_code, apartment_name) VALUES (?, ?)");
    for (const name of apartments) {
      insertStmt.run(lawdCode, name);
    }

    // 3. 메타 정보 갱신
    db.prepare(`
      INSERT INTO region_apartment_cache_meta (lawd_code, cached_at)
      VALUES (?, ?)
      ON CONFLICT(lawd_code) DO UPDATE SET cached_at = excluded.cached_at
    `).run(lawdCode, now);

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/**
 * DB regions 테이블에서 지역명 검색 (외부 주소 API 미설정 시 폴백)
 */
export function searchDbRegions(query: string): { lawdCode: string; displayName: string }[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT lawd_code AS lawdCode, display_name AS displayName
    FROM regions
    WHERE display_name LIKE '%' || ? || '%'
    ORDER BY display_name
    LIMIT 15
  `).all(query) as { lawdCode: string; displayName: string }[];
  return rows;
}

/**
 * DB regions 테이블에 있는 모든 지역 목록 조회
 */
export function getAllDbRegions(): { lawdCode: string; displayName: string }[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT lawd_code AS lawdCode, display_name AS displayName
    FROM regions
    ORDER BY display_name ASC
  `).all() as { lawdCode: string; displayName: string }[];
  return rows;
}

/**
 * 특정 지역 코드(lawdCode)에 속한 아파트 단지 목록 조회
 */
export function getComplexesByRegion(lawdCode?: string): string[] {
  const db = getDb();
  let query = `
    SELECT DISTINCT name
    FROM complexes
  `;
  const params: any[] = [];
  if (lawdCode && lawdCode.trim() !== "") {
    query += ` WHERE lawd_code = ?`;
    params.push(lawdCode);
  }
  query += ` ORDER BY name ASC`;
  const rows = db.prepare(query).all(...params) as { name: string }[];
  return rows.map(r => r.name);
}

/**
 * 일단위 수집 건수 통계 조회
 */
export function getDailyCollectionStats(): DailyCollectStat[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT substr(collected_at, 1, 10) AS collectDate,
           COUNT(*) AS count,
           ROUND(AVG(price_eok), 2) AS avgPriceEok,
           COUNT(DISTINCT complex_id) AS complexCount
    FROM transactions
    GROUP BY collectDate
    ORDER BY collectDate ASC
  `).all() as { collectDate: string; count: number; avgPriceEok: number; complexCount: number }[];
  return rows;
}

/**
 * 특정 수집일의 지역별 수집 건수 통계 조회
 */
export function getRegionCollectionStatsByDate(date: string): RegionCollectStat[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.lawd_code AS lawdCode,
           r.display_name AS regionName,
           COUNT(*) AS count
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE substr(t.collected_at, 1, 10) = ?
    GROUP BY r.lawd_code, r.display_name
    ORDER BY count DESC
  `).all(date) as { lawdCode: string; regionName: string; count: number }[];
  return rows;
}

/**
 * 등록월별(계약월별) 수집 건수 통계 조회
 */
export function getMonthlyCollectionStats(): DailyCollectStat[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT substr(deal_date, 1, 7) AS collectDate,
           COUNT(*) AS count,
           ROUND(AVG(price_eok), 2) AS avgPriceEok,
           COUNT(DISTINCT complex_id) AS complexCount
    FROM transactions
    GROUP BY collectDate
    ORDER BY collectDate ASC
  `).all() as { collectDate: string; count: number; avgPriceEok: number; complexCount: number }[];
  return rows;
}

/**
 * 특정 등록월(계약월, YYYY-MM)의 지역별 수집 건수 통계 조회
 */
export function getRegionCollectionStatsByMonth(month: string): RegionCollectStat[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT r.lawd_code AS lawdCode,
           r.display_name AS regionName,
           COUNT(*) AS count
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE substr(t.deal_date, 1, 7) = ?
    GROUP BY r.lawd_code, r.display_name
    ORDER BY count DESC
  `).all(month) as { lawdCode: string; regionName: string; count: number }[];
  return rows;
}

/**
 * 특정 지역코드(lawdCode) 및 거래월(dealMonth: YYYYMM)에 적재된 로컬 실거래 건수 조회
 */
export function getLocalTransactionsCount(lawdCode: string, dealMonth: string): number {
  const db = getDb();
  const dealMonthHyphen = `${dealMonth.slice(0, 4)}-${dealMonth.slice(4, 6)}`;
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.lawd_code = ? AND t.deal_date LIKE ?
  `).get(lawdCode, `${dealMonthHyphen}%`) as { count: number } | undefined;
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
  const db = getDb();
  const dealMonthHyphen = `${dealMonth.slice(0, 4)}-${dealMonth.slice(4, 6)}`;
  const rows = db.prepare(`
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
    WHERE c.lawd_code = ? AND t.deal_date LIKE ?
    ORDER BY t.deal_date ASC
  `).all(lawdCode, `${dealMonthHyphen}%`) as any[];
  return rows;
}

/**
 * 좌표 미확보 단지 목록 조회 (Geocoding 대상)
 */
export function getComplexesWithoutCoords(lawdCode?: string): { id: string; name: string; lawdCode: string; regionName: string; dongName: string | null; jibun: string | null; roadName: string | null }[] {
  const db = getDb();
  let query = `
    SELECT c.id, c.name, c.lawd_code AS lawdCode, r.display_name AS regionName,
           c.dong_name AS dongName, c.jibun, c.road_name AS roadName
    FROM complexes c
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE c.lat IS NULL
  `;
  const params: any[] = [];
  if (lawdCode) {
    query += ' AND c.lawd_code = ?';
    params.push(lawdCode);
  }
  query += ' ORDER BY c.name ASC';
  return db.prepare(query).all(...params) as any[];
}

/**
 * 좌표 확보 단지 목록 조회 (반경 검색 대상)
 */
export function getComplexesWithCoords(lawdCode?: string): { id: string; name: string; lawdCode: string; regionName: string; lat: number; lng: number; dongName: string | null; jibun: string | null }[] {
  const db = getDb();
  let query = `
    SELECT c.id, c.name, c.lawd_code AS lawdCode, r.display_name AS regionName,
           c.lat, c.lng, c.dong_name AS dongName, c.jibun
    FROM complexes c
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
  `;
  const params: any[] = [];
  if (lawdCode) {
    query += ' AND c.lawd_code = ?';
    params.push(lawdCode);
  }
  query += ' ORDER BY c.name ASC';
  return db.prepare(query).all(...params) as any[];
}

/**
 * 단지 좌표 업데이트 (Geocoding 결과 저장)
 */
export function updateComplexCoords(complexId: string, lat: number, lng: number): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE complexes SET lat = ?, lng = ?, geocoded_at = ? WHERE id = ?
  `).run(lat, lng, now, complexId);
}

/**
 * Geocoding 현황 통계 조회
 */
export function getGeocodeStats(): { total: number; geocoded: number; pending: number } {
  const db = getDb();
  const total = (db.prepare('SELECT COUNT(*) AS c FROM complexes').get() as any).c;
  const geocoded = (db.prepare('SELECT COUNT(*) AS c FROM complexes WHERE lat IS NOT NULL').get() as any).c;
  return { total, geocoded, pending: total - geocoded };
}
