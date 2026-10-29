import { DatabaseSync } from "node:sqlite";
import { getDb, getPreparedStatement } from "./connection.js";
import { ComplexSearchResult, ComplexMetaFilter } from "../types.js";

/**
 * 검색 단지명 유연 해석 (정확 일치 우선, 없으면 FTS5 가상 테이블 및 거래량 기준 매칭)
 */
export function resolveComplexName(db: DatabaseSync, complexName: string, lawdCode?: string): string {
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

    // 2. FTS5 가상 테이블을 활용해 1차 후보군을 MATCH로 선정하고, 거래량 최다 단지 매칭
    const tokens = complexName.trim().split(/\s+/).filter(Boolean);
    const matchQuery = tokens.map(t => `${t}*`).join(" AND ");

    const fuzzyQuery = db.prepare(`
      SELECT c.name, COUNT(*) AS cnt
      FROM complexes_fts f
      JOIN complexes c ON f.complex_id = c.id
      JOIN transactions t ON c.id = t.complex_id
      WHERE complexes_fts MATCH ? ${lawdCode ? "AND c.lawd_code = ?" : ""}
      GROUP BY c.name
      ORDER BY cnt DESC
      LIMIT 1
    `);
    const fuzzyRow = lawdCode ? fuzzyQuery.get(matchQuery, lawdCode) : fuzzyQuery.get(matchQuery);
    if (fuzzyRow) {
      return (fuzzyRow as any).name;
    }
  } catch (err) {
    console.error("[SQLiteDB] resolveComplexName error", err);
  }
  return complexName;
}

/**
 * 단지명 글로벌 검색 (지역 무관 또는 특정 지역 필터)
 * SQLite FTS5 MATCH 구문을 사용하여 Full-Table Scan 없이 초고속 부분 검색을 지원합니다.
 */
export async function searchComplexNames(
  query: string,
  lawdCode?: string,
  filter?: ComplexMetaFilter
): Promise<ComplexSearchResult[]> {
  const db = getDb();
  
  if (!query.trim()) {
    let queryStr = `
      SELECT DISTINCT c.id, c.name, c.lawd_code AS lawdCode, r.display_name AS regionName, c.lat, c.lng
      FROM complexes c
      JOIN regions r ON c.lawd_code = r.lawd_code
      WHERE 1=1
    `;
    const params: any[] = [];
    if (lawdCode) {
      queryStr += ` AND c.lawd_code LIKE ? || '%'`;
      params.push(lawdCode);
    }
    if (filter?.minHouseholds !== undefined && filter.minHouseholds > 0) {
      queryStr += ` AND c.total_households >= ?`;
      params.push(filter.minHouseholds);
    }
    if (filter?.minParkingPerHousehold !== undefined && filter.minParkingPerHousehold > 0) {
      queryStr += ` AND c.parking_per_household >= ?`;
      params.push(filter.minParkingPerHousehold);
    }
    if (filter?.minBuildYear !== undefined && filter.minBuildYear > 0) {
      queryStr += ` AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) >= ?`;
      params.push(filter.minBuildYear);
    }
    if (filter?.maxBuildYear !== undefined && filter.maxBuildYear > 0) {
      queryStr += ` AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) <= ?`;
      params.push(filter.maxBuildYear);
    }
    queryStr += ` ORDER BY c.name LIMIT 30`;
    const rows = db.prepare(queryStr).all(...params);
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      lawdCode: r.lawdCode,
      regionName: r.regionName,
      lat: r.lat,
      lng: r.lng,
    }));
  }

  let queryStr = `
    SELECT DISTINCT c.id, c.name, c.lawd_code AS lawdCode, r.display_name AS regionName, c.lat, c.lng
    FROM complexes_fts f
    JOIN complexes c ON f.complex_id = c.id
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE complexes_fts MATCH ?
  `;
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const matchQuery = tokens.map(t => `${t}*`).join(" AND ");
  const params: any[] = [matchQuery];
  if (lawdCode) {
    queryStr += ` AND c.lawd_code LIKE ? || '%'`;
    params.push(lawdCode);
  }
  if (filter?.minHouseholds !== undefined && filter.minHouseholds > 0) {
    queryStr += ` AND c.total_households >= ?`;
    params.push(filter.minHouseholds);
  }
  if (filter?.minParkingPerHousehold !== undefined && filter.minParkingPerHousehold > 0) {
    queryStr += ` AND c.parking_per_household >= ?`;
    params.push(filter.minParkingPerHousehold);
  }
  if (filter?.minBuildYear !== undefined && filter.minBuildYear > 0) {
    queryStr += ` AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) >= ?`;
    params.push(filter.minBuildYear);
  }
  if (filter?.maxBuildYear !== undefined && filter.maxBuildYear > 0) {
    queryStr += ` AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) <= ?`;
    params.push(filter.maxBuildYear);
  }
  queryStr += ` ORDER BY c.name LIMIT 30`;

  const rows = db.prepare(queryStr).all(...params);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    lawdCode: r.lawdCode,
    regionName: r.regionName,
    lat: r.lat,
    lng: r.lng,
  }));
}

export function getCachedApartments(lawdCode: string): { apartments: string[]; cachedAt: string | null } {
  const meta = getPreparedStatement("SELECT cached_at FROM region_apartment_cache_meta WHERE lawd_code = ?").get(lawdCode) as { cached_at: string } | undefined;
  if (!meta) {
    return { apartments: [], cachedAt: null };
  }
  const rows = getPreparedStatement("SELECT apartment_name FROM region_apartment_cache WHERE lawd_code = ? ORDER BY apartment_name ASC").all(lawdCode) as { apartment_name: string }[];
  return {
    apartments: rows.map((r) => r.apartment_name),
    cachedAt: meta.cached_at,
  };
}

export function saveCachedApartments(lawdCode: string, apartments: string[]): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.exec("BEGIN TRANSACTION");
  try {
    getPreparedStatement("DELETE FROM region_apartment_cache WHERE lawd_code = ?").run(lawdCode);
    const insertStmt = getPreparedStatement("INSERT INTO region_apartment_cache (lawd_code, apartment_name) VALUES (?, ?)");
    for (const name of apartments) {
      insertStmt.run(lawdCode, name);
    }
    getPreparedStatement(`
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

export function searchDbRegions(query: string): { lawdCode: string; displayName: string }[] {
  const rows = getPreparedStatement(`
    SELECT lawd_code AS lawdCode, display_name AS displayName
    FROM regions
    WHERE display_name LIKE '%' || ? || '%'
    ORDER BY display_name
    LIMIT 15
  `).all(query) as { lawdCode: string; displayName: string }[];
  return rows;
}

export function getAllDbRegions(): { lawdCode: string; displayName: string }[] {
  const rows = getPreparedStatement(`
    SELECT lawd_code AS lawdCode, display_name AS displayName
    FROM regions
    ORDER BY display_name ASC
  `).all() as { lawdCode: string; displayName: string }[];
  return rows;
}

export function getDbRegionsSummary(): {
  lawdCode: string;
  displayName: string;
  createdAt: string;
  transactionCount: number;
  minDealDate: string | null;
  maxDealDate: string | null;
}[] {
  const rows = getPreparedStatement(`
    SELECT r.lawd_code AS lawdCode,
           r.display_name AS displayName,
           r.created_at AS createdAt,
           COALESCE(t.cnt, 0) AS transactionCount,
           t.minDealDate AS minDealDate,
           t.maxDealDate AS maxDealDate
    FROM regions r
    LEFT JOIN (
      SELECT lawd_code,
             COUNT(*) AS cnt,
             MIN(deal_date) AS minDealDate,
             MAX(deal_date) AS maxDealDate
      FROM transactions
      WHERE cancel_date IS NULL
      GROUP BY lawd_code
    ) t ON r.lawd_code = t.lawd_code
    ORDER BY r.display_name ASC
  `).all() as any[];

  return rows.map(r => ({
    lawdCode: r.lawdCode,
    displayName: r.displayName,
    createdAt: r.createdAt,
    transactionCount: r.transactionCount,
    minDealDate: r.minDealDate || null,
    maxDealDate: r.maxDealDate || null
  }));
}

export function insertDbRegion(lawdCode: string, displayName: string): void {
  const now = new Date().toISOString();
  getPreparedStatement(`
    INSERT INTO regions (lawd_code, display_name, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(lawd_code) DO NOTHING
  `).run(lawdCode, displayName, now);
}

export function getComplexesByRegion(lawdCode?: string, filter?: ComplexMetaFilter): string[] {
  const db = getDb();
  let query = `
    SELECT DISTINCT name
    FROM complexes
    WHERE 1=1
  `;
  const params: any[] = [];
  if (lawdCode && lawdCode.trim() !== "") {
    query += ` AND lawd_code = ?`;
    params.push(lawdCode);
  }
  if (filter?.minHouseholds !== undefined && filter.minHouseholds > 0) {
    query += ` AND total_households >= ?`;
    params.push(filter.minHouseholds);
  }
  if (filter?.minTotalParking !== undefined && filter.minTotalParking > 0) {
    query += ` AND total_parking >= ?`;
    params.push(filter.minTotalParking);
  }
  if (filter?.minParkingPerHousehold !== undefined && filter.minParkingPerHousehold > 0) {
    query += ` AND parking_per_household >= ?`;
    params.push(filter.minParkingPerHousehold);
  }
  if (filter?.minBuildYear !== undefined && filter.minBuildYear > 0) {
    query += ` AND CAST(substr(use_approval_date, 1, 4) AS INTEGER) >= ?`;
    params.push(filter.minBuildYear);
  }
  if (filter?.maxBuildYear !== undefined && filter.maxBuildYear > 0) {
    query += ` AND CAST(substr(use_approval_date, 1, 4) AS INTEGER) <= ?`;
    params.push(filter.maxBuildYear);
  }
  query += ` ORDER BY name ASC`;
  const rows = db.prepare(query).all(...params) as { name: string }[];
  return rows.map(r => r.name);
}

/**
 * 특정 지역(lawdCode)에 속한 단지들의 지도 시각화용 상세 정보 및 거래 통계 조회
 * - Window Function CTE를 적용하여 N회 상관 서브쿼리 제거 (단 1회 일괄 집계)
 * - 건축물대장 메타 필터 (세대수, 주차대수, 세대당 주차, 준공연도) 조건부 검색 지원
 */
export function getRegionComplexesMapData(
  lawdCode: string,
  filter?: ComplexMetaFilter
): {
  lawdCode: string;
  regionName: string;
  totalComplexes: number;
  geocodedCount: number;
  center: { lat: number; lng: number } | null;
  complexes: {
    id: string;
    name: string;
    lawdCode: string;
    regionName: string;
    dongName: string | null;
    jibun: string | null;
    roadName: string | null;
    lat: number | null;
    lng: number | null;
    txCount: number;
    latestDealDate: string | null;
    latestPriceEok: number | null;
    avgPriceEok: number | null;
    minPriceEok: number | null;
    maxPriceEok: number | null;
    totalHouseholds: number | null;
    totalParking: number | null;
    parkingPerHousehold: number | null;
    useApprovalDate: string | null;
  }[];
} {
  const db = getDb();
  const regionRow = db.prepare(`SELECT display_name FROM regions WHERE lawd_code = ?`).get(lawdCode) as { display_name: string } | undefined;
  const regionName = regionRow?.display_name || lawdCode;

  let filterConditions = "WHERE c.lawd_code = ?";
  const params: any[] = [lawdCode];

  if (filter?.minHouseholds !== undefined && filter.minHouseholds > 0) {
    filterConditions += " AND c.total_households >= ?";
    params.push(filter.minHouseholds);
  }
  if (filter?.minTotalParking !== undefined && filter.minTotalParking > 0) {
    filterConditions += " AND c.total_parking >= ?";
    params.push(filter.minTotalParking);
  }
  if (filter?.minParkingPerHousehold !== undefined && filter.minParkingPerHousehold > 0) {
    filterConditions += " AND c.parking_per_household >= ?";
    params.push(filter.minParkingPerHousehold);
  }
  if (filter?.minBuildYear !== undefined && filter.minBuildYear > 0) {
    filterConditions += " AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) >= ?";
    params.push(filter.minBuildYear);
  }
  if (filter?.maxBuildYear !== undefined && filter.maxBuildYear > 0) {
    filterConditions += " AND CAST(substr(c.use_approval_date, 1, 4) AS INTEGER) <= ?";
    params.push(filter.maxBuildYear);
  }

  const sql = `
    WITH tx_summary AS (
      SELECT 
        complex_id,
        COUNT(*) AS txCount,
        MAX(deal_date) AS latestDealDate,
        ROUND(AVG(price_eok), 2) AS avgPriceEok,
        MIN(price_eok) AS minPriceEok,
        MAX(price_eok) AS maxPriceEok,
        FIRST_VALUE(price_eok) OVER (PARTITION BY complex_id ORDER BY deal_date DESC, rowid DESC) AS latestPriceEok
      FROM transactions
      WHERE lawd_code = ? AND cancel_date IS NULL
      GROUP BY complex_id
    )
    SELECT 
      c.id,
      c.name,
      c.lawd_code AS lawdCode,
      r.display_name AS regionName,
      c.dong_name AS dongName,
      c.jibun,
      c.road_name AS roadName,
      c.lat,
      c.lng,
      c.total_households AS totalHouseholds,
      c.total_parking AS totalParking,
      c.parking_per_household AS parkingPerHousehold,
      c.use_approval_date AS useApprovalDate,
      COALESCE(ts.txCount, 0) AS txCount,
      ts.latestDealDate,
      ts.avgPriceEok,
      ts.minPriceEok,
      ts.maxPriceEok,
      ts.latestPriceEok
    FROM complexes c
    JOIN regions r ON c.lawd_code = r.lawd_code
    LEFT JOIN tx_summary ts ON c.id = ts.complex_id
    ${filterConditions}
    ORDER BY txCount DESC, c.name ASC
  `;

  // tx_summary의 lawd_code 파라미터가 1번째, 이후 filterConditions의 params가 결합
  const rows = db.prepare(sql).all(lawdCode, ...params) as any[];

  let totalLat = 0;
  let totalLng = 0;
  let geocodedCount = 0;

  for (const row of rows) {
    if (row.lat !== null && row.lng !== null && !isNaN(row.lat) && !isNaN(row.lng)) {
      totalLat += row.lat;
      totalLng += row.lng;
      geocodedCount++;
    }
  }

  const center = geocodedCount > 0
    ? { lat: totalLat / geocodedCount, lng: totalLng / geocodedCount }
    : null;

  return {
    lawdCode,
    regionName,
    totalComplexes: rows.length,
    geocodedCount,
    center,
    complexes: rows
  };
}
