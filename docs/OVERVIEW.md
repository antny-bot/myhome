# myhome 프로젝트 개요

> **아파트 알림 서비스 (Apartment Alert)** — 국토부 오픈 API 직접 호출 및 알림 자동화 + SQLite 실거래 분석 대시보드 (v0.3.0)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Node.js (v24), Express, TypeScript |
| 프론트엔드 | React (v19) + TypeScript + Vite + Tailwind CSS |
| 로컬 DB | SQLite (Node.js 내장 `node:sqlite` 활용) |
| 시각화 | Recharts (시계열 차트 및 통계 분석) |
| 런타임 | `tsx` (Server), `Vite` (Web) |
| 빌드 | `npm run build` (workspaces 순차 빌드) |
| 실행 | `npm run dev` (Dashboard Backend/Frontend 동시 실행 + 수집 스케줄러 내장) |
| 외부 연동 | 국토교통부 아파트매매 실거래 상세 자료 API, Telegram Bot API, PlayMCP `mcp-gateway` (지역코드 및 단지 보조) |
| 배포 | Synology Container Manager (Docker Compose), Docker |
| CI/CD | GitHub Actions (Release 트리거 GHCR 이미지 생성 / 주간 10개 버전 자동 관리) |
| 패키지 관리 | npm workspaces (모노레포) |

## 디렉토리 구조

```
myhome/                            ← 모노레포 루트
├── package.json                   ← workspaces 정의
├── tsconfig.base.json             ← 공통 TS 설정
├── AGENTS.md / GEMINI.md          ← AI 에이전트 규칙
├── Dockerfile                     ← Docker 패키징 설정
├── docker-compose.yml             ← Synology / 로컬 배포용 템플릿
├── config.yaml                    ← 수동 가동 포트 지정 파일
├── .github/                       ← GitHub Actions 워크플로우 설정
│   └── workflows/
│       ├── docker-release.yml     ← 릴리즈 시 GHCR 빌드/푸시
│       └── cleanup-ghcr.yml       ← 매주 월요일 오래된 이미지 삭제 (10개 보존)
├── docs/                          ← 프로젝트 문서
│   ├── OVERVIEW.md                ← 이 파일
│   ├── ROADMAP.md                 ← 전체 Phase 로드맵
│   └── DESIGN.md                  ← UI/UX 디자인 가이드라인
│
├── packages/
│   ├── shared/                    ← @myhome/shared 공통 모듈
│   │   └── src/
│   │       ├── index.ts           ← barrel export
│   │       ├── db.ts              ← SQLite 클라이언트 (테이블 초기화, 트랜잭션, SQL 집계 함수)
│   │       ├── apiClient.ts       ← 국토부 API 직접 fetch 및 정규화(normalizeTransaction)
│   │       ├── xmlParser.ts       ← fast-xml-parser 기반 공공데이터 XML 파서
│   │       ├── types.ts           ← 공통 타입 (TransactionNode, RegionInfo 등)
│   │       └── utils.ts           ← 유틸리티
│   │
│   ├── collector/                 ← @myhome/collector 데이터 수집 라이브러리
│   │   └── src/
│   │       ├── index.ts           ← 수집 엔트리 및 runCollector() export
│   │       └── fetcher.ts         ← @myhome/shared apiClient 재수출 (하위 호환)
│   │
│   └── dashboard/                 ← @myhome/dashboard 웹 대시보드
│       ├── vite.config.ts         ← Vite 설정
│       ├── index.html             ← HTML 엔트리
│       ├── server/                ← Express 백엔드
│       │   ├── index.ts           ← 서버 엔트리 + SQLite 초기화 연동
│       │   ├── routes.ts          ← 기본 REST API 라우팅 (rules, check-runs 등)
│       │   ├── routes-graph.ts    ← SQLite 실거래 분석 및 통계 API
│       │   ├── mcpClient.ts       ← 카카오/PlayMCP 연동 및 국토부 fetch 통합
│       │   ├── scheduler.ts       ← 주기적 매물 룰 감시 + 매일 새벽 수집 스케줄러 통합
│       │   ├── ruleEngine.ts      ← 매물 매칭 + SQLite upsert
│       │   ├── storage.ts         ← JSON 파일 기반 상태 저장소 (Rules)
│       │   ├── graphPresets.ts    ← 조회 프리셋 CRUD
│       │   └── graphInsights.ts   ← LLM 인사이트 CRUD
│       └── src/                   ← React 프론트엔드
│           ├── main.tsx           ← 엔트리
│           ├── App.tsx            ← 메인 UI + 뷰 라우팅
│           ├── components/        ← 공통 컴포넌트
│           └── pages/             ← 페이지 컴포넌트
│               ├── Dashboard.tsx  ← 홈 대시보드
│               ├── ExploreV2.tsx  ← 실거래 탐색
│               └── GraphDashboard.tsx  ← 4탭 실거래 분석 메인 대시보드
```

## 핵심 구현 패턴

**모노레포 (npm workspaces)**:
- `@myhome/shared`: SQLite 커넥션, XML 파서, 국토부 API 직접 fetch 및 공통 타입을 공유하여 collector와 dashboard가 코드 중복 없이 깔끔하게 재사용합니다.
- `@myhome/collector`: 경량 데이터 수집 코드로써, 대시보드 서버 내에 라이브러리 형태로 탑재되어 작동합니다.
- `@myhome/dashboard`: Express 백엔드와 React 프론트엔드가 포함되어 있으며, 백엔드 기동 시 수집 스케줄러가 함께 루프를 돕니다.

**백엔드 (Express)**:
- `scheduler.ts`가 매 300초 간격으로 `ruleEngine`을 구동하여 텔레그램 알림을 발송하며, 매일 새벽 6시 이후에 1회 자동으로 `@myhome/collector`의 `runCollector`를 호출하여 로컬 SQLite DB에 실거래 적재 파이프라인을 기동합니다.
- `routes-graph.ts`는 로컬 SQLite DB 파일(`data/myhome.db`)에 대해 SQL 집계 함수(`AVG`, `COUNT`, `Window Function` 등)를 수행하여 대시보드 분석 데이터를 고속으로 제공합니다.

**프론트엔드 (React)**:
- Recharts를 활용하여 시계열 차트와 층수 분포, 면적대별 분석을 직관적인 그래프로 제공합니다.
- **분석 대시보드 4탭**: 종합 현황, 단지별 분석, 드릴다운, 💡 AI 인사이트로 구성됩니다.

---

## 작업 유형별 필독 파일

| 작업 유형 | 필독 파일 |
|-----------|-----------|
| 전체 로드맵·Phase 파악 | `docs/ROADMAP.md` |
| SQLite 클라이언트 / DDL / 집계 SQL | `packages/shared/src/db.ts` |
| 국토부 오픈 API 직접 호출 / 정규화 | `packages/shared/src/apiClient.ts` |
| XML 응답 파싱 유틸 | `packages/shared/src/xmlParser.ts` |
| 백엔드 스케줄러 및 자동 수집 제어 | `packages/dashboard/server/scheduler.ts` |
| 대시보드 분석 API 및 라우팅 | `packages/dashboard/server/routes-graph.ts` |
| 대시보드 분석 UI/UX 수정 | `packages/dashboard/src/pages/GraphDashboard.tsx` |

---

## 개발 현황 요약

- **Phase 1~6** (알림, 대시보드 기초) 완료 ✓
- **Phase 7A** (모노레포 전환 및 shared 추출) 완료 ✓
- **Phase 7B** (분석 대시보드 4탭 및 SQLite 집계 쿼리 연동) 완료 ✓
- **Phase 7C** (통합 수집 스케줄러 및 data/myhome.db 구축) 완료 ✓
- **Phase 8** (직접 LLM API 연동 및 인사이트 자동화) 계획 📋
- **Phase 9** (MCP 서버 - SQLite 데이터 노출) 계획 📋
