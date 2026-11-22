import { getDb, getPreparedStatement } from "../connection.js";
import type { GraphStats, GraphFilter, GraphTopologyData, DailyCollectStat, RegionCollectStat } from "../../types.js";
import { searchTransactions } from "../transactions.js";

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
 * 노드-링크 시각화 데이터 (네트워크 뷰 폐기로 더미 데이터 리턴)
 */
export function getGraphTopology(_filter: GraphFilter): GraphTopologyData {
  return {
    nodes: [],
    links: [],
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

export function getOverviewSizeCategory(areaM2: number, areaUnit: "pyeong" | "m2", areaType: "supply" | "dedicated"): string {
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

export function getOverviewFloorCategory(floorNum: number | null | undefined): string {
  if (floorNum === null || floorNum === undefined || isNaN(Number(floorNum))) return "기타";
  const num = Number(floorNum);
  if (num <= 5) return "저층 (5층 이하)";
  if (num <= 15) return "중층 (6~15층)";
  if (num <= 25) return "고층 (16~25층)";
  return "초고층 (26층 이상)";
}

export function getOverviewSizeCategories(areaUnit: "pyeong" | "m2", areaType: "supply" | "dedicated"): string[] {
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
