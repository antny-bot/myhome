import { getDb, getPreparedStatement } from "./connection.js";
import { resolveComplexName } from "./regions.js";

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
    WHERE c.lat IS NULL AND c.geocode_failed = 0
  `;
  const params: (string | number)[] = [];
  if (lawdCode) {
    query += ' AND c.lawd_code = ?';
    params.push(lawdCode);
  }
  query += ' ORDER BY c.name ASC';
  return db.prepare(query).all(...params) as unknown as { id: string; name: string; lawdCode: string; regionName: string; dongName: string | null; jibun: string | null; roadName: string | null }[];
}

/**
 * 위경도 좌표가 없는 모든 단지 목록 조회 (수동 관리 대상)
 */
export function getComplexesMissingCoords(): {
  id: string;
  name: string;
  lawdCode: string;
  regionName: string;
  dongName: string | null;
  jibun: string | null;
  roadName: string | null;
  lat: number | null;
  lng: number | null;
  geocodeFailed: number;
  geocodeError: string | null;
}[] {
  const query = `
    SELECT c.id, c.name, c.lawd_code AS lawdCode, r.display_name AS regionName,
           c.dong_name AS dongName, c.jibun, c.road_name AS roadName,
           c.lat, c.lng, c.geocode_failed AS geocodeFailed, c.geocode_error AS geocodeError
    FROM complexes c
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE c.lat IS NULL OR c.lng IS NULL
    ORDER BY c.name ASC
  `;
  return getPreparedStatement(query).all() as unknown as {
  id: string;
  name: string;
  lawdCode: string;
  regionName: string;
  dongName: string | null;
  jibun: string | null;
  roadName: string | null;
  lat: number | null;
  lng: number | null;
  geocodeFailed: number;
  geocodeError: string | null;
}[];
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
  const params: (string | number)[] = [];
  if (lawdCode) {
    query += ' AND c.lawd_code = ?';
    params.push(lawdCode);
  }
  query += ' ORDER BY c.name ASC';
  return db.prepare(query).all(...params) as unknown as { id: string; name: string; lawdCode: string; regionName: string; lat: number; lng: number; dongName: string | null; jibun: string | null }[];
}

/**
 * 단지 좌표 업데이트 (Geocoding 결과 저장)
 */
export function updateComplexCoords(complexId: string, lat: number, lng: number): void {
  const now = new Date().toISOString();
  getPreparedStatement(`
    UPDATE complexes SET lat = ?, lng = ?, geocode_failed = 0, geocode_error = NULL, geocoded_at = ? WHERE id = ?
  `).run(lat, lng, now, complexId);
}

/**
 * 단지 Geocoding 실패 업데이트
 */
export function updateComplexGeocodeFailed(complexId: string, errorMsg: string): void {
  const now = new Date().toISOString();
  getPreparedStatement(`
    UPDATE complexes SET geocode_failed = 1, geocode_error = ?, geocoded_at = ? WHERE id = ?
  `).run(errorMsg, now, complexId);
}

/**
 * 모든 단지의 Geocoding 실패 상태 초기화 (재시도 가능하게 함)
 */
export function resetGeocodeFailures(): void {
  getPreparedStatement(`
    UPDATE complexes SET geocode_failed = 0, geocode_error = NULL WHERE geocode_failed = 1
  `).run();
}

/**
 * 특정 단지의 좌표 및 실패 상태 리셋 (다시 Geocoding 하도록)
 */
export function resetComplexCoords(complexId: string): void {
  getPreparedStatement(`
    UPDATE complexes 
    SET lat = NULL, lng = NULL, geocode_failed = 0, geocode_error = NULL, geocoded_at = NULL 
    WHERE id = ?
  `).run(complexId);
}

/**
 * Geocoding 현황 통계 조회
 */
export function getGeocodeStats(): { total: number; geocoded: number; pending: number } {
  const total = (getPreparedStatement('SELECT COUNT(*) AS c FROM complexes').get() as { c: number }).c;
  const geocoded = (getPreparedStatement('SELECT COUNT(*) AS c FROM complexes WHERE lat IS NOT NULL').get() as { c: number }).c;
  return { total, geocoded, pending: total - geocoded };
}

export function getComplexGeo(
  complexName: string,
  lawdCode?: string
): {
  id: string;
  name: string;
  lawdCode: string;
  regionName: string;
  lat: number | null;
  lng: number | null;
  dongName: string | null;
  jibun: string | null;
  roadName: string | null;
  totalHouseholds?: number | null;
  totalParking?: number | null;
  parkingPerHousehold?: number | null;
  useApprovalDate?: string | null;
} | null {
  const db = getDb();
  const resolvedName = resolveComplexName(db, complexName, lawdCode);

  let query = `
    SELECT c.id, c.name, c.lawd_code AS lawdCode, r.display_name AS regionName,
           c.lat, c.lng, c.dong_name AS dongName, c.jibun, c.road_name AS roadName,
           c.total_households AS totalHouseholds, c.total_parking AS totalParking,
           c.parking_per_household AS parkingPerHousehold, c.use_approval_date AS useApprovalDate
    FROM complexes c
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE c.name = ?
  `;
  const params: (string | number)[] = [resolvedName];
  if (lawdCode) {
    query += ' AND c.lawd_code = ?';
    params.push(lawdCode);
  }
  query += ' LIMIT 1';

  const row = db.prepare(query).get(...params);
  if (!row) return null;
  return row as unknown as {
    id: string;
    name: string;
    lawdCode: string;
    regionName: string;
    lat: number | null;
    lng: number | null;
    dongName: string | null;
    jibun: string | null;
    roadName: string | null;
    totalHouseholds?: number | null;
    totalParking?: number | null;
    parkingPerHousehold?: number | null;
    useApprovalDate?: string | null;
  };
}

/**
 * 단지 메타 정보(세대수, 주차대수, 사용승인일) 업데이트
 */
export function updateComplexMeta(
  complexId: string,
  meta: {
    totalHouseholds?: number | null;
    totalParking?: number | null;
    parkingPerHousehold?: number | null;
    useApprovalDate?: string | null;
  }
): void {
  const db = getDb();
  db.exec("BEGIN TRANSACTION");
  try {
    const stmt = db.prepare(`
      UPDATE complexes
      SET total_households = COALESCE(?, total_households),
          total_parking = COALESCE(?, total_parking),
          parking_per_household = COALESCE(?, parking_per_household),
          use_approval_date = COALESCE(?, use_approval_date)
      WHERE id = ?
    `);
    stmt.run(
      meta.totalHouseholds ?? null,
      meta.totalParking ?? null,
      meta.parkingPerHousehold ?? null,
      meta.useApprovalDate ?? null,
      complexId
    );
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
