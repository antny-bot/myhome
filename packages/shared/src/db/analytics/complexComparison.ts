import { getDb } from "../connection.js";
import type { DrilldownRegionItem, DrilldownComplexItem, DrilldownAreaItem } from "../../types.js";
import { calculateBoxPlot } from "../../stats.js";
import { resolveComplexName } from "../regions.js";

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
      count: prices.length,
      ...stats,
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
