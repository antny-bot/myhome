/**
 * ComplexTab.tsx (하위 호환 배럴 re-export)
 *
 * 상세 모듈은 pages/graph/ComplexTab/ 하위에 분할되어 있습니다:
 * - useComplexData.ts: 단지 상세 데이터/KPI 훅
 * - ComplexHeaderCard.tsx: 단지 기본 정보, 스펙, 입지 등급 배지 및 평형 선택
 * - InfraScoreSection.tsx: 6대 인프라 평가 및 카카오 지도
 * - ComplexChartsSection.tsx: 월별 시계열 및 층별 분포 차트
 * - ComplexRecentTradesTable.tsx: 최근 실거래 목록 표
 * - InfraModal.tsx: 입지 평가 산출 기준 설명 모달
 * - index.tsx: 통합 탭 조립 컴포넌트
 */

export { default, ComplexTab } from "./ComplexTab/index.js";
export * from "./ComplexTab/types.js";
