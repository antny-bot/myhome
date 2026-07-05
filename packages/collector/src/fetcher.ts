// 국토부 오픈 API 직접 연동은 @myhome/shared 패키지의 apiClient.ts에 단일화되어 있습니다.
// collector 패키지는 shared에서 검증된 함수들을 그대로 re-export하여 하위 호환성을 유지합니다.

export { fetchApartmentPricesDirect, normalizeTransaction } from "@myhome/shared";
export type { RawTransaction } from "@myhome/shared";
