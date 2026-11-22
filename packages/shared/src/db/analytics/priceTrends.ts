import { getDb, getPreparedStatement } from "../connection.js";
import type { TrendPoint, OverviewMonthlyItem, OverviewMonthlyFilter } from "../../types.js";
import { calculateBoxPlot } from "../../stats.js";
import { resolveComplexName } from "../regions.js";

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

  const trend: Record<string, any>[] = [];
  for (const [month, data] of monthlyGroups.entries()) {
    const prices = data.prices;
    const stats = calculateBoxPlot(prices);
    const count = prices.length;
    const maxVal = stats.max;
    const minVal = stats.min;
    const avgVal = stats.mean;
    const medVal = stats.median;

    const point: Record<string, any> = {
      month,
      count,
      ...stats,
      거래량: count,
      최대가: Number(maxVal.toFixed(2)),
      최고가: Number(maxVal.toFixed(2)),
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
