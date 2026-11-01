# [02] 국토부 API 캐싱 및 수집 정책 (Cache Policy)

국토교통부 실거래 OpenAPI 트래픽 쿼터 보호 및 대시보드 응답 가속 목적의 지능형 하이브리드 캐시 정책.

## 1. 하이브리드 캐시 분기 규칙

조회 대상월(`DEAL_YMD`, YYYYMM)과 현재 기준월 비교 분기:

### A. 과거 데이터 (최근 3개월 초과 과거 거래)
- **대상**: 현재 월 기준 3개월 초과 거래월 (예: 현재 7월 기준 3월 이전 데이터).
- **특징**: 30일 신고 기한 종료로 데이터 고정 확정 영역.
- **동작**:
  - 로컬 SQLite DB에 해당 지역(`LAWD_CD`) 및 거래월 데이터 **1건 이상 존재 시**: `Cache Hit` → 외부 API 호출 생략, 로컬 DB 즉시 반환.
  - **0건 존재 시**: `Cache Miss` → 국토부 API 최초 호출 후 SQLite 적재.

### B. 최근 데이터 (최근 3개월 이내 거래)
- **대상**: 현재 월 및 최근 3개월 이내 거래월 (예: 현재 7월 기준 5~7월 데이터).
- **특징**: 30일 신고 유예 규정으로 신규 거래 지속 추가 영역.
- **동작**:
  - 로컬 DB 데이터 유무 무관 **무조건 국토부 API 호출**(`Cache Refresh`).
  - 신규 등록 건 실시간 Upsert 갱신.

## 2. 리소스 최적화 및 중복 적재 방지

- `Cache Hit` 시 해당 지역/월 데이터 전체 적재 완료 상태로 판정.
- 불필요한 백그라운드 재수집 및 중복 Upsert 차단, CPU/디스크 I/O 절감.

## 3. OpenAPI 클라이언트 호출 안전 정책

- **HTTPS 단일 사용**: `https://apis.data.go.kr/...` 강제.
- **키 인코딩 및 URL 마스킹**:
  - `buildDataGoKrUrl`: 디코딩/인코딩 키 자동 대응, 이중 퍼센트 인코딩 차단.
  - `maskUrl`: 에러 로그 출력 시 `serviceKey`를 `***`로 자동 마스킹.
- **예외 처리 및 재시도**:
  - `LIMIT_EXCEEDED` (코드 22): 일일 한도 초과 시 즉시 수집 중단, 다음 주기로 이관.
  - `AUTH_ERROR` (코드 30/31): 서비스키 인증 오류 시 재시도 중단.
  - `5xx / 네트워크 오류`: 최대 3회 지수 백오프(500ms → 1s → 2s) 재시도 후 실패 목록 반환.
- **자동 페이지네이션**: `numOfRows=1000` 단위 요청, `totalCount > 1000`인 경우 전량 순차 수집.
- **스케줄러 실패 제어**: 수집 실패 항목(`failures`) 존재 시 당일 완료 처리 유보, 다음 주기 재시도.

## 4. 관련 코드 위치

- [`apiClient.ts`](file:///e:/apps/myhome/packages/shared/src/apiClient.ts): 국토부 OpenAPI 클라이언트, 페이지네이션, 재시도, URL 마스킹
- [`xmlParser.ts`](file:///e:/apps/myhome/packages/shared/src/xmlParser.ts): fast-xml-parser 응답 파서
- [`collector/index.ts`](file:///e:/apps/myhome/packages/collector/src/index.ts): 국토부 실거래 자동 수집기
- [`scheduler.ts`](file:///e:/apps/myhome/packages/dashboard/server/scheduler.ts): 스케줄러 수집 실행 및 실패 처리
- [`routes.ts`](file:///e:/apps/myhome/packages/dashboard/server/routes.ts): 캐싱 유효 기간 분기 처리
- [`transactions.ts`](file:///e:/apps/myhome/packages/shared/src/db/transactions.ts): `getLocalTransactionsCount`, 실거래 조회
