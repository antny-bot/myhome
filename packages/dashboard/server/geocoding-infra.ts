/**
 * geocoding-infra.ts — 단지 주변 입지 평가 엔진 (배럴 re-export)
 *
 * 세부 책임별 모듈:
 * - infra/scoreCalculator.ts: 카테고리별 거리/개수 기반 평점 및 주차 점수 계산
 * - infra/mockInfra.ts: API 키 미설정 또는 좌표 누락 시 해시 기반 Mock 생성
 * - infra/naturalEnv.ts: 하천, 공원, 호수 등 자연환경(NAT) 분석
 * - infra/infraRating.ts: 카카오 API 기반 종합 입지 평점 산출 및 캐싱
 */

export * from "./infra/scoreCalculator.js";
export * from "./infra/mockInfra.js";
export * from "./infra/naturalEnv.js";
export * from "./infra/infraRating.js";
