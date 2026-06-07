import type { RegionCodeResult } from "./types.js";

const KAKAO_ADDRESS_URL = "https://dapi.kakao.com/v2/local/search/address.json";

export function isKakaoConfigured(): boolean {
  return Boolean(process.env.KAKAO_REST_API_KEY);
}

type KakaoAddressDocument = {
  address_name?: string;
  address?: {
    address_name?: string;
    b_code?: string;
    region_1depth_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
  } | null;
};

type KakaoAddressResponse = {
  documents?: KakaoAddressDocument[];
};

/**
 * 카카오 Local 주소 검색 API로 입력어에 해당하는 여러 후보를 반환한다.
 * 응답의 법정동코드(b_code) 앞 5자리가 실거래가 API의 lawd_cd와 동일하다.
 */
export async function searchAddresses(query: string): Promise<RegionCodeResult[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    throw new Error("KAKAO_REST_API_KEY가 설정되지 않았습니다.");
  }

  const url = `${KAKAO_ADDRESS_URL}?query=${encodeURIComponent(query)}&size=10`;
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` }
  });

  if (!response.ok) {
    throw new Error(`카카오 주소 검색 실패 (${response.status})`);
  }

  const body = (await response.json()) as KakaoAddressResponse;
  const documents = body.documents ?? [];

  const results: RegionCodeResult[] = [];
  const seen = new Set<string>();
  for (const doc of documents) {
    const bCode = doc.address?.b_code;
    if (!bCode || bCode.length < 5) continue;
    const lawdCode = bCode.slice(0, 5);
    if (seen.has(lawdCode)) continue;

    const region1 = doc.address?.region_1depth_name;
    const region2 = doc.address?.region_2depth_name;
    const displayName =
      region1 && region2
        ? `${region1} ${region2}`
        : doc.address_name ?? doc.address?.address_name;
    if (!displayName) continue;

    seen.add(lawdCode);
    results.push({ lawdCode, displayName, raw: doc });
  }

  return results;
}
