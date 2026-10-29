# [02] 국토부 API 캐싱 및 수집 정책 (Cache Policy)

국토교통부 실거래 OpenAPI 호출 트래픽 보존, 대시보드 반응 속도 가속 위해 구현된 **지능형 로컬 DB 캐싱(하이브리드 캐시)** 아키텍처 설명.

---

## 1. 캐싱 개요 및 핵심 기조

국토교통부 아파트 실거래가 API 일일 트래픽 쿼터 제한, 대용량 요청 시 응답 지연 발생 가능. 방지 위해 로컬 SQLite DB(`data/myhome.db`) 수집 데이터 1차 캐시 저장소 활용.

부동산 실거래 신고 규정(계약일 30일 이내 신고)으로 최근 계약 데이터 수시 업데이트됨. 거래 연월 따라 캐시 유효 규칙 차등 적용.

---

## 2. 세부 캐시 적용 규칙 (하이브리드 캐시)

조회 거래 대상 월(`DEAL_YMD`, YYYYMM)과 현재 년월 비교 분기 처리.

### A. 과거 데이터 (거래월 기준 최근 3개월 초과 과거)
- **대상**: 현재 월 기준 3개월 초과 과거 거래월 (예: 현재 2026년 7월일 때 2026년 3월 이전 데이터)
- **규칙**: 30일 신고 기한 종료로 데이터 고정 완료 영역.
- **동작**:
  - 로컬 SQLite DB 해당 지역코드(`LAWD_CD`) 및 거래월 실거래 내역 **1건 이상 존재** 시, 국토부 API 호출 생략(`Cache Hit`) 및 로컬 DB 데이터 즉시 반환.
  - 내역 0건일 때만 국토부 API 최초 호출(`Cache Miss`) 및 SQLite DB 적재.

### B. 최근 데이터 (거래월 기준 최근 3개월 이내)
- **대상**: 현재 월 및 최근 3개월 이내 거래월 (예: 현재 2026년 7월일 때 2026년 5월 ~ 7월 데이터)
- **규칙**: 신규 실거래 신고 실시간 지속 추가 등록 영역.
- **동작**:
  - 로컬 DB 데이터 유무 무관 **무조건 국토부 API 호출**(`Cache Miss/Refresh`) 최신 데이터 반영, 로컬 SQLite 및 그래프 DB 갱신(Upsert).

---

## 3. 중복 적재 방지 및 리소스 최적화

- 로컬 캐시 데이터 직접 조회 시(`Cache Hit`), 해당 지역/월 데이터 전체 적재 완료 상태 의미.
- 캐시 히트 시 백엔드 백그라운드 내 동일 데이터 중복 Upsert(그래프 DB 등) 생략, CPU 및 DB I/O 자원 보호.

---

## 4. 국토부 OpenAPI 클라이언트 호출 안전 정책 (Task A-3)

- **보안 전송(HTTPS)**: `https://apis.data.go.kr/...` 엔드포인트 단일 사용.
- **인증키 인코딩 및 URL 마스킹**:
  - `buildDataGoKrUrl`: 디코딩 키/인코딩 키 모두 자동 대응 (퍼센트 인코딩 중복 방지).
  - `maskUrl`: 에러 로그 및 예외 메시지에 `serviceKey` 값이 유출되지 않도록 `***` 마스킹.
- **예외 처리 및 에러 코드 매핑 (`ApiFetchError`)**:
  - 빈 배열 반환 대신 명시적 예외 throw.
  - `LIMIT_EXCEEDED` (코드 22): 일일 호출 한도 초과 감지 시 즉시 수집 중단 및 다음 주기로 이관.
  - `AUTH_ERROR` (코드 30/31): 서비스키 오류 감지 시 재시도 중단.
  - 5xx 및 네트워크 오류: 최대 3회 지수 백오프(500ms, 1s, 2s) 재시도.
- **자동 페이지네이션**: `numOfRows=1000` 단위로 분할 요청하며, `totalCount > 1000`인 경우 2페이지 이상을 순차 조회하여 전량 수집.
- **수집 실패 수집 및 스케줄러 연동**: 실패 발생 시 수집 실패 내역(`failures`)을 반환하며, 스케줄러는 실패 항목이 존재하면 당일 수집 완료 처리를 유보하고 재시도를 대기.

---

## 5. 관련 코드 위치
- [apiClient.ts](file:///e:/apps/myhome/packages/shared/src/apiClient.ts): 국토부 OpenAPI 클라이언트 구현, 페이지네이션 및 재시도, 마스킹 유틸
- [xmlParser.ts](file:///e:/apps/myhome/packages/shared/src/xmlParser.ts): 국토부 실거래 XML 헤더 및 바디 응답 파서
- [collector/index.ts](file:///e:/apps/myhome/packages/collector/src/index.ts): 국토부 실거래 자동 수집기 및 오류 수집
- [scheduler.ts](file:///e:/apps/myhome/packages/dashboard/server/scheduler.ts): 스케줄러 수집 실행 및 실패 처리
- [routes.ts](file:///e:/apps/myhome/packages/dashboard/server/routes.ts): 캐싱 유효 기간 분기 처리 및 API 우회 로직 구현
- [db.ts](file:///e:/apps/myhome/packages/shared/src/db.ts): `getLocalTransactionsCount` (적재 건수 체크), `getLocalApartmentPrices` (로컬 데이터 질의)
