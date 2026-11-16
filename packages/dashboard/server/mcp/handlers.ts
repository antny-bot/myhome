import { getDb, searchComplexNames } from "@myhome/shared";
import { monthsAgoCutoff, normalizeDealDate } from "./dateUtils.js";

interface ToolHandlerContext {
  userEmail: string;
}

/**
 * 1. search_complexes
 */
export async function handleSearchComplexes(args: any): Promise<string> {
  const query = String(args.query || "").trim();
  const lawdCode = args.lawd_code ? String(args.lawd_code).trim() : undefined;
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);

  if (!query) {
    return JSON.stringify({ error: "검색어(query)를 입력해주세요." });
  }

  const results = searchComplexNames(query, lawdCode);
  const sliced = results.slice(0, limit);

  return JSON.stringify(
    {
      totalFound: results.length,
      returnedCount: sliced.length,
      complexes: sliced.map((c) => ({
        id: c.id,
        name: c.name,
        lawdCode: c.lawdCode,
        regionName: c.regionName,
        lat: c.lat,
        lng: c.lng,
      })),
    },
    null,
    2
  );
}

/**
 * 2. get_complex_detail
 */
export async function handleGetComplexDetail(args: any): Promise<string> {
  const db = getDb();
  let complexId = args.complex_id ? String(args.complex_id).trim() : undefined;
  const complexName = args.complex_name ? String(args.complex_name).trim() : undefined;
  const lawdCode = args.lawd_code ? String(args.lawd_code).trim() : undefined;

  if (!complexId && !complexName) {
    return JSON.stringify({ error: "complex_id 또는 complex_name 중 하나를 지정해야 합니다." });
  }

  let row: any = null;
  if (complexId) {
    row = db
      .prepare(
        `
        SELECT c.*, r.display_name AS region_name
        FROM complexes c
        LEFT JOIN regions r ON c.lawd_code = r.lawd_code
        WHERE c.id = ?
      `
      )
      .get(complexId);
  }

  if (!row && complexName) {
    const query = `
      SELECT c.*, r.display_name AS region_name
      FROM complexes c
      LEFT JOIN regions r ON c.lawd_code = r.lawd_code
      LEFT JOIN (
        SELECT complex_id, COUNT(*) AS tx_cnt
        FROM transactions
        GROUP BY complex_id
      ) tc ON tc.complex_id = c.id
      WHERE c.name = ? ${lawdCode ? "AND c.lawd_code = ?" : ""}
      ORDER BY COALESCE(tc.tx_cnt, 0) DESC
      LIMIT 1
    `;
    row = lawdCode ? db.prepare(query).get(complexName, lawdCode) : db.prepare(query).get(complexName);
    if (row) {
      complexId = row.id;
    }
  }

  if (!row) {
    return JSON.stringify({ error: "해당 조건의 단지를 찾을 수 없습니다." });
  }

  // 면적 매핑 정보 조회
  const areaMappings = db
    .prepare(
      `
      SELECT area_m2, area_key, supply_area_m2, source
      FROM complex_area_mappings
      WHERE complex_id = ?
      ORDER BY area_m2 ASC
    `
    )
    .all(row.id) as any[];

  // 최근 실거래 요약 (취소 거래 제외)
  const txSummary = db
    .prepare(
      `
      SELECT COUNT(*) AS total_tx_count,
             MAX(deal_date) AS latest_deal_date,
             MIN(price_eok) AS all_time_min_price,
             MAX(price_eok) AS all_time_max_price
      FROM transactions
      WHERE complex_id = ? AND (cancel_date IS NULL OR cancel_date = '')
    `
    )
    .get(row.id) as any;

  return JSON.stringify(
    {
      complex: {
        id: row.id,
        name: row.name,
        lawdCode: row.lawd_code,
        regionName: row.region_name || "",
        dongName: row.dong_name || "",
        jibun: row.jibun || "",
        roadName: row.road_name || "",
        lat: row.lat,
        lng: row.lng,
        totalHouseholds: row.total_households,
        totalParking: row.total_parking,
        parkingPerHousehold: row.parking_per_household,
        useApprovalDate: row.use_approval_date,
      },
      areaTypes: areaMappings.map((m) => ({
        exclusiveAreaM2: m.area_m2,
        supplyAreaM2: m.supply_area_m2,
        pyeongEquivalent: (m.supply_area_m2 / 3.30578).toFixed(1),
      })),
      transactionSummary: {
        totalTxCount: txSummary?.total_tx_count || 0,
        latestDealDate: txSummary?.latest_deal_date || null,
        minPriceEok: txSummary?.all_time_min_price || null,
        maxPriceEok: txSummary?.all_time_max_price || null,
      },
    },
    null,
    2
  );
}

/**
 * 3. get_recent_transactions
 */
export async function handleGetRecentTransactions(args: any): Promise<string> {
  const db = getDb();
  const limit = Math.min(Math.max(Number(args.limit) || 30, 1), 200);
  const complexName = args.complex_name ? String(args.complex_name).trim() : undefined;
  const lawdCode = args.lawd_code ? String(args.lawd_code).trim() : undefined;
  // DB(transactions.deal_date) 포맷은 'YYYY-MM-DD' → 입력도 동일 포맷으로 정규화
  const startDate = normalizeDealDate(args.start_date, "start");
  const endDate = normalizeDealDate(args.end_date, "end");

  if (args.start_date && !startDate) {
    return JSON.stringify({ error: "start_date 형식이 올바르지 않습니다. YYYY-MM-DD 또는 YYYYMMDD 로 입력해주세요." });
  }
  if (args.end_date && !endDate) {
    return JSON.stringify({ error: "end_date 형식이 올바르지 않습니다. YYYY-MM-DD 또는 YYYYMMDD 로 입력해주세요." });
  }

  const minPrice = args.min_price_eok !== undefined ? Number(args.min_price_eok) : undefined;
  const maxPrice = args.max_price_eok !== undefined ? Number(args.max_price_eok) : undefined;

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (complexName) {
    // 완전 일치 우선, 부분 일치 지원
    whereClauses.push("(c.name = ? OR c.name LIKE ?)");
    params.push(complexName, `%${complexName}%`);
  }

  if (lawdCode) {
    whereClauses.push("t.lawd_code = ?");
    params.push(lawdCode);
  }

  if (startDate) {
    whereClauses.push("t.deal_date >= ?");
    params.push(startDate);
  }

  if (endDate) {
    whereClauses.push("t.deal_date <= ?");
    params.push(endDate);
  }

  if (minPrice !== undefined && !isNaN(minPrice)) {
    whereClauses.push("t.price_eok >= ?");
    params.push(minPrice);
  }

  if (maxPrice !== undefined && !isNaN(maxPrice)) {
    whereClauses.push("t.price_eok <= ?");
    params.push(maxPrice);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const sql = `
    SELECT t.deal_date, t.price_eok, t.area_m2, t.floor, t.apt_dong, t.dealing_type, t.cancel_date,
           c.name AS complex_name, c.lawd_code, r.display_name AS region_name
    FROM transactions t
    JOIN complexes c ON t.complex_id = c.id
    LEFT JOIN regions r ON t.lawd_code = r.lawd_code
    ${whereSql}
    ORDER BY t.deal_date DESC, t.price_eok DESC
    LIMIT ?
  `;
  params.push(limit);

  const rows = db.prepare(sql).all(...params) as any[];

  return JSON.stringify(
    {
      count: rows.length,
      transactions: rows.map((r) => ({
        dealDate: r.deal_date,
        complexName: r.complex_name,
        regionName: r.region_name || "",
        priceEok: r.price_eok,
        areaM2: r.area_m2,
        pyeong: r.area_m2 ? (r.area_m2 / 3.30578).toFixed(1) : null,
        floor: r.floor,
        dong: r.apt_dong || null,
        dealingType: r.dealing_type || null,
        isCanceled: Boolean(r.cancel_date),
      })),
    },
    null,
    2
  );
}

/**
 * 4. get_transaction_stats
 */
export async function handleGetTransactionStats(args: any): Promise<string> {
  const db = getDb();
  const complexName = String(args.complex_name || "").trim();
  const lawdCode = args.lawd_code ? String(args.lawd_code).trim() : undefined;
  const months = Math.min(Math.max(Number(args.months) || 12, 1), 60);

  if (!complexName) {
    return JSON.stringify({ error: "complex_name은 필수 항목입니다." });
  }

  // 기준 날짜 계산 ('YYYY-MM-DD', DB 저장 포맷과 일치해야 기간 필터가 동작)
  const cutoffDate = monthsAgoCutoff(months);

  // 단지 조회 (거래량 많은 단지 우선 정렬)
  const complexSql = `
    SELECT c.id, c.name, c.lawd_code
    FROM complexes c
    LEFT JOIN (
      SELECT complex_id, COUNT(*) AS tx_cnt
      FROM transactions
      GROUP BY complex_id
    ) tc ON tc.complex_id = c.id
    WHERE c.name = ? ${lawdCode ? "AND c.lawd_code = ?" : ""}
    ORDER BY COALESCE(tc.tx_cnt, 0) DESC
    LIMIT 1
  `;
  const complex = (lawdCode ? db.prepare(complexSql).get(complexName, lawdCode) : db.prepare(complexSql).get(complexName)) as any;

  if (!complex) {
    return JSON.stringify({ error: `'${complexName}' 단지를 찾을 수 없습니다.` });
  }

  // 최근 N개월 전체 통계
  const overallStats = db
    .prepare(
      `
      SELECT COUNT(*) AS tx_count,
             ROUND(AVG(price_eok), 2) AS avg_price,
             MIN(price_eok) AS min_price,
             MAX(price_eok) AS max_price
      FROM transactions
      WHERE complex_id = ? AND deal_date >= ? AND (cancel_date IS NULL OR cancel_date = '')
    `
    )
    .get(complex.id, cutoffDate) as any;

  // 가장 최근 거래 1건
  const latestTx = db
    .prepare(
      `
      SELECT deal_date, price_eok, area_m2, floor
      FROM transactions
      WHERE complex_id = ? AND (cancel_date IS NULL OR cancel_date = '')
      ORDER BY deal_date DESC
      LIMIT 1
    `
    )
    .get(complex.id) as any;

  // 전용면적대별 통계
  const areaStats = db
    .prepare(
      `
      SELECT CAST(ROUND(area_m2) AS INTEGER) AS area_rounded,
             COUNT(*) AS count,
             ROUND(AVG(price_eok), 2) AS avg_price,
             MIN(price_eok) AS min_price,
             MAX(price_eok) AS max_price
      FROM transactions
      WHERE complex_id = ? AND deal_date >= ? AND (cancel_date IS NULL OR cancel_date = '')
      GROUP BY area_rounded
      ORDER BY count DESC
    `
    )
    .all(complex.id, cutoffDate) as any[];

  return JSON.stringify(
    {
      complexName: complex.name,
      lawdCode: complex.lawd_code,
      periodMonths: months,
      cutoffDate,
      recentPeriodStats: {
        totalCount: overallStats?.tx_count || 0,
        averagePriceEok: overallStats?.avg_price || null,
        minPriceEok: overallStats?.min_price || null,
        maxPriceEok: overallStats?.max_price || null,
      },
      latestTransaction: latestTx
        ? {
            dealDate: latestTx.deal_date,
            priceEok: latestTx.price_eok,
            areaM2: latestTx.area_m2,
            floor: latestTx.floor,
          }
        : null,
      statsByArea: areaStats.map((a) => ({
        approxAreaM2: a.area_rounded,
        txCount: a.count,
        avgPriceEok: a.avg_price,
        minPriceEok: a.min_price,
        maxPriceEok: a.max_price,
      })),
    },
    null,
    2
  );
}

/**
 * 5. search_regions
 */
export async function handleSearchRegions(args: any): Promise<string> {
  const db = getDb();
  const query = args.query ? String(args.query).trim() : "";

  let sql = `SELECT lawd_code, display_name FROM regions`;
  const params: any[] = [];
  if (query) {
    sql += ` WHERE display_name LIKE ?`;
    params.push(`%${query}%`);
  }
  sql += ` ORDER BY display_name ASC LIMIT 50`;

  const rows = db.prepare(sql).all(...params) as any[];
  return JSON.stringify(
    {
      count: rows.length,
      regions: rows.map((r) => ({
        lawdCode: r.lawd_code,
        displayName: r.display_name,
      })),
    },
    null,
    2
  );
}

/**
 * 6. list_monitoring_rules
 */
export async function handleListMonitoringRules(_args: any, context: ToolHandlerContext): Promise<string> {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, name, region_name, region_code, apartment_keywords,
             min_price_eok, max_price_eok, min_area, max_area,
             comparison_criteria, interval_minutes, alert_time, enabled,
             last_checked_at, created_at
      FROM rules
      WHERE user_email = ?
      ORDER BY created_at DESC
    `
    )
    .all(context.userEmail) as any[];

  return JSON.stringify(
    {
      count: rows.length,
      rules: rows.map((r) => ({
        id: r.id,
        name: r.name,
        regionName: r.region_name,
        apartmentKeywords: r.apartment_keywords,
        priceRangeEok: { min: r.min_price_eok, max: r.max_price_eok },
        areaRangeM2: { min: r.min_area, max: r.max_area },
        comparisonCriteria: r.comparison_criteria,
        enabled: Boolean(r.enabled),
        lastCheckedAt: r.last_checked_at,
      })),
    },
    null,
    2
  );
}

/**
 * MCP Tool 실행 분기
 */
export async function executeMcpTool(
  toolName: string,
  args: any,
  context: ToolHandlerContext
): Promise<string> {
  switch (toolName) {
    case "search_complexes":
      return handleSearchComplexes(args);
    case "get_complex_detail":
      return handleGetComplexDetail(args);
    case "get_recent_transactions":
      return handleGetRecentTransactions(args);
    case "get_transaction_stats":
      return handleGetTransactionStats(args);
    case "search_regions":
      return handleSearchRegions(args);
    case "list_monitoring_rules":
      return handleListMonitoringRules(args, context);
    default:
      throw new Error(`알 수 없거나 지원되지 않는 도구입니다: ${toolName}`);
  }
}
