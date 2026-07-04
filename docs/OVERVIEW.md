# myhome 프로젝트 개요

> **아파트 알림 서비스 (Apartment Alert)** — MCP를 통한 매물 정보 조회 및 알림 자동화 + Neo4j 그래프 분석 대시보드 (v0.2.0)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Node.js (Express), TypeScript |
| 프론트엔드 | React (v19) + TypeScript + Vite + Tailwind CSS |
| 그래프 DB | Neo4j Aura (Free Tier), `neo4j-driver` v6 |
| 시각화 | Recharts (차트), react-force-graph-2d (노드-링크) |
| 런타임 | `tsx` (Server), `Vite` (Web) |
| 빌드 | `npm run build` (workspaces 순차 빌드) |
| 실행 | `npm run dev` (Dashboard Backend/Frontend 동시 실행) |
| 외부 연동 | MCP (Model Context Protocol) via `mcporter`, Telegram Bot API |
| 패키지 관리 | npm workspaces (모노레포) |
| 배포 | Synology NAS (Dashboard Docker), Oracle Free Tier (Collector + 기존 Bot) |

## 디렉토리 구조

```
myhome/                            ← 모노레포 루트
├── package.json                   ← workspaces 정의
├── tsconfig.base.json             ← 공통 TS 설정
├── AGENTS.md / GEMINI.md          ← AI 에이전트 규칙
├── docs/                          ← 프로젝트 문서
│   ├── OVERVIEW.md                ← 이 파일
│   ├── ROADMAP.md                 ← 전체 Phase 로드맵
│   ├── DESIGN.md                  ← UI/UX 디자인 가이드라인
│   ├── features/                  ← 기능별 상세 문서
│   └── superpowers/               ← 기능 설계 및 구현 계획
│
├── packages/
│   ├── shared/                    ← @myhome/shared 공통 모듈
│   │   └── src/
│   │       ├── index.ts           ← barrel export
│   │       ├── graphDb.ts         ← Neo4j 클라이언트 (드라이버, 쿼리 함수)
│   │       ├── types.ts           ← 공통 타입 (TransactionNode, RegionInfo 등)
│   │       └── utils.ts           ← dedupeKey 생성 등 유틸
│   │
│   ├── collector/                 ← @myhome/collector 데이터 수집 봇
│   │   ├── Dockerfile             ← Oracle VM용 경량 이미지
│   │   ├── config/
│   │   │   └── targets.json       ← 수동 수집 대상 지역 목록
│   │   └── src/
│   │       ├── index.ts           ← 엔트리 + 크론 스케줄러
│   │       ├── config.ts          ← 수집 대상 설정 로드
│   │       ├── fetcher.ts         ← MCP/직접 API 데이터 수집
│   │       └── collector.ts       ← 수집 → Neo4j upsert 파이프라인
│   │
│   └── dashboard/                 ← @myhome/dashboard 웹 대시보드
│       ├── Dockerfile             ← Synology Docker용
│       ├── docker-compose.yml     ← Docker Compose 설정
│       ├── vite.config.ts         ← Vite 설정 (프록시 포함)
│       ├── index.html             ← HTML 엔트리
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── server/                ← Express 백엔드
│       │   ├── index.ts           ← 서버 엔트리 + 스케줄러
│       │   ├── routes.ts          ← REST API 라우팅
│       │   ├── routes-graph.ts    ← 그래프 분석 API
│       │   ├── mcpClient.ts       ← MCP 서버 연동
│       │   ├── addressSearch.ts   ← 카카오 주소 검색
│       │   ├── ruleEngine.ts      ← 매물 매칭 + 중복 방지
│       │   ├── scheduler.ts       ← 주기적 매물 확인
│       │   ├── notifications.ts   ← Telegram/Kakao 알림
│       │   ├── storage.ts         ← JSON 파일 기반 저장소
│       │   ├── graphPresets.ts    ← 조회 프리셋 CRUD
│       │   ├── graphInsights.ts   ← LLM 인사이트 CRUD
│       │   └── types.ts           ← 백엔드 도메인 타입
│       ├── src/                   ← React 프론트엔드
│       │   ├── main.tsx           ← 엔트리
│       │   ├── App.tsx            ← 메인 UI + 뷰 라우팅
│       │   ├── api.ts             ← API 클라이언트
│       │   ├── types.ts           ← 프론트엔드 타입
│       │   ├── styles.css         ← Tailwind + 전역 스타일
│       │   ├── components/        ← 공통 컴포넌트
│       │   ├── pages/             ← 페이지 컴포넌트
│       │   │   ├── Dashboard.tsx  ← 홈 대시보드
│       │   │   ├── Rules.tsx      ← 알림 규칙 관리
│       │   │   ├── ExploreV2.tsx  ← 실거래 탐색
│       │   │   ├── Settings.tsx   ← 환경 설정
│       │   │   ├── GraphDashboard.tsx  ← 그래프 분석 메인
│       │   │   └── graph/         ← 그래프 분석 서브 컴포넌트
│       │   │       ├── FilterPanel.tsx     ← 필터 + 프리셋
│       │   │       ├── OverviewTab.tsx     ← Overview 탭
│       │   │       ├── ComplexTab.tsx      ← 단지 분석 탭
│       │   │       ├── DrilldownTab.tsx    ← 드릴다운 탭
│       │   │       ├── GraphViewTab.tsx    ← 그래프 뷰 탭
│       │   │       ├── InsightTab.tsx      ← 인사이트 탭
│       │   │       └── PromptTemplates.ts  ← LLM 프롬프트 템플릿
│       │   ├── lib/               ← 유틸리티
│       │   └── locales/           ← i18n (ko.ts)
│       └── data/                  ← 상태/프리셋/인사이트 JSON
```

## 핵심 구현 패턴

**모노레포 (npm workspaces)**:
- `@myhome/shared`: Neo4j 클라이언트와 공통 타입을 공유하여 collector와 dashboard가 동일한 코드로 DB 접근
- `@myhome/collector`: 경량 데이터 수집 전용, Oracle Free Tier에서 크론 실행
- `@myhome/dashboard`: Express 서버 + React SPA, Synology NAS에서 Docker 실행

**백엔드 (Express)**:
- `mcporter` CLI를 사용하여 MCP 서버와 통신하며 국토교통부 아파트 실거래가 정보를 가져옵니다.
- `scheduler`가 설정된 주기에 따라 `ruleEngine`을 가동하여 매칭되는 매물을 찾습니다.
- 매칭된 매물은 `notifications`를 통해 Telegram 등으로 전송됩니다.
- `@myhome/shared`의 `upsertTransaction()`으로 Neo4j에 적재됩니다.

**프론트엔드 (React)**:
- Vite 프록시 설정을 통해 `/api` 요청을 백엔드로 전달합니다.
- Tailwind CSS를 사용한 유틸리티 중심의 반응형 대시보드를 제공합니다.
- **그래프 분석 대시보드**: 5개 탭 (Overview, 단지 분석, 드릴다운, 그래프 뷰, 인사이트)
- Recharts로 시계열 차트, react-force-graph-2d로 노드-링크 시각화

**데이터 관리**:
- Neo4j Aura (클라우드): Region → Complex → Transaction 그래프 영구 저장
- `data/app-state.json`: 규칙, 이력 등 앱 상태
- `data/graph-presets.json`: 그래프 조회 프리셋
- `data/insights.json`: LLM 인사이트 이력

## 작업 유형별 필독 파일

| 작업 유형 | 필독 파일 |
|-----------|-----------|
| 전체 로드맵·Phase 파악 | `docs/ROADMAP.md` |
| 구현된 기능 수정/이해 | `docs/features/README.md` (인덱스) → 해당 기능 문서 1개만 |
| 지역 검색/주소 자동완성 | `docs/features/region-search.md` |
| 서버 API/로직 수정 | `packages/dashboard/server/` 내 관련 파일 |
| MCP 연동/데이터 조회 | `packages/dashboard/server/mcpClient.ts` |
| 대시보드 UI/UX 수정 | `packages/dashboard/src/App.tsx`, `docs/DESIGN.md` |
| 그래프 분석 대시보드 | `packages/dashboard/src/pages/GraphDashboard.tsx`, `packages/dashboard/src/pages/graph/` |
| Neo4j 클라이언트 | `packages/shared/src/graphDb.ts` |
| 데이터 수집 봇 | `packages/collector/src/` |
| 신규 기능 추가 계획 | `docs/ROADMAP.md` |
| Docker 배포 | `packages/dashboard/Dockerfile`, `packages/dashboard/docker-compose.yml` |

## 개발 현황 요약

- **Phase 1~6** (스캐폴드 → 대시보드) 완료 ✓
- **Phase 7A** (모노레포 전환 + shared 추출) 진행 예정 🔜
- **Phase 7B** (그래프 DB 분석 대시보드 5탭) 진행 예정 🔜
- **Phase 7C** (Collector 봇 + Docker 배포) 진행 예정 🔜
- **Phase 8** (LLM API 직접 연동) 계획 📋
- **Phase 9** (MCP 서버) 계획 📋
- 구현된 기능별 상세: `docs/features/README.md`
- 전체 로드맵: `docs/ROADMAP.md`
