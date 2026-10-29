import { createLogger } from "@myhome/shared";

const log = createLogger("Geocoding:NAT");

export interface NaturalEnvResult {
  score: number;
  count: number;
  minDistance: number | null;
  details: {
    waterMinDistance: number | null;
    waterType: string | null;
    greenMinDistance: number | null;
    greenType: string | null;
  } | null;
}

/**
 * 특정 좌표 반경 1km 내 하천, 공원, 호수 등 자연환경(NAT) 분석
 */
export async function fetchNaturalEnvRating(
  lat: number,
  lng: number,
  apiKey: string
): Promise<NaturalEnvResult> {
  const natQueries = [
    `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=AT4&x=${lng}&y=${lat}&radius=1000&sort=distance`,
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent("하천")}&x=${lng}&y=${lat}&radius=1000&sort=distance`,
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent("공원")}&x=${lng}&y=${lat}&radius=1000&sort=distance`,
    `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent("호수")}&x=${lng}&y=${lat}&radius=1000&sort=distance`
  ];

  let natScore = 0;
  let natCount = 0;
  let natMinDistance: number | null = null;
  let natDetails: NaturalEnvResult["details"] = null;

  try {
    const responses = await Promise.all(
      natQueries.map((q) =>
        fetch(q, {
          headers: { Authorization: `KakaoAK ${apiKey}` },
          signal: AbortSignal.timeout(5000)
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    let natDocs: any[] = [];
    responses.forEach((body) => {
      if (body && body.documents) {
        natDocs.push(...body.documents);
      }
    });

    // 중복 장소 제거 (id 기준)
    const seen = new Set();
    natDocs = natDocs.filter((doc) => {
      const duplicate = seen.has(doc.id);
      seen.add(doc.id);
      return !duplicate;
    });

    // 거리 기준 오름차순 정렬
    natDocs.sort((a, b) => (parseInt(a.distance) || 0) - (parseInt(b.distance) || 0));

    if (natDocs.length > 0) {
      let waterMinDistance: number | null = null;
      let waterType: string | null = null;
      let greenMinDistance: number | null = null;
      let greenType: string | null = null;
      let waterCount = 0;
      let greenCount = 0;

      natDocs.forEach((doc: any) => {
        const cat = doc.category_name || "";
        const name = doc.place_name || "";
        const dist = parseInt(doc.distance) || 0;

        if (cat.includes("해수욕장") || name.includes("해수욕장") || name.includes("해변")) {
          waterCount++;
          if (waterMinDistance === null || dist < waterMinDistance) {
            waterMinDistance = dist;
            waterType = "OCEAN";
          }
        } else if (cat.includes("호수") || cat.includes("저수지") || name.includes("호수공원")) {
          waterCount++;
          if (waterMinDistance === null || dist < waterMinDistance) {
            waterMinDistance = dist;
            waterType = "LAKE";
          }
        } else if (cat.includes("강") || cat.includes("계곡") || name.endsWith("강") || name.endsWith("천") || name.endsWith("하천") || name.includes("강변")) {
          waterCount++;
          if (waterMinDistance === null || dist < waterMinDistance) {
            waterMinDistance = dist;
            waterType = "RIVER";
          }
        } else if (cat.includes("공원") || cat.includes("산") || cat.includes("수목원") || cat.includes("자연") || name.includes("공원") || name.includes("수목원") || name.endsWith("산")) {
          greenCount++;
          if (greenMinDistance === null || dist < greenMinDistance) {
            greenMinDistance = dist;
            greenType = cat.includes("산") || name.endsWith("산") ? "FOREST" : "PARK";
          }
        }
      });

      natCount = waterCount + greenCount;
      natMinDistance = natCount > 0 ? (waterMinDistance !== null && greenMinDistance !== null ? Math.min(waterMinDistance, greenMinDistance) : waterMinDistance ?? greenMinDistance) : null;

      let sWater = 0;
      if (waterMinDistance !== null) {
        const d = waterMinDistance;
        let baseVal = 0;
        if (d <= 250) baseVal = 100;
        else if (d <= 500) baseVal = 85;
        else if (d <= 1000) baseVal = 60;

        const typeWeight = waterType === "OCEAN" ? 1.2 : waterType === "RIVER" ? 1.1 : waterType === "LAKE" ? 1.0 : 0.8;
        sWater = Math.min(100, Math.round(baseVal * typeWeight));
      }

      let sGreen = 0;
      if (greenMinDistance !== null) {
        const d = greenMinDistance;
        let baseVal = 0;
        if (d <= 250) baseVal = 100;
        else if (d <= 500) baseVal = 85;
        else if (d <= 1000) baseVal = 60;

        const typeWeight = greenType === "PARK" ? 1.0 : 0.9;
        sGreen = Math.min(100, Math.round(baseVal * typeWeight));
      }

      natScore = Math.max(sWater, sGreen);
      natDetails = {
        waterMinDistance,
        waterType,
        greenMinDistance,
        greenType
      };
    }
  } catch (err) {
    log.error("[Geocoding] NAT 병렬 수집 중 에러 발생:", err);
  }

  return {
    score: natScore,
    count: natCount,
    minDistance: natMinDistance,
    details: natDetails
  };
}
