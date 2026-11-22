import { getDb } from "../connection.js";
import type { OverviewTopComplexesFilter, OverviewTopComplexItem, OverviewPivotFilter, OverviewPivotResult, OverviewPivotCell } from "../../types.js";
import { calculateBoxPlot } from "../../stats.js";
import { getOverviewSizeCategory, getOverviewFloorCategory, getOverviewSizeCategories } from "./helpers.js";

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
           GROUP_CONCAT(t.price_eok) AS allPrices
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
    allPrices: string | null;
  }>;

  return rows.map((r) => {
    const prices = r.allPrices
      ? r.allPrices
          .split(",")
          .map(Number)
          .filter((n) => !isNaN(n))
      : [];
    const stats = prices.length > 0 ? calculateBoxPlot(prices, 1) : null;
    const avg = stats ? stats.mean : 0;
    const max = stats ? stats.max : 0;
    const min = stats ? stats.min : 0;

    return {
      name: r.name,
      거래수: r.txCount,
      평균가: avg,
      최고가: max,
      최저가: min,
      지역: r.regionName ? r.regionName.split(" ").slice(-1)[0] : "기타",
      lawdCode: r.lawdCode,
      volume: r.txCount,
      min: stats ? stats.min : null,
      q1: stats ? stats.q1 : null,
      median: stats ? stats.median : null,
      q3: stats ? stats.q3 : null,
      max: stats ? stats.max : null,
      avg: stats ? stats.mean : null,
      whiskerRange: stats ? ([stats.min, stats.max] as [number, number]) : null,
      boxRange: stats ? ([stats.q1, stats.q3] as [number, number]) : null,
    };
  });
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
