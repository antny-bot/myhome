import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import { TransactionNode, RegionInfo, TrendPoint, GraphStats, GraphFilter, GraphTopologyData, ComplexSearchResult } from "./types.js";

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

    CREATE INDEX IF NOT EXISTS idx_transactions_deal_date ON transactions(deal_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_complex_id ON transactions(complex_id);
    CREATE INDEX IF NOT EXISTS idx_complexes_lawd_code ON complexes(lawd_code);
  `);
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
  tx: TransactionNode
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

    // 2. complex upsert
    const complexId = `${region.lawdCode}|${complexName}`;
    db.prepare(`
      INSERT OR IGNORE INTO complexes (id, lawd_code, name, created_at)
      VALUES (?, ?, ?, ?)
    `).run(complexId, region.lawdCode, complexName, now);

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

  // 1. 전체 평균 트렌드 (선택된 평형 필터에 무관하게 단지 전체의 배경 ghost area에 노출할 용도)
  let overallSql = `
    SELECT substr(t.deal_date, 1, 7) AS month,
           AVG(t.price_eok)          AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ?
  `;
  const overallParams: any[] = [resolvedName];
  if (lawdCode) {
    overallSql += " AND c.lawd_code = ?";
    overallParams.push(lawdCode);
  }
  overallSql += " GROUP BY month ORDER BY month";
  const overallRows = db.prepare(overallSql).all(...overallParams);

  // 2. 평형별 트렌드 라인 데이터
  let sizeSql = `
    SELECT substr(t.deal_date, 1, 7) AS month,
           CAST(ROUND(t.area_m2) AS TEXT) || '㎡' AS area,
           AVG(t.price_eok)          AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ?
  `;
  const sizeParams: any[] = [resolvedName];
  if (lawdCode) {
    sizeSql += " AND c.lawd_code = ?";
    sizeParams.push(lawdCode);
  }
  if (area !== undefined && area !== null) {
    sizeSql += " AND CAST(ROUND(t.area_m2) AS INTEGER) = ?";
    sizeParams.push(area);
  }
  sizeSql += " GROUP BY month, area ORDER BY month, area";
  const sizeRows = db.prepare(sizeSql).all(...sizeParams);

  // 3. 월별 병합
  const trendMap: Record<string, any> = {};
  for (const r of overallRows as any[]) {
    const m = String(r.month);
    const avg = Number(r.avgPriceEok ?? 0);
    trendMap[m] = {
      month: m,
      overall: Number(avg.toFixed(2))
    };
  }
  for (const r of sizeRows as any[]) {
    const m = String(r.month);
    const a = String(r.area);
    const avg = Number(r.avgPriceEok ?? 0);
    if (!trendMap[m]) {
      trendMap[m] = { month: m };
    }
    trendMap[m][a] = Number(avg.toFixed(2));
  }

  return Object.values(trendMap).sort((a: any, b: any) => a.month.localeCompare(b.month));
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

  queryStr += " ORDER BY t.deal_date DESC LIMIT 10000";

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
