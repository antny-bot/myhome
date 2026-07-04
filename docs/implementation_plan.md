# Neo4j 그래프 DB 분석 대시보드 (v2)

> 모노레포 전환 + 데이터 수집 봇 + LLM 인사이트 기능 포함

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────┐
│                    myhome (monorepo)                     │
│                   npm workspaces 기반                    │
├──────────────┬──────────────────┬────────────────────────┤
│ packages/    │ packages/        │ packages/              │
│ shared/      │ collector/       │ dashboard/             │
│              │                  │                        │
│ • Neo4j      │ • 매일 크론      │ • Express + React      │
│   클라이언트 │ • 최근 2달 수집  │ • 그래프 분석 대시보드  │
│ • 공통 타입  │ • MCP 연동       │ • LLM 프롬프트 빌더    │
│ • 유틸리티   │ • 경량 단일 파일  │ • Docker 배포          │
│              │                  │                        │
│              │ 🏠 Oracle Free   │ 🏠 Synology NAS        │
│              │    Tier VM       │    Docker              │
└──────────────┴──────────────────┴────────────────────────┘
                        │                    │
                        └────────┬───────────┘
                                 ▼
                      ☁️ Neo4j Aura (Free Tier)
```

## User Review Required

> [!IMPORTANT]
> **모노레포 전환 방식**: 기존 `myhome/` 루트의 서버/프론트 코드를 `packages/dashboard/`로 이동합니다. 기존 Git 히스토리는 유지됩니다. `graphDb.ts`와 공통 타입은 `packages/shared/`로 추출합니다.

> [!WARNING]
> **기존 코드 이동**: 모노레포 전환 시 기존 `server/`, `src/` 경로가 바뀝니다. 현재 돌리고 있는 서비스가 있다면 배포 경로 업데이트가 필요합니다.

## Open Questions

> [!NOTE]
> **Oracle VM의 기존 봇**: Oracle Free Tier에서 이미 돌리고 있는 봇은 어떤 언어/런타임인가요? collector도 Node.js(tsx)로 구현할 예정인데, Node.js가 설치되어 있나요?

> [!NOTE]
> **Collector의 MCP 접근**: collector가 Oracle VM에서 `mcporter` CLI를 통해 MCP 서버(AptInfo)에 접근해야 합니다. Oracle VM에 `mcporter`가 설치/설정되어 있나요? 아니면 collector에서 직접 국토부 API를 호출하는 방식이 더 나을까요?

> [!NOTE]
> **수집 대상 지역 초기 목록**: 규칙 기반 + 수동 목록 모두 지원하기로 했는데, 수동 목록의 초기 대상 지역이 있나요? (예: 서울 강남구, 서초구 등)

---

## Phase 구분

전체 작업을 3단계로 나눕니다:

| Phase | 내용 | 우선순위 |
|-------|------|----------|
| **A** | 모노레포 전환 + shared 패키지 추출 | 🔴 먼저 |
| **B** | Dashboard에 그래프 분석 페이지 추가 (4탭 + LLM 탭) | 🔴 먼저 |
| **C** | Collector 봇 + Docker 설정 | 🟡 다음 |

> Phase A→B를 먼저 완료하고, C는 이후에 진행합니다.

---

## Phase A: 모노레포 전환

### 최종 디렉토리 구조

```
myhome/
├── package.json              ← 루트 (workspaces 정의)
├── tsconfig.base.json        ← 공통 TS 설정
├── AGENTS.md / GEMINI.md
├── docs/
│
├── packages/
│   ├── shared/               ← 공통 모듈
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts      ← barrel export
│   │       ├── graphDb.ts    ← Neo4j 클라이언트 (기존 server/graphDb.ts 이동)
│   │       ├── types.ts      ← 공통 타입 (TransactionNode, RegionInfo 등)
│   │       └── utils.ts      ← 공통 유틸 (dedupeKey 생성 등)
│   │
│   ├── collector/            ← 데이터 수집 봇
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile        ← Oracle VM용 경량 이미지
│   │   └── src/
│   │       ├── index.ts      ← 엔트리 + 크론 스케줄러
│   │       ├── config.ts     ← 수집 대상 설정 로드
│   │       └── fetcher.ts    ← MCP/직접 API로 데이터 가져오기
│   │
│   └── dashboard/            ← 기존 서버 + 프론트 (이동)
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       ├── Dockerfile        ← Synology Docker용
│       ├── docker-compose.yml
│       ├── index.html
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── server/           ← 기존 server/ 이동
│       ├── src/              ← 기존 src/ 이동
│       ├── public/
│       └── data/
```

### [NEW] 루트 package.json

```json
{
  "name": "myhome",
  "private": true,
  "workspaces": ["packages/shared", "packages/collector", "packages/dashboard"],
  "scripts": {
    "dev": "npm run dev -w packages/dashboard",
    "build": "npm run build -w packages/shared && npm run build -w packages/dashboard",
    "collect": "npm run start -w packages/collector"
  }
}
```

### [NEW] packages/shared/package.json

```json
{
  "name": "@myhome/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc" },
  "dependencies": { "neo4j-driver": "^6.2.0" }
}
```

### 이동 대상 파일

| 원본 | 대상 | 비고 |
|------|------|------|
| `server/graphDb.ts` | `packages/shared/src/graphDb.ts` | Neo4j 클라이언트 추출 |
| `server/types.ts` (공통 부분) | `packages/shared/src/types.ts` | TransactionNode, RegionInfo 등 |
| `server/*` (나머지) | `packages/dashboard/server/` | 기존 서버 코드 |
| `src/*` | `packages/dashboard/src/` | 기존 프론트엔드 |
| `data/` | `packages/dashboard/data/` | 상태 파일 |
| 기타 설정 파일 | `packages/dashboard/` | vite, tailwind 등 |

---

## Phase B: Dashboard 그래프 분석 페이지

### 탭 구성 (5개)

| 탭 | 이름 | 설명 |
|----|------|------|
| 1 | **Overview** | 전체 현황 KPI + 지역별/월별 가격 트렌드 + 거래량 추이 |
| 2 | **단지 분석** | 특정 아파트 단지 → 평수별 가격 추이, 층별 분포, 최근 거래 |
| 3 | **드릴다운** | 도시 → 지역 → 단지 → 평수 계층 탐색 + 시계열 |
| 4 | **그래프 뷰** | Node-Link 다이어그램 (인터랙티브) |
| 5 | **💡 인사이트** | LLM 프롬프트 빌더 + 분석 결과 관리 |

---

### 탭 5: 인사이트 (LLM 프롬프트 빌더) — 신규

```
┌─────────────────────────────────────────────┐
│ 💡 인사이트 분석                              │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ 데이터 컨텍스트 자동 생성 ──────────────┐ │
│ │ 현재 필터 기반으로 Neo4j 데이터를        │ │
│ │ 요약하여 프롬프트에 포함                 │ │
│ │                                         │ │
│ │ ✅ 거래 통계 (건수, 평균가, 중위가)      │ │
│ │ ✅ 월별 추이 데이터                      │ │
│ │ ✅ 지역/단지 비교 데이터                 │ │
│ │ ☐ 원본 거래 내역 (최근 N건)             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ 프롬프트 템플릿 ───────────────────────┐ │
│ │ [가격 추세 분석] [투자 적정성 평가]      │ │
│ │ [지역 비교 분석] [이상 거래 탐지]        │ │
│ │ [커스텀 프롬프트 작성]                   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ 생성된 프롬프트 ───────────────────────┐ │
│ │ 아래 데이터를 바탕으로 강남구 아파트     │ │
│ │ 실거래가 추세를 분석해주세요...          │ │
│ │                                         │ │
│ │ [📋 복사] [✏️ 편집] [💾 저장]            │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ 분석 결과 (붙여넣기 or API) ───────────┐ │
│ │ LLM 응답을 여기에 붙여넣으세요...       │ │
│ │                                         │ │
│ │ [💾 결과 저장] [📊 차트 추출]            │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ 저장된 인사이트 이력 ──────────────────┐ │
│ │ 📝 2026-07-03 강남구 추세 분석          │ │
│ │ 📝 2026-07-01 서초구 vs 강남구 비교     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**핵심 기능:**
1. **데이터 컨텍스트 자동 생성**: 현재 필터 조건의 Neo4j 데이터를 요약하여 프롬프트에 자동 삽입
2. **프롬프트 템플릿**: 미리 정의된 분석 유형 (추세, 투자, 비교, 이상탐지)
3. **복사 → 외부 LLM 붙여넣기 → 결과 붙여넣기** 워크플로우 (1차)
4. **결과 저장**: 인사이트 이력 관리 (`data/insights.json`)
5. **향후 API 연동 대비**: Gemini/OpenAI API 키를 설정하면 직접 호출 가능한 구조로 설계

---

### Backend 확장 (Phase B)

#### [MODIFY] packages/shared/src/graphDb.ts

기존 3개 함수 + **7개 함수 추가**:

| 함수명 | 설명 |
|--------|------|
| `searchTransactions(filter)` | 기간/지역/아파트명/평수 필터 조합 검색 |
| `getDrilldownRegions()` | 시/도 레벨 집계 (거래수, 평균가) |
| `getDrilldownComplexes(lawdCode)` | 특정 지역 내 단지별 집계 |
| `getDrilldownAreas(complexName, lawdCode)` | 특정 단지의 평수별 집계 |
| `getGraphTopology(filter?)` | 노드-링크 시각화용 데이터 |
| `getComplexDetail(complexName, lawdCode?)` | 단지 상세 분석 |
| `getDataContext(filter)` | **LLM 프롬프트용 데이터 요약 생성** |

#### [MODIFY] packages/dashboard/server/routes-graph.ts

기존 3개 + **9개 엔드포인트 추가**:

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/graph/search` | 필터 조합 검색 |
| GET | `/api/graph/drilldown/regions` | 지역 집계 |
| GET | `/api/graph/drilldown/complexes` | 단지 집계 |
| GET | `/api/graph/drilldown/areas` | 평수 집계 |
| GET | `/api/graph/topology` | 노드-링크 데이터 |
| GET | `/api/graph/complex/:name/detail` | 단지 상세 |
| GET | `/api/graph/context` | LLM용 데이터 컨텍스트 |
| **CRUD** | `/api/graph/presets` | 조회 프리셋 (GET/POST/DELETE) |
| **CRUD** | `/api/graph/insights` | 인사이트 이력 (GET/POST/DELETE) |

#### [NEW] packages/dashboard/server/graphPresets.ts

프리셋 CRUD — `data/graph-presets.json` 저장

#### [NEW] packages/dashboard/server/graphInsights.ts

인사이트 이력 CRUD — `data/insights.json` 저장

```ts
type Insight = {
  id: string;
  title: string;
  filter: GraphFilter;       // 당시 필터 조건
  promptTemplate: string;    // 사용된 템플릿
  generatedPrompt: string;   // 생성된 프롬프트
  response?: string;         // LLM 응답 (붙여넣기)
  source: 'manual' | 'api';  // 수동 or API
  createdAt: string;
};
```

---

### Frontend 신규 파일 (Phase B)

| 파일 | 설명 |
|------|------|
| `src/pages/GraphDashboard.tsx` | 메인 컨테이너 (필터 + 5탭) |
| `src/pages/graph/FilterPanel.tsx` | 필터 패널 + 프리셋 관리 |
| `src/pages/graph/OverviewTab.tsx` | Overview (KPI + 트렌드 차트) |
| `src/pages/graph/ComplexTab.tsx` | 단지 분석 (평수별/층별) |
| `src/pages/graph/DrilldownTab.tsx` | 드릴다운 (계층 탐색) |
| `src/pages/graph/GraphViewTab.tsx` | 그래프 뷰 (노드-링크) |
| `src/pages/graph/InsightTab.tsx` | 인사이트 (LLM 프롬프트 빌더) |
| `src/pages/graph/PromptTemplates.ts` | 프롬프트 템플릿 정의 |

---

## Phase C: Collector 봇

### 설계 원칙

- **가볍고 단순**: 단일 엔트리 포인트, 의존성 최소
- **매일 1회 크론**: 최근 2달 거래 데이터 수집 → Neo4j upsert
- **수집 대상**: 규칙 기반(dashboard API에서 WatchRule 목록 fetch) + 수동 목록(config.json)
- **로깅**: 수집 결과를 stdout으로 출력 (Oracle VM에서 cron 로그로 확인)

### packages/collector/ 구조

```
collector/
├── package.json
├── tsconfig.json
├── Dockerfile
├── src/
│   ├── index.ts          ← 엔트리 + 메인 로직
│   ├── config.ts         ← 수집 대상 설정
│   ├── fetcher.ts        ← MCP or 직접 API 호출
│   └── collector.ts      ← 수집 → Neo4j upsert 파이프라인
└── config/
    └── targets.json      ← 수동 수집 대상 목록
```

#### config/targets.json 예시

```json
{
  "targets": [
    { "lawdCode": "11680", "displayName": "서울 강남구" },
    { "lawdCode": "11650", "displayName": "서울 서초구" }
  ],
  "fetchFromDashboard": true,
  "dashboardUrl": "http://synology-ip:4174"
}
```

#### 실행 흐름

```
1. targets.json 로드
2. fetchFromDashboard=true → dashboard API에서 활성 WatchRule의 지역 목록 가져오기
3. 수동 목록 + 규칙 기반 목록 합치기 (중복 제거)
4. 각 지역에 대해:
   a. 현재월 & 이전월 (최근 2달) 데이터 수집
   b. @myhome/shared의 upsertTransaction()으로 Neo4j에 적재
   c. 결과 로깅 (수집 건수, 신규/업데이트 건수)
5. 완료 로그 출력
```

#### Oracle VM 크론 설정

```bash
# crontab -e
0 6 * * * cd /home/ubuntu/myhome && node packages/collector/dist/index.js >> /var/log/myhome-collector.log 2>&1
```

---

### Docker 설정 (Dashboard)

#### [NEW] packages/dashboard/Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/ packages/shared/
COPY packages/dashboard/ packages/dashboard/
RUN npm ci --workspace=packages/shared --workspace=packages/dashboard
RUN npm run build -w packages/shared
RUN npm run build -w packages/dashboard

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/dashboard/dist ./dist
COPY --from=builder /app/packages/dashboard/data ./data
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 4174
CMD ["node", "dist/server/index.js"]
```

#### [NEW] packages/dashboard/docker-compose.yml

```yaml
version: '3.8'
services:
  dashboard:
    build:
      context: ../../
      dockerfile: packages/dashboard/Dockerfile
    ports:
      - "4174:4174"
    environment:
      - NODE_ENV=production
      - GRAPH_DB_ENABLED=true
      - NEO4J_URI=${NEO4J_URI}
      - NEO4J_USERNAME=${NEO4J_USERNAME}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
    volumes:
      - dashboard-data:/app/data
    restart: unless-stopped

volumes:
  dashboard-data:
```

---

## 전체 파일 변경 요약

### Phase A (모노레포 전환) — 4개 신규 + 파일 이동

| 파일 | 변경 |
|------|------|
| `package.json` (루트) | [NEW] workspaces 정의 |
| `tsconfig.base.json` | [NEW] 공통 TS 설정 |
| `packages/shared/*` | [NEW] graphDb.ts, types.ts, utils.ts 추출 |
| `packages/dashboard/*` | [MOVE] 기존 server/, src/ 이동 |

### Phase B (대시보드 그래프 분석) — 12개 파일

| 파일 | 변경 |
|------|------|
| 📦 `package.json` | `recharts`, `react-force-graph-2d` 추가 |
| 🔧 `packages/shared/src/graphDb.ts` | 7개 쿼리 함수 추가 |
| 🔧 `packages/dashboard/server/routes-graph.ts` | 9개 API 추가 |
| ✨ `packages/dashboard/server/graphPresets.ts` | [NEW] 프리셋 CRUD |
| ✨ `packages/dashboard/server/graphInsights.ts` | [NEW] 인사이트 CRUD |
| 🔧 `packages/dashboard/src/api.ts` | 그래프 API 함수 추가 |
| 🔧 `packages/dashboard/src/types.ts` | 분석 타입 추가 |
| ✨ `src/pages/GraphDashboard.tsx` | [NEW] 메인 대시보드 |
| ✨ `src/pages/graph/FilterPanel.tsx` | [NEW] 필터 + 프리셋 |
| ✨ `src/pages/graph/OverviewTab.tsx` | [NEW] Overview |
| ✨ `src/pages/graph/ComplexTab.tsx` | [NEW] 단지 분석 |
| ✨ `src/pages/graph/DrilldownTab.tsx` | [NEW] 드릴다운 |
| ✨ `src/pages/graph/GraphViewTab.tsx` | [NEW] 그래프 뷰 |
| ✨ `src/pages/graph/InsightTab.tsx` | [NEW] 인사이트 |
| ✨ `src/pages/graph/PromptTemplates.ts` | [NEW] 프롬프트 템플릿 |
| 🔧 `src/components/Layout.tsx` | 네비게이션 추가 |
| 🔧 `src/App.tsx` | 라우팅 추가 |
| 🔧 `src/locales/ko.ts` | i18n 추가 |

### Phase C (Collector) — 6개 파일

| 파일 | 변경 |
|------|------|
| ✨ `packages/collector/package.json` | [NEW] |
| ✨ `packages/collector/src/index.ts` | [NEW] 엔트리 |
| ✨ `packages/collector/src/config.ts` | [NEW] 설정 로드 |
| ✨ `packages/collector/src/fetcher.ts` | [NEW] 데이터 수집 |
| ✨ `packages/collector/src/collector.ts` | [NEW] 수집 파이프라인 |
| ✨ `packages/collector/config/targets.json` | [NEW] 대상 목록 |
| ✨ `packages/collector/Dockerfile` | [NEW] Oracle VM용 |
| ✨ `packages/dashboard/Dockerfile` | [NEW] Synology용 |
| ✨ `packages/dashboard/docker-compose.yml` | [NEW] |

---

## MCP 서버에 대한 판단

현재 단계에서 MCP 서버는 **불필요**합니다:

| 역할 | 현재 | MCP 서버 필요 시점 |
|------|------|-------------------|
| 데이터 수집 | `mcporter` CLI로 AptInfo MCP 서버 **소비** | - |
| 대시보드 조회 | Neo4j 직접 쿼리 | - |
| LLM 분석 (1차) | 프롬프트 복사→붙여넣기 | - |
| LLM 분석 (2차) | Gemini/OpenAI API 직접 호출 | - |
| **LLM이 Neo4j 직접 쿼리** | 미구현 | ✅ 이때 MCP 서버 필요 |

→ Phase 8(LLM 연동) 때 `packages/mcp-server/`를 추가하면 됩니다.

---

## Verification Plan

### Phase A
```bash
# 모노레포 빌드 확인
npm install
npm run build -w packages/shared
npm run dev -w packages/dashboard
```

### Phase B
```bash
# TypeScript 컴파일
npx tsc --noEmit -p packages/dashboard/tsconfig.json
# 프론트엔드 빌드
npm run build -w packages/dashboard
# 브라우저에서 그래프 분석 탭 확인
```

### Phase C
```bash
# Collector 빌드 & 드라이런
npm run build -w packages/collector
node packages/collector/dist/index.js --dry-run
# Docker 빌드
docker build -t myhome-dashboard -f packages/dashboard/Dockerfile .
```
