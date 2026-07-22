/**
 * geocoding.ts — 카카오 REST API 기반 Geocoding + Haversine 거리 계산
 *
 * Lazy Geocoding 패턴:
 * - 좌표가 필요할 때 DB에서 먼저 조회
 * - 없으면 카카오 API로 Geocoding → DB에 저장
 * - 이후 요청은 DB에서 즉시 히트
 */

import {
  getComplexesWithCoords,
  getComplexesWithoutCoords,
  updateComplexCoords,
} from "@myhome/shared";

// ──────────────────────────────────────────────────
// Haversine 거리 계산
// ──────────────────────────────────────────────────

/**
 * 두 좌표(위도/경도) 간 거리를 미터로 계산 (Haversine formula)
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // 지구 반경 (미터)
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ──────────────────────────────────────────────────
// 카카오 REST API Geocoding
// ──────────────────────────────────────────────────

interface GeocoordResult {
  lat: number;
  lng: number;
}

// 메모리 캐시 (서버 수명 동안 유지)
const geocodeCache = new Map<string, GeocoordResult | null>();

/**
 * 카카오 REST API로 주소 → 좌표 변환
 * 1차: 주소 검색 (v2/local/search/address.json)
 * 2차: 키워드 검색 (v2/local/search/keyword.json) — 주소 검색 실패 시 폴백
 */
export async function geocodeAddress(address: string): Promise<GeocoordResult | null> {
  // 메모리 캐시 히트
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address) ?? null;
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.warn("[Geocoding] KAKAO_REST_API_KEY가 설정되지 않았습니다.");
    return null;
  }

  const headers = { Authorization: `KakaoAK ${apiKey}` };

  try {
    // 1차: 주소 검색
    const addrUrl = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const addrRes = await fetch(addrUrl, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (addrRes.ok) {
      const body = await addrRes.json();
      if (body.documents && body.documents.length > 0) {
        const doc = body.documents[0];
        const result: GeocoordResult = {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
        };
        geocodeCache.set(address, result);
        return result;
      }
    }

    // 2차: 키워드 검색 (주소 검색 실패 시)
    const kwUrl = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(address)}`;
    const kwRes = await fetch(kwUrl, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (kwRes.ok) {
      const body = await kwRes.json();
      if (body.documents && body.documents.length > 0) {
        const doc = body.documents[0];
        const result: GeocoordResult = {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
        };
        geocodeCache.set(address, result);
        return result;
      }
    }
  } catch (err) {
    console.error(`[Geocoding] 주소 변환 실패 (${address}):`, err);
  }

  geocodeCache.set(address, null);
  return null;
}

/**
 * 지하철역명 → 좌표 변환 (카카오 키워드 검색, category_group_code=SW8)
 */
export async function geocodeSubwayStation(stationName: string): Promise<GeocoordResult | null> {
  const cacheKey = `__subway__${stationName}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.warn("[Geocoding] KAKAO_REST_API_KEY가 설정되지 않았습니다.");
    return null;
  }

  try {
    // "판교역" 같은 검색어에 카테고리 그룹 코드 SW8(지하철역) 지정
    const query = stationName.endsWith("역") ? stationName : `${stationName}역`;
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&category_group_code=SW8`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const body = await res.json();
      if (body.documents && body.documents.length > 0) {
        const doc = body.documents[0];
        const result: GeocoordResult = {
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
        };
        geocodeCache.set(cacheKey, result);
        console.log(`[Geocoding] 지하철역 좌표 확보: ${query} → (${result.lat}, ${result.lng})`);
        return result;
      }
    }
  } catch (err) {
    console.error(`[Geocoding] 지하철역 좌표 변환 실패 (${stationName}):`, err);
  }

  geocodeCache.set(cacheKey, null);
  return null;
}

// ──────────────────────────────────────────────────
// 단지 Geocoding (Lazy: DB에 없으면 API 호출 후 저장)
// ──────────────────────────────────────────────────

/**
 * 단지의 주소 정보로 Geocoding 주소 문자열을 조합
 * 예: "성남시 분당구" + "백현동" + "753" → "성남시 분당구 백현동 753"
 */
function buildGeocodeQuery(
  regionName: string,
  dongName: string | null,
  jibun: string | null,
  complexName: string
): string {
  // 1순위: 지역명 + 법정동명 + 지번 (가장 정확)
  if (dongName && jibun) {
    return `${regionName} ${dongName} ${jibun}`;
  }
  // 2순위: 지역명 + 법정동명
  if (dongName) {
    return `${regionName} ${dongName}`;
  }
  // 3순위: 지역명 + 단지명 (괄호 제거)
  const cleanName = complexName.replace(/\(.*?\)/g, "").trim();
  return `${regionName} ${cleanName}`;
}

/**
 * 좌표 미확보 단지를 일괄 Geocoding하여 DB에 저장
 * @param lawdCode 특정 지역만 처리할 경우 지역코드 지정
 * @returns { total, success, failed }
 */
export async function batchGeocodeComplexes(
  lawdCode?: string
): Promise<{ total: number; success: number; failed: number }> {
  const pending = getComplexesWithoutCoords(lawdCode);
  let success = 0;
  let failed = 0;

  console.log(`[Geocoding] 일괄 Geocoding 시작: ${pending.length}개 단지`);

  for (const complex of pending) {
    const query = buildGeocodeQuery(
      complex.regionName,
      complex.dongName,
      complex.jibun,
      complex.name
    );

    const result = await geocodeAddress(query);
    if (result) {
      updateComplexCoords(complex.id, result.lat, result.lng);
      success++;
    } else {
      failed++;
      console.warn(`[Geocoding] 변환 실패: ${complex.name} (${query})`);
    }

    // 카카오 API Rate Limit 방지 (200ms 딜레이)
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`[Geocoding] 일괄 완료: 성공 ${success}, 실패 ${failed} / 총 ${pending.length}`);
  return { total: pending.length, success, failed };
}

// ──────────────────────────────────────────────────
// 핵심 비즈니스 로직: 역 반경 내 단지 검색
// ──────────────────────────────────────────────────

export interface NearbyComplex {
  name: string;
  lawdCode: string;
  regionName: string;
  lat: number;
  lng: number;
  distanceM: number;
  dongName: string | null;
  jibun: string | null;
}

export interface NearbyStationResult {
  station: {
    name: string;
    lat: number;
    lng: number;
  };
  radiusM: number;
  complexes: NearbyComplex[];
  geocodeStats: {
    total: number;
    geocoded: number;
    pending: number;
  };
}

/**
 * 특정 지하철역 반경 내 아파트 단지 검색
 *
 * Lazy Geocoding:
 * 1. 역 좌표 확보 (카카오 API)
 * 2. DB에서 좌표 있는 단지 → Haversine 필터
 * 3. 좌표 없는 단지 → Geocoding → DB 저장 → 필터
 * 4. 거리순 정렬 반환
 */
export async function findComplexesNearStation(
  stationName: string,
  radiusM = 500
): Promise<NearbyStationResult> {
  // 1. 지하철역 좌표 확보
  const stationCoords = await geocodeSubwayStation(stationName);
  if (!stationCoords) {
    throw new Error(`지하철역 '${stationName}'의 좌표를 확인할 수 없습니다.`);
  }

  const nearbyComplexes: NearbyComplex[] = [];

  // 2. DB에서 좌표 보유 단지 → 거리 계산
  const geocodedComplexes = getComplexesWithCoords();
  for (const c of geocodedComplexes) {
    const dist = haversineDistance(stationCoords.lat, stationCoords.lng, c.lat, c.lng);
    if (dist <= radiusM) {
      nearbyComplexes.push({
        name: c.name,
        lawdCode: c.lawdCode,
        regionName: c.regionName,
        lat: c.lat,
        lng: c.lng,
        distanceM: Math.round(dist),
        dongName: c.dongName,
        jibun: c.jibun,
      });
    }
  }

  // 3. 좌표 미확보 단지 → Lazy Geocoding
  const pendingComplexes = getComplexesWithoutCoords();
  for (const c of pendingComplexes) {
    // 사전 필터: 법정동이 다른 지역이면 Geocoding 스킵 (API 절약)
    const query = buildGeocodeQuery(c.regionName, c.dongName, c.jibun, c.name);
    const result = await geocodeAddress(query);

    if (result) {
      updateComplexCoords(c.id, result.lat, result.lng);

      const dist = haversineDistance(stationCoords.lat, stationCoords.lng, result.lat, result.lng);
      if (dist <= radiusM) {
        nearbyComplexes.push({
          name: c.name,
          lawdCode: c.lawdCode,
          regionName: c.regionName,
          lat: result.lat,
          lng: result.lng,
          distanceM: Math.round(dist),
          dongName: c.dongName,
          jibun: c.jibun,
        });
      }
    }

    // Rate Limit 방지
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  // 4. 거리순 정렬
  nearbyComplexes.sort((a, b) => a.distanceM - b.distanceM);

  // Geocoding 현황 통계
  const { getGeocodeStats } = await import("@myhome/shared");
  const geocodeStats = getGeocodeStats();

  return {
    station: {
      name: stationName,
      lat: stationCoords.lat,
      lng: stationCoords.lng,
    },
    radiusM,
    complexes: nearbyComplexes,
    geocodeStats,
  };
}

export interface NearbySubwayStation {
  name: string;
  distanceM: number;
  lat: number;
  lng: number;
}

// 주변 지하철역 조회 결과 메모리 캐시 (API Rate Limit 절약 및 0ms 초고속 응답 목적)
const nearbySubwaysCache = new Map<string, NearbySubwayStation[]>();

/**
 * 특정 좌표(위도/경도) 반경 내 지하철역 검색 (카카오 카테고리 검색 SW8)
 */
export async function findSubwayStationsNearCoords(
  lat: number,
  lng: number,
  radiusM = 2000
): Promise<NearbySubwayStation[]> {
  // 위경도 소수점 5자리(약 1m 정밀도)로 반올림하여 캐시 키 생성
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)},${radiusM}`;
  if (nearbySubwaysCache.has(cacheKey)) {
    console.log(`[Geocoding] 주변 지하철역 캐시 히트: ${cacheKey}`);
    return nearbySubwaysCache.get(cacheKey) || [];
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    console.warn("[Geocoding] KAKAO_REST_API_KEY가 설정되지 않았습니다.");
    return [];
  }

  const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=SW8&x=${lng}&y=${lat}&radius=${radiusM}&sort=distance`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const body = await res.json();
      if (body.documents) {
        const result: NearbySubwayStation[] = body.documents.map((doc: any) => ({
          name: doc.place_name,
          distanceM: parseInt(doc.distance) || 0,
          lat: parseFloat(doc.y),
          lng: parseFloat(doc.x),
        }));
        
        nearbySubwaysCache.set(cacheKey, result);
        console.log(`[Geocoding] 주변 지하철역 캐시 저장: ${cacheKey} (${result.length}개 발견)`);
        return result;
      }
    }
  } catch (err) {
    console.error(`[Geocoding] 주변 지하철역 검색 실패 (${lat}, ${lng}):`, err);
  }

  return [];
}


