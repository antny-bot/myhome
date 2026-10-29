/**
 * api.ts — 프론트엔드 API 클라이언트 배럴 re-export
 *
 * 세부 도메인별 모듈:
 * - api/http.ts: fetch 래퍼, ApiError 클래스 및 401/JSON 파싱
 * - api/auth.ts: 세션, 로그인, 계정 및 유저 설정
 * - api/rules.ts: 알림 감시 규칙, 체크 실행, 실거래 검색
 * - api/graph.ts: 그래프 통계, 단지 추이, 프리셋, 인사이트, 지오코딩
 * - api/admin.ts: 관리자 SQL 콘솔, 시스템 설정, 수집 및 활동 로그
 */

export * from "./api/index.js";
