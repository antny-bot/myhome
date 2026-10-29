/**
 * NearbyStationTab.tsx (하위 호환 배럴 re-export)
 *
 * 상세 모듈은 pages/graph/NearbyStationTab/ 하위에 분할되어 있습니다:
 * - useNearbyStationData.ts: 역세권 데이터/지오코딩 훅
 * - StationSearchCard.tsx: 역 검색 및 반경/캐싱 설정
 * - StationComplexList.tsx: 반경 내 단지 목록 및 온디맨드 수집
 * - StationMapView.tsx: 카카오 맵 및 지시선/오버레이 렌더링
 * - stationHistory.ts: 최근 검색어 localStorage 관리
 * - index.tsx: 통합 탭 조립 컴포넌트
 */

export { default, NearbyStationTab } from "./NearbyStationTab/index.js";
export * from "./NearbyStationTab/types.js";
