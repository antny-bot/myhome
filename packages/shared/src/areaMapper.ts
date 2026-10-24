import { parseRealEstateXml } from "./xmlParser.js";
import { upsertAreaMapping, getAreaMapping } from "./db.js";

// 서킷 브레이커 설정
let consecutiveErrors = 0;
let circuitBrokenUntil: number | null = null;
const MAX_CONSECUTIVE_ERRORS = 5;
const CIRCUIT_BREAKER_DURATION = 15 * 60 * 1000; // 15분 동안 차단

function isCircuitBreakerActive(): boolean {
  if (circuitBrokenUntil && Date.now() < circuitBrokenUntil) {
    return true;
  }
  if (circuitBrokenUntil && Date.now() >= circuitBrokenUntil) {
    // 차단 시간이 지나면 초기화 (Half-Open 상태 진입 허용)
    circuitBrokenUntil = null;
    consecutiveErrors = 0;
  }
  return false;
}

function recordApiError() {
  consecutiveErrors++;
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    circuitBrokenUntil = Date.now() + CIRCUIT_BREAKER_DURATION;
    console.warn(
      `[AreaMapper] 건축물대장 API 연속 에러 ${consecutiveErrors}회 발생. ` +
      `${CIRCUIT_BREAKER_DURATION / 60000}분 동안 API 호출을 차단하고 fallback으로 자동 전환합니다.`
    );
  }
}

function recordApiSuccess() {
  consecutiveErrors = 0;
  circuitBrokenUntil = null;
}

// 카카오 로컬 API를 이용해 주소의 10자리 법정동 코드(bCode)를 가져오는 헬퍼
async function getBCode(addressName: string): Promise<string | null> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) return null;

  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(addressName)}`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: `KakaoAK ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (body.documents && body.documents.length > 0) {
      return body.documents[0].address?.b_code ?? null;
    }
  } catch (err) {
    console.warn(`[AreaMapper] 카카오 법정동코드 조회 실패:`, err);
  }
  return null;
}

// 지번주소를 본번(bun)과 부번(ji)으로 변환 (각각 4자리 zero-padded 문자열)
function parseJibun(jibun: string): { bun: string; ji: string } {
  if (!jibun) return { bun: "", ji: "" };
  const match = jibun.trim().match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return { bun: "", ji: "" };

  const bunNum = parseInt(match[1], 10);
  const jiNum = match[2] ? parseInt(match[2], 10) : 0;

  return {
    bun: String(bunNum).padStart(4, "0"),
    ji: String(jiNum).padStart(4, "0"),
  };
}

/**
 * 특정 단지 및 전용면적에 대해 분양면적(공급면적)을 조회하고 DB에 캐싱합니다.
 */
export async function syncSupplyArea(params: {
  complexId: string;
  complexName: string;
  lawdCode: string; // 5자리 시군구코드
  dongName?: string;
  jibun?: string;
  areaM2: number;
  regionDisplayName: string; // 예: "서울특별시 마포구"
}): Promise<number> {
  const { complexId, complexName, lawdCode, dongName, jibun, areaM2, regionDisplayName } = params;

  // 0. 캐시 확인: 실측(api) 매핑 정보가 적재되어 있다면 반환
  const cached = getAreaMapping(complexId, areaM2);
  if (cached && cached.source !== "fallback") {
    return cached.supplyAreaM2;
  }

  // 0.5. 서킷 브레이커 작동 시 즉시 폴백 계산 (카카오 API 및 공공데이터 API 호출 스킵)
  if (isCircuitBreakerActive()) {
    const fallbackSupply = Number((areaM2 / 0.78).toFixed(2));
    upsertAreaMapping(complexId, areaM2, fallbackSupply, "fallback");
    return fallbackSupply;
  }

  // 1. 카카오 API를 활용해 법정동 코드 조회 시도
  let bCode: string | null = null;
  if (dongName && jibun) {
    // 예: 서울특별시 마포구 아현동 123-45
    const fullAddress = `${regionDisplayName} ${dongName} ${jibun}`.trim();
    bCode = await getBCode(fullAddress);
  }

  // 2. 공공데이터 인증키가 없거나 법정동 코드를 못 찾은 경우 폴백 계산 (전용률 78% 가정)
  const apiKey = process.env.BLD_RGST_API_KEY || process.env.DATA_GO_KR_API_KEY;
  if (!apiKey || !bCode || bCode.length < 10) {
    const fallbackSupply = Number((areaM2 / 0.78).toFixed(2));
    upsertAreaMapping(complexId, areaM2, fallbackSupply, "fallback");
    return fallbackSupply;
  }

  const sigunguCd = bCode.slice(0, 5); // 5자리 시군구
  const bjdongCd = bCode.slice(5, 10); // 5자리 법정동
  const { bun, ji } = parseJibun(jibun || "");

  // 2.5 건축물대장 메타정보 동기화 (총괄표제부 및 표제부)
  try {
    await syncComplexBuildingMeta(complexId);
  } catch (err: any) {
    console.warn(`[AreaMapper] 단지 메타 동기화 실패 (${complexName}):`, err.message);
  }

  // 3. 건축물대장 전유공용면적 API 호출 (건축HUB 신규 엔드포인트: numOfRows는 최대 100건 제한 준수)
  try {
    let matchedExpos: any[] = [];
    let items: any[] = [];

    // 최대 3페이지(300건)까지 탐색하여 전용면적 일치 세대 검색
    for (let page = 1; page <= 3; page++) {
      const url = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrExposPubuseAreaInfo?serviceKey=${apiKey}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=0&bun=${bun}&ji=${ji}&numOfRows=100&pageNo=${page}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const xmlText = await res.text();
      const pageItems = parseRealEstateXml(xmlText);
      if (!pageItems || pageItems.length === 0) break;
      items = pageItems;

      matchedExpos = items.filter((it: any) => {
        const gbCd = it.exposPubuseGbCd || it.exposPubuseAreaGbCd;
        const gbNm = String(it.exposPubuseGbCdNm || it.exposPubuseAreaGbCdNm || "");
        const isExpos = gbCd === 1 || gbCd === "1" || gbNm.includes("전유");
        return isExpos && Math.abs(Number(it.area) - areaM2) < 0.1;
      });

      if (matchedExpos.length > 0) break;
    }

    if (matchedExpos.length > 0) {
      // 매칭된 호 중 첫 번째 호를 기준으로 주거공용면적 합산
      const targetExpo = matchedExpos[0];
      const targetDong = targetExpo.dongNm;
      const targetHo = targetExpo.hoNm;

      // 동일한 동, 호를 가진 공용 면적 필터링
      const publicAreas = items.filter((it: any) => {
        const gbCd = it.exposPubuseGbCd || it.exposPubuseAreaGbCd;
        const gbNm = String(it.exposPubuseGbCdNm || it.exposPubuseAreaGbCdNm || "");
        const isPublic = gbCd === 2 || gbCd === "2" || gbNm.includes("공용");
        return isPublic && it.dongNm === targetDong && it.hoNm === targetHo;
      });

      // 공용 면적 중 '주거공용' 성격의 면적 합산
      let mainPublicAreaSum = 0;
      for (const pa of publicAreas) {
        const purpose = String(pa.etcPurps || pa.exposPubuseGbCdNm || pa.exposPubuseAreaGbCdNm || "");
        
        // 제외할 용도 키워드 (기타공용, 주차장, 기계실 등 공급면적 외 제외)
        const excludeKeywords = ["주차", "기계", "전기", "정화조", "발전", "기타", "노유자", "주민"];
        const isExcluded = excludeKeywords.some((kw) => purpose.includes(kw));

        if (!isExcluded) {
          mainPublicAreaSum += Number(pa.area || 0);
        }
      }

      const supplyArea = Number((areaM2 + mainPublicAreaSum).toFixed(2));
      const ratio = areaM2 / supplyArea;

      // 산출된 전용률이 정상 범주(60% ~ 90%)인 경우에만 실측 데이터로 채택
      if (ratio >= 0.6 && ratio <= 0.9) {
        upsertAreaMapping(complexId, areaM2, supplyArea, "api");
        recordApiSuccess();
        return supplyArea;
      }
    }
    
    // 매칭 데이터가 없거나 전용률이 비정상이어도 API 호출 자체는 성공했으므로 리셋
    recordApiSuccess();
  } catch (err: any) {
    const isServerErr = err.message?.includes("500") || err.message?.includes("Unexpected errors");
    const errMsg = isServerErr ? `${err.message} (공공데이터포털 서버 장애 - 폴백 적용)` : err.message;
    console.warn(`[AreaMapper] 건축물대장 API 연동 실패 (${complexName}, ${areaM2}㎡):`, errMsg);
    recordApiError();
  }

  // API 연동에 실패하거나 전용률이 비정상적인 경우 폴백 적용
  const fallbackSupply = Number((areaM2 / 0.78).toFixed(2));
  upsertAreaMapping(complexId, areaM2, fallbackSupply, "fallback");
  return fallbackSupply;
}


/**
 * 건축HUB 오픈API를 통해 단지의 총괄표제부 및 표제부를 조회하고 complexes 메타정보를 갱신합니다.
 */
export async function syncComplexBuildingMeta(complexId: string): Promise<boolean> {
  const { getDb, updateComplexMeta } = await import("./db.js");
  const db = getDb();
  const complex = db.prepare(`
    SELECT c.id, c.name, c.lawd_code AS lawdCode, r.display_name AS regionName,
           c.dong_name AS dongName, c.jibun, c.road_name AS roadName,
           c.total_households AS totalHouseholds
    FROM complexes c
    JOIN regions r ON c.lawd_code = r.lawd_code
    WHERE c.id = ?
  `).get(complexId) as any;

  if (!complex) return false;

  const apiKey = process.env.BLD_RGST_API_KEY || process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) return false;

  // 법정동코드 조회
  let bCode: string | null = null;
  if (complex.dongName && complex.jibun) {
    bCode = await getBCode(`${complex.regionName} ${complex.dongName} ${complex.jibun}`.trim());
  } else if (complex.roadName) {
    bCode = await getBCode(`${complex.regionName} ${complex.roadName}`.trim());
  } else if (complex.dongName) {
    bCode = await getBCode(`${complex.regionName} ${complex.dongName}`.trim());
  }

  let sigunguCd = complex.lawdCode;
  let bjdongCd = "";
  if (bCode && bCode.length >= 10) {
    sigunguCd = bCode.slice(0, 5);
    bjdongCd = bCode.slice(5, 10);
  }

  const { bun, ji } = parseJibun(complex.jibun || "");

  // 1. 총괄표제부 (getBrRecapTitleInfo) 우선 시도 (대단지 아파트 전체 세대수/주차대수 확보)
  const recapUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrRecapTitleInfo?serviceKey=${apiKey}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=0&bun=${bun}&ji=${ji}&numOfRows=10&pageNo=1`;
  try {
    const recapRes = await fetch(recapUrl, { signal: AbortSignal.timeout(8000) });
    if (recapRes.ok) {
      const xml = await recapRes.text();
      const items = parseRealEstateXml(xml);
      if (items && items.length > 0) {
        const cleanName = complex.name.replace(/\(.*?\)/g, "").trim();
        const target = items.find((it: any) => String(it.bldNm).includes(cleanName) || String(it.bldNm).includes(complex.name)) || items[0];
        const hhldCnt = Number(target.hhldCnt || 0);
        const totPkngCnt = Number(target.totPkngCnt || 0);
        const useAprDay = String(target.useAprDay || target.useAprvDay || "").trim();
        let formattedDate: string | null = null;
        if (useAprDay && useAprDay.length === 8) {
          formattedDate = `${useAprDay.substring(0, 4)}-${useAprDay.substring(4, 6)}-${useAprDay.substring(6, 8)}`;
        }
        const parkingPerHousehold = hhldCnt > 0 ? Number((totPkngCnt / hhldCnt).toFixed(2)) : null;

        updateComplexMeta(complexId, {
          totalHouseholds: hhldCnt || null,
          totalParking: totPkngCnt || null,
          parkingPerHousehold,
          useApprovalDate: formattedDate,
        });
        console.log(`[syncComplexBuildingMeta:총괄표제부] ${complex.name}: ${hhldCnt}세대, 주차 ${parkingPerHousehold}대, 승인 ${formattedDate}`);
        return true;
      }
    }
  } catch (err: any) {
    // 총괄표제부 실패 시 표제부로 폴백
  }

  // 2. 동별 표제부 (getBrTitleInfo) 폴백 (총괄표제부가 없는 단지 또는 1개동 단지)
  const titleUrl = `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${apiKey}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=0&bun=${bun}&ji=${ji}&numOfRows=50&pageNo=1`;
  try {
    const titleRes = await fetch(titleUrl, { signal: AbortSignal.timeout(8000) });
    if (titleRes.ok) {
      const xml = await titleRes.text();
      const items = parseRealEstateXml(xml);
      if (items && items.length > 0) {
        const cleanName = complex.name.replace(/\(.*?\)/g, "").trim();
        const matched = items.filter((it: any) => String(it.bldNm).includes(cleanName) || String(it.bldNm).includes(complex.name));
        const targetItems = matched.length > 0 ? matched : items;

        let totalHhld = 0;
        let totalParking = 0;
        let useAprDay = "";

        for (const it of targetItems) {
          totalHhld += Number(it.hhldCnt || 0);
          totalParking += Number(it.totPkngCnt || 0);
          if (!useAprDay && (it.useAprDay || it.useAprvDay)) {
            useAprDay = String(it.useAprDay || it.useAprvDay).trim();
          }
        }

        let formattedDate: string | null = null;
        if (useAprDay && useAprDay.length === 8) {
          formattedDate = `${useAprDay.substring(0, 4)}-${useAprDay.substring(4, 6)}-${useAprDay.substring(6, 8)}`;
        }
        const parkingPerHousehold = totalHhld > 0 ? Number((totalParking / totalHhld).toFixed(2)) : null;

        updateComplexMeta(complexId, {
          totalHouseholds: totalHhld || null,
          totalParking: totalParking || null,
          parkingPerHousehold,
          useApprovalDate: formattedDate,
        });
        console.log(`[syncComplexBuildingMeta:동별표제부] ${complex.name}: ${totalHhld}세대, 주차 ${parkingPerHousehold}대, 승인 ${formattedDate}`);
        return true;
      }
    }
  } catch (err: any) {
    console.warn(`[syncComplexBuildingMeta:동별표제부] 실패 (${complex.name}):`, err.message);
  }

  return false;
}
