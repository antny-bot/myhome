import { getDb, getPreparedStatement } from "./connection.js";
import { TrendPoint, GraphStats, GraphFilter, GraphTopologyData, DailyCollectStat, RegionCollectStat } from "../types.js";
import { calculateBoxPlot } from "../stats.js";
import { resolveComplexName } from "./regions.js";
import { searchTransactions } from "./transactions.js";

/**
 * 전용면적 대비 분양면적 매핑 정보 Upsert
 */
export function upsertAreaMapping(
  complexId: string,
  areaM2: number,
  supplyAreaM2: number,
  source: string = "api"
): void {
  const now = new Date().toISOString();
  getPreparedStatement(`
    INSERT INTO complex_area_mappings (complex_id, area_m2, supply_area_m2, source, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(complex_id, area_m2) DO UPDATE SET
      supply_area_m2 = excluded.supply_area_m2,
      source = excluded.source
  `).run(complexId, areaM2, supplyAreaM2, source, now);
}

/**
 * 전용면적 대비 분양면적 매핑 정보 조회
 */
export function getAreaMapping(
  complexId: string,
  areaM2: number
): { supplyAreaM2: number; source: string } | null {
  const row = getPreparedStatement(`
    SELECT supply_area_m2 AS supplyAreaM2, source
    FROM complex_area_mappings
    WHERE complex_id = ? AND ROUND(area_m2, 2) = ROUND(?, 2)
    LIMIT 1
  `).get(complexId, areaM2) as { supplyAreaM2: number; source: string } | undefined;
  return row ?? null;
}

/**
 * 특정 단지의 월별 평균 실거래가 추이
 * - SARGable 날짜 비교 적용 (인덱스 레인지 스캔 활성화)
 */
export async function getComplexTrend(
  complexName: string,
  lawdCode?: string,
  area?: number,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  const db = getDb();
  const resolvedName = resolveComplexName(db, complexName, lawdCode);

  let sql = `
    SELECT substr(t.deal_date, 1, 7) AS month,
           t.price_eok               AS priceEok,
           t.area_m2                 AS areaM2,
           m.supply_area_m2          AS supplyAreaM2
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    LEFT JOIN complex_area_mappings m ON t.complex_id = m.complex_id AND ROUND(t.area_m2, 2) = ROUND(m.area_m2, 2)
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
  if (startDate) {
    const startVal = startDate.length === 7 ? `${startDate}-01` : startDate;
    sql += " AND t.deal_date >= ?";
    params.push(startVal);
  }
  if (endDate) {
    const endVal = endDate.length === 7 ? `${endDate}-31` : endDate;
    sql += " AND t.deal_date <= ?";
    params.push(endVal);
  }
  sql += " ORDER BY month ASC";

  const rows = db.prepare(sql).all(...params) as { month: string; priceEok: number; areaM2: number; supplyAreaM2: number | null }[];

  const monthlyGroups = new Map<string, { prices: number[]; sizePrices: Map<string, number[]> }>();
  for (const row of rows) {
    let group = monthlyGroups.get(row.month);
    if (!group) {
      group = { prices: [], sizePrices: new Map() };
      monthlyGroups.set(row.month, group);
    }
    group.prices.push(row.priceEok);

    const dedicatedLabel = `${Math.round(row.areaM2)}㎡`;
    const supplyM2 = row.supplyAreaM2 || (row.areaM2 / 0.78);
    const supplyLabel = `${Math.round(supplyM2)}㎡(공급)`;

    let dedPrices = group.sizePrices.get(dedicatedLabel);
    if (!dedPrices) {
      dedPrices = [];
      group.sizePrices.set(dedicatedLabel, dedPrices);
    }
    dedPrices.push(row.priceEok);

    let supPrices = group.sizePrices.get(supplyLabel);
    if (!supPrices) {
      supPrices = [];
      group.sizePrices.set(supplyLabel, supPrices);
    }
    supPrices.push(row.priceEok);
  }

  function getMedian(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

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
      overall: Number(avgVal.toFixed(2))
    };

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
 * - transactions.lawd_code 직접 조회로 불필요한 complexes 조인 제거
 * - idx_transactions_lawd_code_deal_date 인덱스 활용
 */
export async function getRegionTrend(
  lawdCode: string
): Promise<TrendPoint[]> {
  const rows = getPreparedStatement(`
    SELECT substr(t.deal_date, 1, 7) AS month,
           AVG(t.price_eok)          AS avgPriceEok,
           COUNT(*)                  AS cnt
    FROM transactions t
    WHERE t.lawd_code = ?
    GROUP BY month
    ORDER BY month
  `).all(lawdCode) as any[];

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
  const regions = (getPreparedStatement("SELECT COUNT(*) AS count FROM regions").get() as any).count;
  const complexes = (getPreparedStatement("SELECT COUNT(*) AS count FROM complexes").get() as any).count;
  const transactions = (getPreparedStatement("SELECT COUNT(*) AS count FROM transactions").get() as any).count;

  return {
    regions,
    complexes,
    transactions,
  };
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
export async function getGraphTopology(_filter: GraphFilter): Promise<GraphTopologyData> {
  return {
    nodes: [],
    links: [],
  };
}

export async function getComplexDetail(
  complexName: string,
  lawdCode?: string,
  area?: number,
  startDate?: string,
  endDate?: string
): Promise<any> {
  const db = getDb();
  const resolvedName = resolveComplexName(db, complexName, lawdCode);

  let sql = `
    SELECT t.deal_date AS dealDate,
           t.price_eok AS priceEok,
           t.area_m2 AS areaM2,
           t.floor AS floor,
           t.dedupe_key AS dedupeKey
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
  if (startDate) {
    const startVal = startDate.length === 7 ? `${startDate}-01` : startDate;
    sql += " AND t.deal_date >= ?";
    params.push(startVal);
  }
  if (endDate) {
    const endVal = endDate.length === 7 ? `${endDate}-31` : endDate;
    sql += " AND t.deal_date <= ?";
    params.push(endVal);
  }
  sql += " ORDER BY t.deal_date DESC";

  const allRows = db.prepare(sql).all(...params) as { dealDate: string; priceEok: number; areaM2: number; floor: number | null; dedupeKey: string }[];

  const recentTx = allRows.slice(0, 10).map((r) => ({
    apartmentName: resolvedName,
    dealDate: r.dealDate,
    priceEok: r.priceEok,
    areaM2: r.areaM2,
    floor: r.floor,
    dedupeKey: r.dedupeKey
  }));

  const areaGroups = new Map<string, number[]>();
  const floorGroups = new Map<number, number[]>();
  const monthlyMap = new Map<string, number[]>();

  for (const row of allRows) {
    const areaKey = `${Math.round(row.areaM2)}㎡`;
    let aList = areaGroups.get(areaKey);
    if (!aList) {
      aList = [];
      areaGroups.set(areaKey, aList);
    }
    aList.push(row.priceEok);

    if (row.floor !== null && row.floor !== undefined) {
      let fList = floorGroups.get(row.floor);
      if (!fList) {
        fList = [];
        floorGroups.set(row.floor, fList);
      }
      fList.push(row.priceEok);
    }

    const monthKey = row.dealDate.slice(0, 7);
    let mList = monthlyMap.get(monthKey);
    if (!mList) {
      mList = [];
      monthlyMap.set(monthKey, mList);
    }
    mList.push(row.priceEok);
  }

  const areaBreakdown = Array.from(areaGroups.entries()).map(([areaName, prices]) => {
    const stats = calculateBoxPlot(prices);
    return {
      area: areaName,
      count: prices.length,
      ...stats
    };
  }).sort((a, b) => b.count - a.count);

  const floorDist = Array.from(floorGroups.entries()).map(([fl, prices]) => {
    const stats = calculateBoxPlot(prices);
    return {
      floor: fl,
      count: prices.length,
      ...stats
    };
  }).sort((a, b) => a.floor - b.floor);

  const trend = Array.from(monthlyMap.entries()).map(([month, prices]) => {
    const stats = calculateBoxPlot(prices);
    return {
      month,
      거래량: prices.length,
      최대가: Number(stats.max.toFixed(2)),
      최소가: Number(stats.min.toFixed(2)),
      평균가: Number(stats.mean.toFixed(2)),
      중위값: Number(stats.median.toFixed(2)),
      overall: Number(stats.mean.toFixed(2))
    };
  }).sort((a, b) => a.month.localeCompare(b.month));

  return {
    trend,
    areaBreakdown,
    floorDist,
    recentTx
  };
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

  const monthlyMap = new Map<string, number[]>();
  for (const t of txs) {
    const month = t.dealDate.slice(0, 7);
    if (!monthlyMap.has(month)) monthlyMap.set(month, []);
    monthlyMap.get(month)!.push(t.priceEok);
  }

  const monthlySummary = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, p]) => `${m}: ${p.length}건 (평균 ${(p.reduce((s, v) => s + v, 0) / p.length).toFixed(1)}억)`)
    .join(", ");

  const complexMap = new Map<string, number>();
  for (const t of txs) {
    complexMap.set(t.apartmentName, (complexMap.get(t.apartmentName) || 0) + 1);
  }
  const topComplexes = Array.from(complexMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, c]) => `${name}(${c}건)`)
    .join(", ");

  return [
    `총 거래 건수: ${count}건`,
    `평균 가격: ${avgPrice.toFixed(2)}억원`,
    `가격 범위: ${minPrice.toFixed(2)}억 ~ ${maxPrice.toFixed(2)}억원`,
    `주요 단지 거래량: ${topComplexes}`,
    `월별 추이: ${monthlySummary}`,
  ].join("\n");
}

export function getDailyCollectionStats(days?: number): DailyCollectStat[] {
  const db = getDb();
  if (days && days > 0) {
    const rows = db.prepare(`
      SELECT substr(collected_at, 1, 10) AS collectDate,
             COUNT(*) AS count,
             ROUND(AVG(price_eok), 2) AS avgPriceEok,
             COUNT(DISTINCT complex_id) AS complexCount
      FROM transactions
      WHERE collected_at >= date('now', '-' || ? || ' days', 'localtime')
      GROUP BY collectDate
      ORDER BY collectDate ASC
    `).all(days) as { collectDate: string; count: number; avgPriceEok: number; complexCount: number }[];
    return rows;
  }
  const rows = getPreparedStatement(`
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

export function getRegionCollectionStatsByDate(date: string): RegionCollectStat[] {
  const rows = getPreparedStatement(`
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

export function getMonthlyCollectionStats(days?: number): DailyCollectStat[] {
  const db = getDb();
  if (days && days > 0) {
    const rows = db.prepare(`
      SELECT substr(deal_date, 1, 7) AS collectDate,
             COUNT(*) AS count,
             ROUND(AVG(price_eok), 2) AS avgPriceEok,
             COUNT(DISTINCT complex_id) AS complexCount
      FROM transactions
      WHERE collected_at >= date('now', '-' || ? || ' days', 'localtime')
      GROUP BY collectDate
      ORDER BY collectDate ASC
    `).all(days) as { collectDate: string; count: number; avgPriceEok: number; complexCount: number }[];
    return rows;
  }
  const rows = getPreparedStatement(`
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

export function getRegionCollectionStatsByMonth(month: string): RegionCollectStat[] {
  const rows = getPreparedStatement(`
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
