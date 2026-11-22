/**
 * packages/shared/src/db/analytics.ts
 * 
 * 도메인별 모듈 분리(v0.3.5 이후 아키텍처 규칙):
 * - analytics/helpers.ts: 공통 조건 빌더, 면적/평형/층수 헬퍼, 수집 통계 및 캐시/DB 집계 함수
 * - analytics/priceTrends.ts: 단지별·지역별 시계열 가격/평단가 추이
 * - analytics/complexComparison.ts: 단지 상세정보 및 드릴다운 통계
 * - analytics/marketRanking.ts: 상위 단지 랭킹 및 피벗 요약 매트릭스
 * 
 * 하위 호환을 위해 배럴 형태로 모든 모듈을 re-export합니다.
 */

export * from "./analytics/helpers.js";
export * from "./analytics/priceTrends.js";
export * from "./analytics/complexComparison.js";
export * from "./analytics/marketRanking.js";
