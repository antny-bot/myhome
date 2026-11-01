# [03] 백엔드 서버 & 알림 수집 스케줄러 (Backend & Scheduler)

Express 백엔드 서버, 매물 감시 룰 엔진, 일일 자동 수집 스케줄러 통합 구동 스펙.

## 1. 서버 엔트리 및 포트 결정 우선순위

- **엔트리**: `packages/dashboard/server/index.ts`
- **설정 주입**: `.env` 및 `config.yaml`
- **포트 결정 순서**:
  1. `process.env.PORT`
  2. `.env`의 `PORT`
  3. `config.yaml`의 `port`
  4. 기본값 `4174`

## 2. 룰 엔진 (Rule Engine)

- **위치**: `packages/dashboard/server/ruleEngine.ts`
- **역할**: 사용자 등록 감시 조건(지역, 단지, 가격, 면적)과 신규 실거래 비교.
- **동작**:
  - `runRuleCheck()`: 국토부 API 실거래 조회, 조건 매칭 필터링.
  - 조건 일치 시 `notifications.ts` 경유 **Telegram 알림 발송** 및 DB 적재.

## 3. 통합 스케줄러 (Scheduler)

- **위치**: `packages/dashboard/server/scheduler.ts`
- **타임존**: `Asia/Seoul` (UTC+9) 강제 (`server/utils/kstTime.ts`).
- **주기별 동작**:
  1. **감시 스케줄러 (300초)**: 활성 룰(`rules`) 대상 `isAlertDue` 검사 → `runRuleCheck` 실행.
  2. **일일 자동 수집 (매일 1회, KST 06:00 이후)**:
     - `CollectorLock` 인메모리 락으로 중복 실행 방지.
     - `system_config` 내 `collector.lastSuccessDate` 영속화로 당일 중복 수집 차단.
     - 등록 지역 대상 `@myhome/collector` `runCollector` 실행, SQLite DB 대량 적재.

## 4. 로컬 빌드 및 실행

```powershell
# 의존성 설치
npm install

# 전체 패키지 빌드 (workspaces 순차 빌드)
npm run build

# 프론트엔드 + 백엔드 동시 개발 기동 (스케줄러 자동 가동)
npm run dev
```

- 웹 대시보드: `http://127.0.0.1:5174` (Vite)
- 백엔드 API: `http://127.0.0.1:4174` (Express)

## 5. 환경 변수 사양 (.env)

| 변수명 | 기본값 | 필수 | 설명 |
|---|---|---|---|
| `PORT` | `4174` | N | 서버 바인드 포트 (`config.yaml`보다 우선) |
| `HOST` | `0.0.0.0` | N | 서버 바인드 호스트 |
| `CHECK_INTERVAL_SECONDS` | `300` | N | 룰 감시 실행 주기(초) |
| `GRAPH_DB_ENABLED` | `true` | Y | SQLite 실거래 적재 활성화 플래그 |
| `DATA_GO_KR_API_KEY` | — | Y | 공공데이터포털 국토부 실거래가 API 일반 인증키 |
| `KAKAO_REST_API_KEY` | — | N | 카카오 Local REST API 키 (주소 검색 및 백엔드 지오코딩) |
| `KAKAO_JAVASCRIPT_KEY` | — | N | 카카오 지도 JS SDK 키 (웹 프론트 지도 시각화) |
| `JUSO_CONFM_KEY` | — | N | 행정안전부 도로명주소 API 키 (카카오 폴백용) |
| `TELEGRAM_BOT_TOKEN` | — | N | Telegram 알림 봇 토큰 |
| `TELEGRAM_CHAT_ID` | — | N | Telegram 알림 수신 대상 채팅 ID |
| `GEMINI_API_KEY` | — | N | Google Gemini API 키 (AI 인사이트 요약) |
| `GOOGLE_CLIENT_ID` | — | Y* | Google OAuth 2.0 Client ID (*미설정 시 Bootstrap 모드 필요) |
| `GOOGLE_CLIENT_SECRET` | — | Y* | Google OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | — | Y* | Google OAuth 콜백 URI (`http://localhost:4174/api/auth/google/callback`) |
| `ALLOWED_EMAILS` | — | N | 대시보드 접근 허용 구글 계정 이메일 (쉼표 구분) |
| `ENABLE_BOOTSTRAP_ADMIN` | `false` | N | Google OAuth 미설정 시 임시 관리자 세션 허용 (개발 전용) |
