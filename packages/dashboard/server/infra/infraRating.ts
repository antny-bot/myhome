import { Config } from "../config.js";
import { createLogger } from "@myhome/shared";
import { calculateCategoryScore, calculateParkingScore } from "./scoreCalculator.js";
import { generateMockInfraRating } from "./mockInfra.js";
import { fetchNaturalEnvRating } from "./naturalEnv.js";
import { fetchWithPolicy, CircuitBreaker } from "../http/fetchWithPolicy.js";

const log = createLogger("Geocoding:Infra");
const kakaoCircuitBreaker = new CircuitBreaker(5, 30000);

export const nearbyInfraCache = new Map<string, any>();

export function clearNearbyInfraCache(): void {
  nearbyInfraCache.clear();
}

/**
 * 특정 좌표 반경 내 핵심 입지(지하철역, 학교, 병원, 대형마트, 약국, 편의점, 자연환경) 검색 후
 * 가중 평점 계산 (특화 반경 및 노멀라이징 적용)
 */
export async function getComplexInfraRating(
  lat: number | null,
  lng: number | null,
  complexName: string,
  parkingPerHousehold?: number | null
): Promise<any> {
  if (lat === null || lng === null) {
    return generateMockInfraRating(complexName, parkingPerHousehold);
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}:${parkingPerHousehold ?? ""}`;
  if (nearbyInfraCache.has(cacheKey)) {
    return nearbyInfraCache.get(cacheKey);
  }

  const apiKey = Config.KAKAO_REST_API_KEY;
  if (!apiKey) {
    const mock = generateMockInfraRating(complexName, parkingPerHousehold);
    nearbyInfraCache.set(cacheKey, mock);
    return mock;
  }

  const categoryConfigs = [
    { code: "SW8", name: "역세권", weight: 1.5, radius: 1000 },
    { code: "SC4", name: "학교", weight: 1.2, radius: 500 },
    { code: "HP8", name: "병원", weight: 0.8, radius: 1000 },
    { code: "MT1", name: "대형마트", weight: 0.7, radius: 1500 }
  ];

  const categories: Record<string, any> = {};
  let weightedScoreSum = 0;
  let weightSum = 0;

  try {
    for (const config of categoryConfigs) {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=${config.code}&x=${lng}&y=${lat}&radius=${config.radius}&sort=distance`;

      let count = 0;
      let minDistance: number | null = null;
      let score = 0;
      let details: any = null;

      try {
        const res = await fetchWithPolicy(
          url,
          { headers: { Authorization: `KakaoAK ${apiKey}` } },
          { timeoutMs: 5000, retries: 1, circuitBreaker: kakaoCircuitBreaker }
        );

        if (res.ok) {
          const body = await res.json();
          if (body.documents && body.documents.length > 0) {
            const docs = body.documents;

            if (config.code === "SW8") {
              const getUniqueStationName = (doc: any) => {
                const rawName = doc.place_name || "";
                const match = rawName.match(/^(.+?역)/);
                return match ? match[1] : rawName.trim();
              };

              const gtxUnique = new Map<string, number>();
              const railUnique = new Map<string, number>();
              const metroUnique = new Map<string, number>();

              docs.forEach((doc: any) => {
                const cat = doc.category_name || "";
                const name = doc.place_name || "";
                const distanceM = parseInt(doc.distance) || 0;
                const uniqueName = getUniqueStationName(doc);

                const isGtx = cat.includes("GTX") || name.includes("GTX");
                if (isGtx) {
                  if (!gtxUnique.has(uniqueName)) {
                    gtxUnique.set(uniqueName, distanceM);
                  }
                  return;
                }

                const isRail = cat.includes("KTX") || cat.includes("SRT") || cat.includes("ITX") ||
                               name.includes("KTX") || name.includes("SRT") || name.includes("ITX") ||
                               name.includes("기차역") || name.includes("철도역") ||
                               name.endsWith("철도") || name.includes("일반철도");
                if (isRail) {
                  if (!railUnique.has(uniqueName)) {
                    railUnique.set(uniqueName, distanceM);
                  }
                  return;
                }

                if (!metroUnique.has(uniqueName)) {
                  metroUnique.set(uniqueName, distanceM);
                }
              });

              const metroCount = metroUnique.size;
              const gtxCount = gtxUnique.size;
              const railCount = railUnique.size;
              count = metroCount + gtxCount + railCount;

              const allDistances = [
                ...Array.from(metroUnique.values()),
                ...Array.from(gtxUnique.values()),
                ...Array.from(railUnique.values())
              ];
              minDistance = allDistances.length > 0 ? Math.min(...allDistances) : null;

              const getMinDistFromMap = (m: Map<string, number>) => m.size > 0 ? Math.min(...Array.from(m.values())) : null;
              const metroMinDistance = getMinDistFromMap(metroUnique);
              const gtxMinDistance = getMinDistFromMap(gtxUnique);
              const railMinDistance = getMinDistFromMap(railUnique);

              score = calculateCategoryScore(config.code, minDistance, count);

              details = {
                metroCount,
                metroMinDistance,
                gtxCount,
                gtxMinDistance,
                railCount,
                railMinDistance
              };
            } else if (config.code === "HP8") {
              let generalHospitalCount = 0;
              let generalHospitalMinDistance: number | null = null;
              let localClinicCount = 0;
              let localClinicMinDistance: number | null = null;

              docs.forEach((doc: any) => {
                const cat = doc.category_name || "";
                const name = doc.place_name || "";
                const distanceM = parseInt(doc.distance) || 0;

                const isBig = cat.includes("종합병원") || cat.includes("대학병원") || 
                              name.includes("종합병원") || name.includes("대학병원") || name.includes("의료원");

                if (isBig) {
                  generalHospitalCount++;
                  if (generalHospitalMinDistance === null || distanceM < generalHospitalMinDistance) {
                    generalHospitalMinDistance = distanceM;
                  }
                } else {
                  localClinicCount++;
                  if (localClinicMinDistance === null || distanceM < localClinicMinDistance) {
                    localClinicMinDistance = distanceM;
                  }
                }
              });

              count = docs.length;
              minDistance = parseInt(docs[0].distance) || null;

              let pharmacyCount = 0;
              let pharmacyMinDistance: number | null = null;
              try {
                const pUrl = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=PM9&x=${lng}&y=${lat}&radius=500&sort=distance`;
                const pRes = await fetchWithPolicy(
                  pUrl,
                  { headers: { Authorization: `KakaoAK ${apiKey}` } },
                  { timeoutMs: 3000, retries: 0 }
                );
                if (pRes.ok) {
                  const pBody = await pRes.json();
                  if (pBody.documents && pBody.documents.length > 0) {
                    pharmacyCount = pBody.documents.length;
                    pharmacyMinDistance = parseInt(pBody.documents[0].distance) || null;
                  }
                }
              } catch (pErr) {
                log.error("[Geocoding] 약국 추가 조회 실패:", pErr);
              }

              let sLarge = 0;
              if (generalHospitalMinDistance !== null) {
                if (generalHospitalMinDistance <= 500) sLarge = 100;
                else if (generalHospitalMinDistance <= 1000) sLarge = 80;
              }

              let sClinic = 0;
              if (localClinicMinDistance !== null) {
                const d = localClinicMinDistance;
                if (d <= 150) sClinic = 100;
                else if (d <= 300) sClinic = 80;
                else if (d <= 500) sClinic = 60;
                else if (d <= 1000) sClinic = 40;
              }

              if (generalHospitalMinDistance !== null) {
                score = Math.min(100, Math.round(sLarge * 0.7 + sClinic * 0.3 + 10));
              } else {
                score = sClinic;
              }

              details = {
                generalHospitalCount,
                generalHospitalMinDistance,
                localClinicCount,
                localClinicMinDistance,
                pharmacyCount,
                pharmacyMinDistance
              };
            } else if (config.code === "MT1") {
              let largeMartCount = 0;
              let largeMartMinDistance: number | null = null;
              let ssmCount = 0;
              let ssmMinDistance: number | null = null;

              docs.forEach((doc: any) => {
                const name = doc.place_name || "";
                const distanceM = parseInt(doc.distance) || 0;

                const isLarge = name.includes("이마트") || name.includes("홈플러스") || name.includes("롯데마트") ||
                                name.includes("코스트코") || name.includes("트레이더스") || name.includes("하나로클럽");

                if (isLarge) {
                  largeMartCount++;
                  if (largeMartMinDistance === null || distanceM < largeMartMinDistance) {
                    largeMartMinDistance = distanceM;
                  }
                } else {
                  ssmCount++;
                  if (ssmMinDistance === null || distanceM < ssmMinDistance) {
                    ssmMinDistance = distanceM;
                  }
                }
              });

              count = docs.length;
              minDistance = parseInt(docs[0].distance) || null;

              let convenienceCount = 0;
              let convenienceMinDistance: number | null = null;
              try {
                const cUrl = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=CS2&x=${lng}&y=${lat}&radius=300&sort=distance`;
                const cRes = await fetchWithPolicy(
                  cUrl,
                  { headers: { Authorization: `KakaoAK ${apiKey}` } },
                  { timeoutMs: 3000, retries: 0 }
                );
                if (cRes.ok) {
                  const cBody = await cRes.json();
                  if (cBody.documents && cBody.documents.length > 0) {
                    convenienceCount = cBody.documents.length;
                    convenienceMinDistance = parseInt(cBody.documents[0].distance) || null;
                  }
                }
              } catch (cErr) {
                log.error("[Geocoding] 편의점 추가 조회 실패:", cErr);
              }

              let sMart = 0;
              if (largeMartMinDistance !== null) {
                const d = largeMartMinDistance;
                if (d <= 500) sMart = 100;
                else if (d <= 1000) sMart = 80;
                else if (d <= 1500) sMart = 60;
              }

              let sSsm = 0;
              if (ssmMinDistance !== null) {
                const d = ssmMinDistance;
                if (d <= 300) sSsm = 100;
                else if (d <= 700) sSsm = 80;
                else if (d <= 1500) sSsm = 50;
              }

              if (largeMartMinDistance !== null) {
                score = Math.min(100, Math.round(sMart * 0.7 + sSsm * 0.3));
              } else {
                score = Math.round(sSsm * 0.7);
              }

              details = {
                largeMartCount,
                largeMartMinDistance,
                ssmCount,
                ssmMinDistance,
                convenienceCount,
                convenienceMinDistance
              };
            } else if (config.code === "SC4") {
              let elementaryCount = 0;
              let elementaryMinDistance: number | null = null;
              let middleCount = 0;
              let middleMinDistance: number | null = null;
              let highCount = 0;
              let highMinDistance: number | null = null;

              docs.forEach((doc: any) => {
                const name = doc.place_name || "";
                const distanceM = parseInt(doc.distance) || 0;

                if (name.includes("초등학교")) {
                  elementaryCount++;
                  if (elementaryMinDistance === null || distanceM < elementaryMinDistance) {
                    elementaryMinDistance = distanceM;
                  }
                } else if (name.includes("중학교")) {
                  middleCount++;
                  if (middleMinDistance === null || distanceM < middleMinDistance) {
                    middleMinDistance = distanceM;
                  }
                } else if (name.includes("고등학교")) {
                  highCount++;
                  if (highMinDistance === null || distanceM < highMinDistance) {
                    highMinDistance = distanceM;
                  }
                }
              });

              count = docs.length;
              minDistance = parseInt(docs[0].distance) || null;
              score = calculateCategoryScore(config.code, minDistance, count);

              details = {
                elementaryCount,
                elementaryMinDistance,
                middleCount,
                middleMinDistance,
                highCount,
                highMinDistance
              };
            } else {
              count = docs.length;
              minDistance = parseInt(docs[0].distance) || null;
              score = calculateCategoryScore(config.code, minDistance, count);
            }
          }
        }
      } catch (catErr) {
        log.warn(`[Geocoding] 카테고리(${config.code}) 조회 실패:`, catErr);
      }

      categories[config.code] = {
        name: config.name,
        score,
        count,
        minDistance,
        details
      };

      weightedScoreSum += score * config.weight;
      weightSum += config.weight;
    }

    // 주차 쾌적도 (PKG) 가산 (가중치 1.2)
    const pkgScoreInfo = calculateParkingScore(parkingPerHousehold);
    categories["PKG"] = {
      name: "주차환경",
      score: pkgScoreInfo.score,
      count: 1,
      minDistance: null,
      details: {
        parkingPerHousehold: parkingPerHousehold ?? null,
        status: pkgScoreInfo.label
      }
    };
    weightedScoreSum += pkgScoreInfo.score * 1.2;
    weightSum += 1.2;

    const baseScore = Math.round((weightedScoreSum / weightSum) * 10) / 10;

    // 자연환경 (NAT) 평가
    const natResult = await fetchNaturalEnvRating(lat, lng, apiKey);
    categories["NAT"] = {
      name: "조망/환경",
      score: natResult.score,
      count: natResult.count,
      minDistance: natResult.minDistance,
      details: natResult.details
    };

    const bonus = Math.round((natResult.score / 10) * 10) / 10;
    const totalScore = Math.min(100, Math.round((baseScore + bonus) * 10) / 10);

    let grade = "D";
    if (totalScore >= 90) grade = "S";
    else if (totalScore >= 80) grade = "A";
    else if (totalScore >= 70) grade = "B";
    else if (totalScore >= 60) grade = "C";

    const result = {
      totalScore,
      grade,
      categories,
      isMock: false
    };

    nearbyInfraCache.set(cacheKey, result);
    return result;

  } catch (err) {
    log.error(`[Geocoding] 입지 분석 실패 (${lat}, ${lng}), Mock 폴백 사용:`, err);
    return generateMockInfraRating(complexName);
  }
}
