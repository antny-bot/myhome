import { getDb, getPreparedStatement } from "./connection.js";
import type { TrendPoint, GraphStats, GraphFilter, GraphTopologyData, DailyCollectStat, RegionCollectStat, DrilldownRegionItem, DrilldownComplexItem, DrilldownAreaItem, OverviewMonthlyItem, OverviewMonthlyFilter, OverviewTopComplexItem, OverviewTopComplexesFilter, OverviewPivotResult, OverviewPivotFilter, OverviewPivotCell } from "../types.js";
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
  const areaKey = Math.round(areaM2 * 100);
  getPreparedStatement(`
    INSERT INTO complex_area_mappings (complex_id, area_m2, area_key, supply_area_m2, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(complex_id, area_m2) DO UPDATE SET
      area_key = excluded.area_key,
      supply_area_m2 = excluded.supply_area_m2,
      source = excluded.source
  `).run(complexId, areaM2, areaKey, supplyAreaM2, source, now);
}

/**
 * 전용면적 대비 분양면적 매핑 정보 조회
 */
export function getAreaMapping(
  complexId: string,
  areaM2: number
): { supplyAreaM2: number; source: string } | null {
  const areaKey = Math.round(areaM2 * 100);
  const row = getPreparedStatement(`
    SELECT supply_area_m2 AS supplyAreaM2, source
    FROM complex_area_mappings
    WHERE complex_id = ? AND area_key = ?
    LIMIT 1
  `).get(complexId, areaKey) as { supplyAreaM2: number; source: string } | undefined;
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
    LEFT JOIN complex_area_mappings m ON t.complex_id = m.complex_id AND t.area_key = m.area_key
    WHERE c.name = ? AND t.cancel_date IS NULL
  `;
  const params: (string | number)[] = [resolvedName];
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

  const trend: Record<string, any>[] = [];
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
    WHERE t.lawd_code = ? AND t.cancel_date IS NULL
    GROUP BY month
    ORDER BY month
  `).all(lawdCode) as { month: string; avgPriceEok: number; cnt: number }[];

  return rows.map((r) => ({
    month: r.month,
    avgPriceEok: r.avgPriceEok,
    count: r.cnt,
  }));
}

/**
 * 전체 데이터베이스 통계
 */
export function getGraphStats(): GraphStats {
  const regions = (getPreparedStatement("SELECT COUNT(*) AS count FROM regions").get() as { count: number }).count;
  const complexes = (getPreparedStatement("SELECT COUNT(*) AS count FROM complexes").get() as { count: number }).count;
  const transactions = (getPreparedStatement("SELECT COUNT(*) AS count FROM transactions WHERE cancel_date IS NULL").get() as { count: number }).count;

  return {
    regions,
    complexes,
    transactions,
  };
}

/**
 * 드릴다운: 시/도 레벨 집계
 */
export function getDrilldownRegions(complexName?: string): DrilldownRegionItem[] {
  const db = getDb();
  let query = `
    SELECT r.lawd_code AS code, r.display_name AS name,
           COUNT(t.dedupe_key) AS count, AVG(t.price_eok) AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE t.cancel_date IS NULL
  `;
  const params: (string | number)[] = [];
  if (complexName) {
    query += ` AND c.name LIKE ?`;
    params.push(`%${complexName}%`);
  }
  query += `
    GROUP BY r.lawd_code, r.display_name
    ORDER BY r.display_name
  `;

  const rows = db.prepare(query).all(...params) as { code: string; name: string; count: number; avgPriceEok: number }[];

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    count: r.count,
    avgPriceEok: Number(r.avgPriceEok.toFixed(2)),
  }));
}

/**
 * 드릴다운: 특정 지역의 아파트 단지별 집계
 */
export function getDrilldownComplexes(lawdCode: string, complexName?: string): DrilldownComplexItem[] {
  const db = getDb();
  let query = `
    SELECT c.name AS name, COUNT(t.dedupe_key) AS count, AVG(t.price_eok) AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.lawd_code = ? AND t.cancel_date IS NULL
  `;
  const params: (string | number)[] = [lawdCode];
  if (complexName) {
    query += ` AND c.name LIKE ?`;
    params.push(`%${complexName}%`);
  }
  query += `
    GROUP BY c.name
    ORDER BY count DESC
  `;

  const rows = db.prepare(query).all(...params) as { name: string; count: number; avgPriceEok: number }[];

  return rows.map((r) => ({
    name: r.name,
    count: r.count,
    avgPriceEok: Number(r.avgPriceEok.toFixed(2)),
  }));
}

/**
 * 드릴다운: 특정 단지의 평수별 집계
 */
export function getDrilldownAreas(complexName: string, lawdCode?: string): DrilldownAreaItem[] {
  const db = getDb();
  const resolvedName = resolveComplexName(db, complexName, lawdCode);

  const query = db.prepare(`
    SELECT CAST(ROUND(t.area_m2) AS TEXT) || '㎡' AS name,
           COUNT(*) AS count,
           AVG(t.price_eok) AS avgPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ? AND t.cancel_date IS NULL ${lawdCode ? "AND c.lawd_code = ?" : ""}
    GROUP BY name
    ORDER BY avgPriceEok DESC
  `);

  const rows = (lawdCode ? query.all(resolvedName, lawdCode) : query.all(resolvedName)) as { name: string; count: number; avgPriceEok: number }[];
  return rows.map((r) => ({
    name: r.name,
    count: r.count,
    avgPriceEok: Number(r.avgPriceEok.toFixed(2)),
  }));
}

/**
 * 노드-링크 시각화 데이터 (네트워크 뷰 폐기로 더미 데이터 리턴)
 */
export function getGraphTopology(_filter: GraphFilter): GraphTopologyData {
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
           m.supply_area_m2 AS supplyAreaM2,
           t.floor AS floor,
           t.apt_dong AS aptDong,
           t.dealing_type AS dealType,
           t.cancel_date AS cancelDate,
           t.dedupe_key AS dedupeKey
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    LEFT JOIN complex_area_mappings m ON t.complex_id = m.complex_id AND t.area_key = m.area_key
    WHERE c.name = ? AND t.cancel_date IS NULL
  `;
  const params: (string | number)[] = [resolvedName];
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

  const allRows = db.prepare(sql).all(...params) as {
    dealDate: string;
    priceEok: number;
    areaM2: number;
    supplyAreaM2: number | null;
    floor: number | null;
    aptDong: string | null;
    dealType: string | null;
    cancelDate: string | null;
    dedupeKey: string;
  }[];

  const recentTx = allRows.slice(0, 10).map((r) => ({
    apartmentName: resolvedName,
    dealDate: r.dealDate,
    priceEok: r.priceEok,
    areaM2: r.areaM2,
    supplyAreaM2: r.supplyAreaM2 || Number((r.areaM2 / 0.78).toFixed(2)),
    floor: r.floor,
    aptDong: r.aptDong,
    dealType: r.dealType,
    cancelDate: r.cancelDate,
    dedupeKey: r.dedupeKey
  }));

  interface AreaStatAccumulator {
    prices: number[];
    supplyM2List: number[];
  }
  const areaGroups = new Map<string, AreaStatAccumulator>();
  const floorGroups = new Map<number, number[]>();
  const monthlyMap = new Map<string, number[]>();

  for (const row of allRows) {
    const areaKey = `${Math.round(row.areaM2)}㎡`;
    let aGroup = areaGroups.get(areaKey);
    if (!aGroup) {
      aGroup = { prices: [], supplyM2List: [] };
      areaGroups.set(areaKey, aGroup);
    }
    aGroup.prices.push(row.priceEok);
    const effectiveSupplyM2 = row.supplyAreaM2 || Number((row.areaM2 / 0.78).toFixed(2));
    aGroup.supplyM2List.push(effectiveSupplyM2);

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

  const areaBreakdown = Array.from(areaGroups.entries()).map(([areaName, group]) => {
    const stats = calculateBoxPlot(group.prices);
    const avgSupplyM2 = group.supplyM2List.length > 0
      ? Number((group.supplyM2List.reduce((sum, v) => sum + v, 0) / group.supplyM2List.length).toFixed(1))
      : Number((parseFloat(areaName) / 0.78).toFixed(1));
    const supplyAreaPyeong = Math.round(avgSupplyM2 / 3.305785);
    return {
      area: areaName,
      count: group.prices.length,
      supplyAreaM2: avgSupplyM2,
      supplyAreaPyeong,
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
      최고가: Number(stats.max.toFixed(2)),
      최소가: Number(stats.min.toFixed(2)),
      평균가: Number(stats.mean.toFixed(2)),
      중위값: Number(stats.median.toFixed(2)),
      overall: Number(stats.mean.toFixed(2))
    };
  }).sort((a, b) => a.month.localeCompare(b.month));

  // --- 단지 전용 KPI 산출 (기간 필터 독립적인 역대 최고가 및 정확한 전년동월비) ---
  const latestMonthItem = trend.length > 0 ? trend[trend.length - 1] : null;
  const latestMonth = latestMonthItem ? latestMonthItem.month : "";
  const latestAvg = latestMonthItem ? latestMonthItem.평균가 : 0;

  // 1) 역대 최고가 및 발생월 (전체 기간 쿼리)
  let athSql = `
    SELECT t.price_eok AS maxPrice,
           substr(t.deal_date, 1, 7) AS maxMonth
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    WHERE c.name = ? AND t.cancel_date IS NULL
  `;
  const athParams: (string | number)[] = [resolvedName];
  if (lawdCode) {
    athSql += " AND c.lawd_code = ?";
    athParams.push(lawdCode);
  }
  if (area !== undefined && area !== null) {
    athSql += " AND CAST(ROUND(t.area_m2) AS INTEGER) = ?";
    athParams.push(area);
  }
  athSql += " ORDER BY t.price_eok DESC, t.deal_date DESC LIMIT 1";

  const athRow = db.prepare(athSql).get(...athParams) as { maxPrice: number; maxMonth: string } | undefined;
  const maxPrice = athRow ? Number(athRow.maxPrice.toFixed(2)) : (latestMonthItem?.최대가 || 0);
  const maxMonth = athRow ? athRow.maxMonth : (latestMonthItem?.month || "");

  // 2) 전년동월비 (YoY) 산출
  let yoyDiff = 0;
  let yoyPercent = 0;
  let hasYoy = false;
  let yoyMonthStr = "";

  if (latestMonth) {
    const [year, month] = latestMonth.split("-").map(Number);
    yoyMonthStr = `${year - 1}-${String(month).padStart(2, "0")}`;

    const trendPrev = trend.find((d) => d.month === yoyMonthStr);
    if (trendPrev && trendPrev.평균가) {
      yoyDiff = Number((latestAvg - trendPrev.평균가).toFixed(2));
      yoyPercent = Number(((yoyDiff / trendPrev.평균가) * 100).toFixed(1));
      hasYoy = true;
    } else {
      let yoySql = `
        SELECT AVG(t.price_eok) AS prevAvg
        FROM transactions t
        JOIN complexes c ON t.complex_id = c.id
        WHERE c.name = ? AND substr(t.deal_date, 1, 7) = ? AND t.cancel_date IS NULL
      `;
      const yoyParams: (string | number)[] = [resolvedName, yoyMonthStr];
      if (lawdCode) {
        yoySql += " AND c.lawd_code = ?";
        yoyParams.push(lawdCode);
      }
      if (area !== undefined && area !== null) {
        yoySql += " AND CAST(ROUND(t.area_m2) AS INTEGER) = ?";
        yoyParams.push(area);
      }
      const yoyRow = db.prepare(yoySql).get(...yoyParams) as { prevAvg: number | null } | undefined;
      if (yoyRow && yoyRow.prevAvg !== null && yoyRow.prevAvg > 0) {
        const prevAvg = Number(yoyRow.prevAvg.toFixed(2));
        yoyDiff = Number((latestAvg - prevAvg).toFixed(2));
        yoyPercent = Number(((yoyDiff / prevAvg) * 100).toFixed(1));
        hasYoy = true;
      }
    }
  }

  // 3) 최근 1년 거래량 산출
  let pastYearVolume = 0;
  if (latestMonth) {
    const [year, month] = latestMonth.split("-").map(Number);
    let startYear = year;
    let startMonth = month - 11;
    if (startMonth <= 0) {
      startYear -= 1;
      startMonth += 12;
    }
    const startMonthStr = `${startYear}-${String(startMonth).padStart(2, "0")}`;
    pastYearVolume = trend
      .filter((d) => d.month >= startMonthStr && d.month <= latestMonth)
      .reduce((sum, d) => sum + (d.거래량 || 0), 0);
  }

  const kpi = {
    latestAvg,
    latestMonth,
    hasYoy,
    yoyDiff,
    yoyPercent,
    yoyMonthStr,
    pastYearVolume,
    maxPrice,
    maxMonth,
  };

  return {
    trend,
    areaBreakdown,
    floorDist,
    recentTx,
    kpi
  };
}

/**
 * LLM 프롬프트 생성을 위한 데이터 요약 텍스트
 */
export function getDataContext(filter: GraphFilter): string {
  const txs = searchTransactions(filter);

  if (txs.length === 0) {
    return "조건에 일치하는 실거래 데이터가 없습니다.";
  }

  const count = txs.length;
  const prices = (txs as any[]).map((t: { priceEok: number }) => t.priceEok);
  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / count;
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
      WHERE collected_at >= date('now', '-' || ? || ' days', 'localtime') AND cancel_date IS NULL
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
    WHERE cancel_date IS NULL
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
    WHERE substr(t.collected_at, 1, 10) = ? AND t.cancel_date IS NULL
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
      WHERE collected_at >= date('now', '-' || ? || ' days', 'localtime') AND cancel_date IS NULL
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
    WHERE cancel_date IS NULL
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
    WHERE substr(t.deal_date, 1, 7) = ? AND t.cancel_date IS NULL
    GROUP BY r.lawd_code, r.display_name
    ORDER BY count DESC
  `).all(month) as { lawdCode: string; regionName: string; count: number }[];
  return rows;
}


/**
 * 종합 현황 전용 월별 실거래가 & 거래량 시계열 집계 (BoxPlot)
 * - 10,000건 제한 없이 해당 기간 전체 데이터를 SARGable 인덱스로 조회하여 월별 통계 산출
 */
export async function getOverviewMonthlyTrend(
  filter: OverviewMonthlyFilter
): Promise<OverviewMonthlyItem[]> {
  const db = getDb();

  let queryStr = `
    SELECT substr(t.deal_date, 1, 7) AS month,
           t.price_eok AS priceEok,
           t.area_m2 AS areaM2,
           m.supply_area_m2 AS supplyAreaM2,
           r.display_name AS regionName
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    LEFT JOIN complex_area_mappings m ON t.complex_id = m.complex_id AND t.area_key = m.area_key
    WHERE t.cancel_date IS NULL
  `;
  const params: (string | number)[] = [];

  if (filter.lawdCodes && filter.lawdCodes.length > 0) {
    const placeholders = filter.lawdCodes.map(() => "?").join(",");
    queryStr += ` AND t.lawd_code IN (${placeholders})`;
    params.push(...filter.lawdCodes);
  } else if (filter.lawdCode) {
    queryStr += " AND t.lawd_code LIKE ? || '%'";
    params.push(filter.lawdCode);
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

  queryStr += " ORDER BY month ASC, t.deal_date ASC";

  const rows = db.prepare(queryStr).all(...params) as Array<{
    month: string;
    priceEok: number;
    areaM2: number;
    supplyAreaM2: number | null;
    regionName: string;
  }>;

  const monthlyDataMap = new Map<string, { count: number; prices: number[] }>();

  let startMonthStr = filter.startDate ? filter.startDate.substring(0, 7) : undefined;
  let endMonthStr = filter.endDate ? filter.endDate.substring(0, 7) : undefined;

  if (!startMonthStr || !endMonthStr) {
    rows.forEach((d) => {
      if (!startMonthStr || d.month < startMonthStr) startMonthStr = d.month;
      if (!endMonthStr || d.month > endMonthStr) endMonthStr = d.month;
    });
  }

  if (startMonthStr && endMonthStr && startMonthStr <= endMonthStr) {
    const [sY, sM] = startMonthStr.split("-").map(Number);
    const [eY, eM] = endMonthStr.split("-").map(Number);
    let curY = sY;
    let curM = sM;
    while (curY < eY || (curY === eY && curM <= eM)) {
      const mStr = `${curY}-${String(curM).padStart(2, "0")}`;
      monthlyDataMap.set(mStr, { count: 0, prices: [] });
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
  }

  const selectedRegion = filter.selectedRegion;
  const sizeFilter = filter.sizeFilter;
  const areaType = filter.areaType || "supply";

  for (const row of rows) {
    if (selectedRegion && selectedRegion !== "all") {
      const rName = row.regionName ? row.regionName.split(" ").slice(-1)[0] : "기타";
      if (rName !== selectedRegion) continue;
    }

    if (sizeFilter && sizeFilter !== "all") {
      const areaVal = areaType === "dedicated"
        ? (row.areaM2 || 0)
        : (row.supplyAreaM2 || (row.areaM2 ? row.areaM2 / 0.78 : 0));
      const pyeong = areaVal / 3.3058;

      if (sizeFilter === "under20" && pyeong >= 20.5) continue;
      if (sizeFilter === "20s" && (pyeong < 20.5 || pyeong >= 30.5)) continue;
      if (sizeFilter === "30s" && (pyeong < 30.5 || pyeong >= 40.5)) continue;
      if (sizeFilter === "40s" && (pyeong < 40.5 || pyeong >= 50.5)) continue;
      if (sizeFilter === "over50" && pyeong < 50.5) continue;
    }

    const current = monthlyDataMap.get(row.month) || { count: 0, prices: [] };
    current.count += 1;
    current.prices.push(row.priceEok);
    monthlyDataMap.set(row.month, current);
  }

  return Array.from(monthlyDataMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, val]) => {
      const count = val.count;
      if (count === 0) {
        return {
          name: month,
          volume: 0,
          min: null,
          q1: null,
          median: null,
          q3: null,
          max: null,
          avg: null,
          whiskerRange: null,
          boxRange: null,
        };
      }
      const stats = calculateBoxPlot(val.prices, 1);
      return {
        name: month,
        volume: count,
        min: stats.min,
        q1: stats.q1,
        median: stats.median,
        q3: stats.q3,
        max: stats.max,
        avg: stats.mean,
        whiskerRange: [stats.min, stats.max] as [number, number],
        boxRange: [stats.q1, stats.q3] as [number, number],
      };
    });
}

function getOverviewSizeCategory(areaM2: number, areaUnit: "pyeong" | "m2", areaType: "supply" | "dedicated"): string {
  const areaPyeong = areaM2 / 3.3058;
  if (areaUnit === "pyeong") {
    if (areaType === "supply") {
      if (areaPyeong <= 20.5) return "20평 이하";
      if (areaPyeong <= 25.5) return "21~25평";
      if (areaPyeong <= 30.5) return "26~30평";
      if (areaPyeong <= 35.5) return "31~35평";
      if (areaPyeong <= 40.5) return "36~40평";
      if (areaPyeong <= 45.5) return "41~45평";
      if (areaPyeong <= 50.5) return "46~50평";
      return "50평 초과";
    } else {
      if (areaPyeong <= 15.5) return "15평 이하";
      if (areaPyeong <= 20.5) return "16~20평";
      if (areaPyeong <= 25.5) return "21~25평";
      if (areaPyeong <= 30.5) return "26~30평";
      if (areaPyeong <= 35.5) return "31~35평";
      if (areaPyeong <= 40.5) return "36~40평";
      return "40평 초과";
    }
  } else {
    if (areaType === "supply") {
      if (areaM2 <= 66.5) return "66㎡ 이하";
      if (areaM2 <= 85.5) return "67~85㎡";
      if (areaM2 <= 105.5) return "86~105㎡";
      if (areaM2 <= 120.5) return "106~120㎡";
      if (areaM2 <= 135.5) return "121~135㎡";
      if (areaM2 <= 150.5) return "136~150㎡";
      if (areaM2 <= 165.5) return "151~165㎡";
      return "165㎡ 초과";
    } else {
      if (areaM2 <= 66.5) return "66㎡ 이하";
      if (areaM2 <= 83.5) return "67~83㎡";
      if (areaM2 <= 99.5) return "84~99㎡";
      if (areaM2 <= 116.5) return "100~116㎡";
      if (areaM2 <= 132.5) return "117~132㎡";
      return "132㎡ 초과";
    }
  }
}

function getOverviewFloorCategory(floorNum: number | null | undefined): string {
  if (floorNum === null || floorNum === undefined || isNaN(Number(floorNum))) return "기타";
  const num = Number(floorNum);
  if (num <= 5) return "저층 (5층 이하)";
  if (num <= 15) return "중층 (6~15층)";
  if (num <= 25) return "고층 (16~25층)";
  return "초고층 (26층 이상)";
}

function getOverviewSizeCategories(areaUnit: "pyeong" | "m2", areaType: "supply" | "dedicated"): string[] {
  if (areaUnit === "pyeong") {
    if (areaType === "supply") {
      return ["20평 이하", "21~25평", "26~30평", "31~35평", "36~40평", "41~45평", "46~50평", "50평 초과"];
    } else {
      return ["15평 이하", "16~20평", "21~25평", "26~30평", "31~35평", "36~40평", "40평 초과"];
    }
  } else {
    if (areaType === "supply") {
      return ["66㎡ 이하", "67~85㎡", "86~105㎡", "106~120㎡", "121~135㎡", "136~150㎡", "151~165㎡", "165㎡ 초과"];
    } else {
      return ["66㎡ 이하", "67~83㎡", "84~99㎡", "100~116㎡", "117~132㎡", "132㎡ 초과"];
    }
  }
}

/**
 * 종합 현황 전용 거래량 상위 단지 비교 집계
 * - 개별 row 전량 다운로드 없이 SQL GROUP BY로 상위 N개 단지 통계만 고속 산출
 */
export async function getOverviewTopComplexes(
  filter: OverviewTopComplexesFilter
): Promise<OverviewTopComplexItem[]> {
  const db = getDb();

  let queryStr = `
    SELECT c.name AS name,
           c.lawd_code AS lawdCode,
           r.display_name AS regionName,
           COUNT(*) AS txCount,
           ROUND(AVG(t.price_eok), 1) AS avgPriceEok,
           ROUND(MAX(t.price_eok), 1) AS maxPriceEok,
           ROUND(MIN(t.price_eok), 1) AS minPriceEok
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE t.cancel_date IS NULL
  `;
  const params: (string | number)[] = [];

  if (filter.lawdCodes && filter.lawdCodes.length > 0) {
    const placeholders = filter.lawdCodes.map(() => "?").join(",");
    queryStr += ` AND t.lawd_code IN (${placeholders})`;
    params.push(...filter.lawdCodes);
  } else if (filter.lawdCode) {
    queryStr += " AND t.lawd_code LIKE ? || '%'";
    params.push(filter.lawdCode);
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

  queryStr += " GROUP BY c.id, c.name, c.lawd_code, r.display_name";

  if (filter.region && filter.region !== "all") {
    queryStr += " HAVING r.display_name LIKE '%' || ?";
    params.push(filter.region);
  }

  const limit = Math.min(Math.max(filter.limit || 10, 1), 50);
  queryStr += ` ORDER BY txCount DESC LIMIT ${limit}`;

  const rows = db.prepare(queryStr).all(...params) as Array<{
    name: string;
    lawdCode: string;
    regionName: string;
    txCount: number;
    avgPriceEok: number;
    maxPriceEok: number;
    minPriceEok: number;
  }>;

  return rows.map((r) => ({
    name: r.name,
    거래수: r.txCount,
    평균가: r.avgPriceEok,
    최고가: r.maxPriceEok,
    최저가: r.minPriceEok,
    지역: r.regionName ? r.regionName.split(" ").slice(-1)[0] : "기타",
    lawdCode: r.lawdCode,
  }));
}

/**
 * 종합 현황 전용 지역별·평형대별 요약 매트릭스 (피벗 시트) 집계
 * - 프론트엔드로 수만 건 로우를 보내지 않고, 지역x평형별 요약 통계 셀만 집계하여 반환
 */
export async function getOverviewPivot(
  filter: OverviewPivotFilter
): Promise<OverviewPivotResult> {
  const db = getDb();
  const areaUnit = filter.areaUnit || "pyeong";
  const areaType = filter.areaType || "supply";

  let queryStr = `
    SELECT t.price_eok AS priceEok,
           t.area_m2 AS areaM2,
           m.supply_area_m2 AS supplyAreaM2,
           t.floor AS floor,
           c.name AS complexName,
           r.display_name AS regionName
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    LEFT JOIN complex_area_mappings m ON t.complex_id = m.complex_id AND t.area_key = m.area_key
    WHERE t.cancel_date IS NULL
  `;
  const params: (string | number)[] = [];

  if (filter.lawdCodes && filter.lawdCodes.length > 0) {
    const placeholders = filter.lawdCodes.map(() => "?").join(",");
    queryStr += ` AND t.lawd_code IN (${placeholders})`;
    params.push(...filter.lawdCodes);
  } else if (filter.lawdCode) {
    queryStr += " AND t.lawd_code LIKE ? || '%'";
    params.push(filter.lawdCode);
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

  const rows = db.prepare(queryStr).all(...params) as Array<{
    priceEok: number;
    areaM2: number;
    supplyAreaM2: number | null;
    floor: number | null;
    complexName: string;
    regionName: string;
  }>;

  const regionCounts = new Map<string, number>();
  for (const r of rows) {
    const rName = r.regionName ? r.regionName.split(" ").slice(-1)[0] : "기타";
    regionCounts.set(rName, (regionCounts.get(rName) || 0) + 1);
  }
  const activeRegions = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const sizeCategories = getOverviewSizeCategories(areaUnit, areaType);
  const floorCategories = ["저층 (5층 이하)", "중층 (6~15층)", "고층 (16~25층)", "초고층 (26층 이상)"];

  const cellMap = new Map<string, { prices: number[]; complexes: Set<string> }>();
  const floorCellMap = new Map<string, { prices: number[]; complexes: Set<string> }>();

  for (const r of rows) {
    const colKey = r.regionName ? r.regionName.split(" ").slice(-1)[0] : "기타";
    const areaVal = areaType === "supply"
      ? (r.supplyAreaM2 || (r.areaM2 ? r.areaM2 / 0.78 : 0))
      : (r.areaM2 || 0);
    const rowKey = getOverviewSizeCategory(areaVal, areaUnit, areaType);

    const key = `${rowKey}|${colKey}`;
    let cell = cellMap.get(key);
    if (!cell) {
      cell = { prices: [], complexes: new Set<string>() };
      cellMap.set(key, cell);
    }
    cell.prices.push(r.priceEok);
    if (r.complexName) cell.complexes.add(r.complexName);

    const floorKey = getOverviewFloorCategory(r.floor);
    const floorCellKey = `${rowKey}|${floorKey}|${colKey}`;
    let floorCell = floorCellMap.get(floorCellKey);
    if (!floorCell) {
      floorCell = { prices: [], complexes: new Set<string>() };
      floorCellMap.set(floorCellKey, floorCell);
    }
    floorCell.prices.push(r.priceEok);
    if (r.complexName) floorCell.complexes.add(r.complexName);
  }

  const data: Record<string, OverviewPivotCell> = {};
  let maxCount = 0;
  let minAvg = Infinity;
  let maxAvg = -Infinity;

  activeRegions.forEach((colKey) => {
    sizeCategories.forEach((rowKey) => {
      const key = `${rowKey}|${colKey}`;
      const cell = cellMap.get(key);
      if (cell && cell.prices.length > 0) {
        const stats = calculateBoxPlot(cell.prices, 1);
        const count = cell.prices.length;
        if (count > maxCount) maxCount = count;
        if (stats.mean < minAvg) minAvg = stats.mean;
        if (stats.mean > maxAvg) maxAvg = stats.mean;

        const complexesArr = Array.from(cell.complexes);
        const complexesSummary =
          complexesArr.slice(0, 2).join(", ") +
          (complexesArr.length > 2 ? ` 외 ${complexesArr.length - 2}개` : "");

        data[key] = {
          avg: stats.mean,
          median: stats.median,
          min: stats.min,
          max: stats.max,
          count,
          complexesSummary,
        };
      }

      floorCategories.forEach((floorKey) => {
        const fKey = `${rowKey}|${floorKey}|${colKey}`;
        const floorCell = floorCellMap.get(fKey);
        if (floorCell && floorCell.prices.length > 0) {
          const stats = calculateBoxPlot(floorCell.prices, 1);
          const count = floorCell.prices.length;
          const complexesArr = Array.from(floorCell.complexes);
          const complexesSummary =
            complexesArr.slice(0, 2).join(", ") +
            (complexesArr.length > 2 ? ` 외 ${complexesArr.length - 2}개` : "");

          data[fKey] = {
            avg: stats.mean,
            median: stats.median,
            min: stats.min,
            max: stats.max,
            count,
            complexesSummary,
          };
        }
      });
    });
  });

  return {
    data,
    maxCount,
    minAvg: minAvg === Infinity ? 0 : minAvg,
    maxAvg: maxAvg === -Infinity ? 0 : maxAvg,
    activeRegions,
  };
}
