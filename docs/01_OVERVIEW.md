# [01] myhome 프로젝트 개요

> 아파트 알림 서비스 (Apartment Alert) — 국토부 오픈 API 직접 호출 및 알림 자동화 + SQLite 실거래 분석 대시보드 (v0.3.5)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Node.js (v24), Express, TypeScript |
| 프론트엔드 | React (v19) + TypeScript + Vite + Tailwind CSS |
| 로컬 DB | SQLite (Node.js 내장 `node:sqlite`) |
| 시각화 | Recharts (시계열 차트, BoxPlot) |
| 런타임 | `tsx` (Server), `Vite` (Web) |
| 빌드 | `npm run build` (workspaces 순차 빌드) |
| 실행 | `npm run dev` (Frontend + Backend 동시 기동 + 수집 스케줄러 내장) |
| 외부 연동 | 국토부 아파트매매 실거래 API, Telegram Bot API, 카카오 Local API, 행안부 주소 API, Gemini API |
| 배포 | Docker, Docker Compose (Synology NAS Container Manager) |
| CI/CD | GitHub Actions (Release 트리거 GHCR 빌드/푸시, 10개 버전 유지) |
| 패키지 관리 | npm workspaces (모노레포) |

## 디렉토리 구조

```
myhome/                            ← 모노레포 루트
├── package.json                   ← workspaces 정의
├── tsconfig.base.json             ← 공통 TS 설정
├── AGENTS.md                      ← 에이전트 개발 규칙 및 sitemap
├── Dockerfile                     ← 멀티스테이지 Dockerfile
├── docker-compose.yml             ← Synology / 로컬 배포용 템플릿
├── config.yaml                    ← 수동 가동 포트 지정
├── .github/workflows/             ← CI/CD (docker-release, cleanup-ghcr)
├── docs/                          ← 기술 및 도메인 개발 문서
├── packages/
│   ├── shared/                    ← @myhome/shared 공통 패키지
│   │   └── src/
│   │       ├── db/                ← 도메인별 분할 DB 계층 (8개 도메인)
│   │       │   ├── connection.ts  ← SQLite 연결, Prepared Statement LRU 캐시
│   │       │   ├── schema.ts      ← DDL, 인덱스, FTS5 가상테이블
│   │       │   ├── transactions.ts← 실거래 Upsert, 커서 페이징 검색
│   │       │   ├── analytics.ts   ← 시계열 통계, 드릴다운 집계
│   │       │   ├── regions.ts     ← FTS5 지역/단지 검색, 지도 마커
│   │       │   ├── geocoding.ts   ← 좌표 캐시, 실패 이력
│   │       │   ├── auth.ts        ← 세션, 유저 설정
│   │       │   ├── rules.ts       ← 감시 룰, 체크런, 알림 이력
│   │       │   ├── presets.ts     ← 조회 필터 프리셋
│   │       │   └── activityLogs.ts← 시스템 설정, 활동 로그
│   │       ├── apiClient.ts       ← 국토부 API fetch, 재시도, URL 마스킹
│   │       ├── xmlParser.ts       ← fast-xml-parser 응답 파서
│   │       ├── types.ts           ← 공통 타입
│   │       └── utils.ts           ← 공통 유틸리티
│   ├── collector/                 ← @myhome/collector 수집 라이브러리
│   │   └── src/index.ts           ← 수집 엔트리, runCollector()
│   └── dashboard/                 ← @myhome/dashboard 웹 대시보드
│       ├── vite.config.ts         ← Vite 설정
│       ├── server/                ← Express 백엔드
│       │   ├── app.ts             ← Express 앱 팩토리, 미들웨어
│       │   ├── index.ts           ← 서버 엔트리 + Graceful Shutdown
│       │   ├── routes/            ← 도메인별 Express 라우터
│       │   │   ├── configRoutes.ts← 환경/유저 설정 API
│       │   │   ├── ruleRoutes.ts  ← 감시 룰/알림 API
│       │   │   ├── transactionRoutes.ts ← 실거래/지역 API
│       │   │   ├── logRoutes.ts   ← 감사/활동 로그 API
│       │   │   └── graph/         ← SQLite 분석 서브라우터
│       │   ├── scheduler.ts       ← 룰 감시(300초) + 일일 수집(KST 06:00)
│       │   └── ruleEngine.ts      ← 조건 매칭 + SQLite upsert
│       └── src/                   ← React 프론트엔드
│           ├── main.tsx           ← 엔트리
│           ├── App.tsx            ← 네비게이션 + 뷰 라우팅
│           ├── api/               ← 모듈러 API 클라이언트
│           ├── locales/           ← i18n 리소스 (ko/, en/)
│           ├── components/charts/ ← 공통 Recharts 모듈
│           └── pages/             ← 화면별 페이지 컴포넌트
```

## 핵심 구현 패턴

- **모노레포**: `@myhome/shared`에 DB·API·파서 통합. `collector`와 `dashboard` 간 코드 중복 배제.
- **모듈러 백엔드**: `server/routes/` 도메인 라우터 분할. 단일 파일 비대화 방지.
- **듀얼 스케줄러**: 300초 주기 룰 매칭 알림 + 매일 KST 06:00 1회 대량 수집 파이프라인.
- **SQL 최적화**:
  - `idx_transactions_complex_deal_date` 등 복합 인덱스로 풀 스캔 방지.
  - SARGable 범위 조건(`deal_date >= ? AND deal_date <= ?`)으로 B-Tree 인덱스 스캔 복원.
  - FTS5 접두 검색으로 단지명 고속 색인.
  - SQLite Window Function(`ROW_NUMBER() OVER`) CTE로 N+1 상관 서브쿼리 제거.
- **국토부 API 수집 특성**: 단지 조회 시 소속 시군구(5자리 `LAWD_CD`) 전체 수집·Upsert 적재하여 캐시 히트율 극대화.

## 작업 유형별 필독 파일

| 작업 유형 | 필독 파일 |
|-----------|-----------|
| 전체 로드맵·Phase 파악 | [`docs/06_ROADMAP.md`](file:///e:/apps/myhome/docs/06_ROADMAP.md) |
| 국토부 API 캐싱/수집 정책 | [`docs/02_CACHE_POLICY.md`](file:///e:/apps/myhome/docs/02_CACHE_POLICY.md) |
| 백엔드 스케줄러/설정 | [`docs/03_BACKEND_SCHEDULER.md`](file:///e:/apps/myhome/docs/03_BACKEND_SCHEDULER.md) |
| SQLite 스키마/인덱스/SQL | [`docs/04_DATABASE.md`](file:///e:/apps/myhome/docs/04_DATABASE.md) |
| 프론트엔드 디자인/컴포넌트 | [`docs/05_DESIGN.md`](file:///e:/apps/myhome/docs/05_DESIGN.md) |
| 지역 검색/자동완성 | [`docs/07_REGION_SEARCH.md`](file:///e:/apps/myhome/docs/07_REGION_SEARCH.md) |
| 부동산원 API 연동 | [`docs/08_RONE_API.md`](file:///e:/apps/myhome/docs/08_RONE_API.md) |
| 시스템 아키텍처/API 명세 | [`docs/09_ARCHITECTURE.md`](file:///e:/apps/myhome/docs/09_ARCHITECTURE.md) |
| 건축물대장 API 연동 | [`docs/10_BUILDING_REGISTER_API.md`](file:///e:/apps/myhome/docs/10_BUILDING_REGISTER_API.md) |
| 표준 에러 코드 규격 | [`docs/11_ERROR_CODES.md`](file:///e:/apps/myhome/docs/11_ERROR_CODES.md) |

## 개발 현황 요약

- **Phase 1~6**: 프로젝트 기반, 도메인 타입, JSON 저장소, 알림 스케줄러, 프론트엔드 완료 ✓
- **Phase 7A~7D**: 모노레포 분리, SQLite DB 대시보드, 통합 수집기, Docker CI/CD 완료 ✓
- **Phase 7E~8.5**: 국토부 API 단일화, Gemini AI 연동, 모바일 UI 최적화, 번들 스플리팅 완료 ✓
- **Phase 9+**: MCP 서버 (SQLite 데이터 LLM 연동), 호가/매물 데이터 확장 예정 📋
