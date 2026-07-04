# myhome 프로젝트 로드맵

> 아파트 알림 → 이력 축적 → 그래프 분석 → LLM 인사이트로 진화하는 단계별 계획.

---

## 현황 요약 (2026-07)

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 프로젝트 스캐폴드 (Vite, Express, TypeScript, Tailwind) | ✅ 완료 |
| Phase 2 | 도메인 타입 + JSON 저장소 (`data/app-state.json`) | ✅ 완료 |
| Phase 3 | MCP 연동 + 규칙 엔진 (mcporter, ruleEngine) | ✅ 완료 |
| Phase 4 | 알림 + 스케줄러 (Telegram, 중복 방지) | ✅ 완료 |
| Phase 5 | REST API (rules, check-runs, notifications, config) | ✅ 완료 |
| Phase 6 | 프론트엔드 대시보드 (규칙 관리, 이력 조회, 지역 자동완성) | ✅ 완료 |
| **Phase 7A** | **모노레포 전환 + shared 패키지 추출** | 🔜 진행 예정 |
| **Phase 7B** | **그래프 DB 분석 대시보드 (5탭 리포트)** | 🔜 진행 예정 |
| **Phase 7C** | **데이터 수집 봇 (Collector) + Docker 배포** | 🔜 진행 예정 |
| Phase 8 | LLM API 직접 연동 (Gemini/OpenAI) | 📋 계획 |
| Phase 9 | MCP 서버 (Neo4j 데이터 외부 LLM 노출) | 📋 계획 |
| Phase 10 | 매물·호가 데이터 확장 (실거래 외 소스 추가) | 📋 계획 |
| Phase 11 | Kakao 알림 활성화 | 📋 계획 |

---

## 인프라 배치도

```
┌──────────────────────┐    ┌──────────────────────┐
│  Oracle Free Tier    │    │  Synology NAS        │
│  (ARM VM)            │    │  (Docker)            │
│                      │    │                      │
│  ┌────────────────┐  │    │  ┌────────────────┐  │
│  │ 기존 Bot       │  │    │  │ Dashboard      │  │
│  │ (Telegram 알림)│  │    │  │ (Express+React)│  │
│  └────────────────┘  │    │  │ :4174          │  │
│                      │    │  └───────┬────────┘  │
│  ┌────────────────┐  │    │          │           │
│  │ Collector Bot  │  │    └──────────┼───────────┘
│  │ (매일 06시)    │  │               │
│  │ 최근 2달 수집  │  │               │
│  └───────┬────────┘  │               │
│          │           │               │
└──────────┼───────────┘               │
           │                           │
           ▼                           ▼
    ☁️ Neo4j Aura (Free Tier)
    ┌─────────────────────────┐
    │  Region → Complex →     │
    │  Transaction 그래프     │
    └─────────────────────────┘
```

---

## Phase 7A — 모노레포 전환 + Shared 패키지 추출

### 목표
기능별로 패키지를 분리하여 독립 배포 가능한 구조로 전환.

### 최종 디렉토리 구조

```
myhome/                        ← 모노레포 루트
├── package.json               ← workspaces 정의
├── tsconfig.base.json         ← 공통 TS 설정
├── docs/                      ← 문서 (유지)
│
├── packages/
│   ├── shared/                ← 공통 모듈
│   │   ├── package.json       ← @myhome/shared
│   │   └── src/
│   │       ├── graphDb.ts     ← Neo4j 클라이언트 (기존 server/graphDb.ts 이동)
│   │       ├── types.ts       ← 공통 타입 (TransactionNode, RegionInfo 등)
│   │       └── utils.ts       ← dedupeKey 생성 등 유틸
│   │
│   ├── collector/             ← 데이터 수집 봇 (Phase 7C)
│   │   └── ...
│   │
│   └── dashboard/             ← 기존 서버 + 프론트 이동
│       ├── package.json       ← @myhome/dashboard
│       ├── vite.config.ts
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── server/            ← 기존 server/ 이동
│       ├── src/               ← 기존 src/ 이동
│       └── data/              ← 상태/프리셋/인사이트 JSON
```

### 작업 체크리스트
- [ ] 루트 `package.json`에 workspaces 정의
- [ ] `tsconfig.base.json` 생성 (공통 TS 설정)
- [ ] `packages/shared/` 생성 → `graphDb.ts`, 공통 타입, 유틸 추출
- [ ] 기존 `server/`, `src/`, 설정 파일 → `packages/dashboard/`로 이동
- [ ] `packages/dashboard/server/`에서 `@myhome/shared` import로 전환
- [ ] `npm install` → 전체 빌드 확인

### 완료 기준
- [ ] `npm run dev` (루트)로 dashboard 정상 실행
- [ ] `npm run build` (루트)로 shared → dashboard 순차 빌드 성공
- [ ] 기존 기능 (규칙 관리, 실거래 탐색, 알림) 모두 정상 동작

---

## Phase 7B — 그래프 DB 분석 대시보드

### 목표
Neo4j에 수집된 실거래 데이터를 입체적으로 분석할 수 있는 전용 리포트 대시보드.

### 환경 준비 체크리스트

- [ ] **Neo4j Aura 무료 계정 생성**
  - https://neo4j.com/cloud/platform/aura-graph-database/
  - 인스턴스 생성 후 URI, 비밀번호 메모
- [ ] **`.env`에 접속 정보 추가**
  ```
  NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
  NEO4J_USERNAME=neo4j
  NEO4J_PASSWORD=your-password
  GRAPH_DB_ENABLED=true
  ```

### 라이브러리 추가
```bash
npm install recharts react-force-graph-2d -w packages/dashboard
```

### 탭 구성 (5개)

| 탭 | 이름 | 핵심 기능 |
|----|------|----------|
| 1 | **Overview** | KPI 카드 4개 + 월별 거래량/평균가 트렌드 + 지역별/단지별 비교 |
| 2 | **단지 분석** | 특정 아파트 → 평수별 가격 추이, 층별 분포, 최근 거래 테이블 |
| 3 | **드릴다운** | 도시 → 지역 → 단지 → 평수 Breadcrumb 탐색 + 시계열 |
| 4 | **그래프 뷰** | Region-Complex-Transaction 노드-링크 다이어그램 (Force-directed) |
| 5 | **💡 인사이트** | LLM 프롬프트 빌더 + 분석 결과 관리 (1차: 수동 복사/붙여넣기) |

### 공통 기능
- **필터 패널**: 기간, 지역, 아파트명, 평수 조합 필터
- **프리셋 저장**: 필터 조건을 이름 붙여 저장/불러오기/삭제

### 인사이트 탭 (LLM 프롬프트 빌더) 상세

1차 구현 (API 없이):
1. **데이터 컨텍스트 자동 생성**: 현재 필터의 Neo4j 데이터를 요약
2. **프롬프트 템플릿**: 추세 분석, 투자 적정성, 지역 비교, 이상 탐지
3. **워크플로우**: 프롬프트 생성 → 클립보드 복사 → 외부 LLM → 결과 붙여넣기
4. **인사이트 이력 관리**: `data/insights.json`에 저장

### Backend 추가 (graphDb.ts 함수)

| 함수 | 설명 |
|------|------|
| `searchTransactions(filter)` | 다중 조건 검색 |
| `getDrilldownRegions()` | 시/도 레벨 집계 |
| `getDrilldownComplexes(lawdCode)` | 단지별 집계 |
| `getDrilldownAreas(complex, lawdCode)` | 평수별 집계 |
| `getGraphTopology(filter?)` | 노드-링크 데이터 |
| `getComplexDetail(complex, lawdCode?)` | 단지 상세 |
| `getDataContext(filter)` | LLM 프롬프트용 요약 |

### API 엔드포인트 추가

| 경로 | 설명 |
|------|------|
| `GET /api/graph/search` | 필터 검색 |
| `GET /api/graph/drilldown/regions` | 지역 집계 |
| `GET /api/graph/drilldown/complexes` | 단지 집계 |
| `GET /api/graph/drilldown/areas` | 평수 집계 |
| `GET /api/graph/topology` | 그래프 데이터 |
| `GET /api/graph/complex/:name/detail` | 단지 상세 |
| `GET /api/graph/context` | LLM 데이터 컨텍스트 |
| `CRUD /api/graph/presets` | 프리셋 관리 |
| `CRUD /api/graph/insights` | 인사이트 관리 |

### 완료 기준
- [ ] 그래프 분석 메뉴 진입 → 5개 탭 정상 렌더링
- [ ] 필터 입력 → 검색 → 차트 표시
- [ ] 프리셋 저장/불러오기/삭제
- [ ] 드릴다운 Breadcrumb 탐색 동작
- [ ] 노드-링크 다이어그램 인터랙션 (줌/팬/클릭)
- [ ] 인사이트 프롬프트 생성 → 클립보드 복사 → 결과 저장
- [ ] 모바일(390px) / 태블릿 / 데스크톱 반응형 확인

---

## Phase 7C — 데이터 수집 봇 (Collector)

### 목표
Oracle Free Tier VM에서 매일 자동으로 최근 2달 실거래 데이터를 수집하여 Neo4j에 적재.

### 설계 원칙
- **경량 단순**: 단일 엔트리, 의존성 최소 (`@myhome/shared` + `mcporter` or 직접 API)
- **매일 1회 크론**: `0 6 * * *` (매일 오전 6시)
- **수집 대상**: 규칙 기반 (Dashboard API에서 WatchRule 목록 fetch) + 수동 목록 (`config/targets.json`)
- **멱등성**: `upsertTransaction()`의 MERGE로 중복 방지

### 파일 구조

```
packages/collector/
├── package.json           ← @myhome/collector
├── tsconfig.json
├── Dockerfile
├── src/
│   ├── index.ts           ← 엔트리 + 메인 로직
│   ├── config.ts          ← 수집 대상 설정 로드
│   ├── fetcher.ts         ← MCP or 직접 API 호출
│   └── collector.ts       ← 수집 → Neo4j upsert 파이프라인
└── config/
    └── targets.json       ← 수동 수집 대상 지역 목록
```

### 실행 흐름

```
1. config/targets.json 로드 (수동 목록)
2. fetchFromDashboard=true → Dashboard API에서 활성 WatchRule 지역 목록 가져오기
3. 수동 + 규칙 기반 목록 합치기 (lawdCode 기준 중복 제거)
4. 각 지역에 대해:
   a. 현재월 & 이전월 (최근 2달) 데이터 수집
   b. @myhome/shared의 upsertTransaction()으로 Neo4j 적재
   c. 결과 로깅 (수집 건수, 신규/업데이트 건수)
5. 완료 요약 로그 출력
```

### Docker + 크론

```bash
# Oracle VM crontab
0 6 * * * cd /home/ubuntu/myhome && node packages/collector/dist/index.js >> /var/log/myhome-collector.log 2>&1
```

### Dashboard Docker (Synology)

```yaml
# packages/dashboard/docker-compose.yml
services:
  dashboard:
    build:
      context: ../../
      dockerfile: packages/dashboard/Dockerfile
    ports: ["4174:4174"]
    environment:
      - GRAPH_DB_ENABLED=true
      - NEO4J_URI=${NEO4J_URI}
      - NEO4J_USERNAME=${NEO4J_USERNAME}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
    volumes:
      - dashboard-data:/app/data
    restart: unless-stopped
```

### 완료 기준
- [ ] `npm run collect` (루트) → 수집 실행 성공
- [ ] `--dry-run` 플래그로 실제 적재 없이 대상 목록 확인
- [ ] Oracle VM에서 크론 실행 후 Neo4j에 데이터 적재 확인
- [ ] Dashboard Docker 빌드 → Synology에서 정상 실행

---

## Phase 8 — LLM API 직접 연동

### 목표
Phase 7B의 수동 프롬프트 빌더를 확장하여, Gemini/OpenAI API를 직접 호출.

### 주요 작업
- 인사이트 탭에 API 모드 추가 (수동 ↔ API 전환)
- `GEMINI_API_KEY` / `OPENAI_API_KEY` 환경변수 연동
- 그래프 DB 쿼리 결과 → LLM 프롬프트 컨텍스트 자동 전달
- **Text-to-Cypher**: 자연어 질문 → Cypher 쿼리 자동 변환
- **주간 리포트 자동 생성**: 스케줄러에 주 1회 리포트 생성 추가
- 스트리밍 응답 지원

### 분석 예시 (LLM 출력 목표)
> "성남판교백현마을2단지 84㎡는 최근 3개월 평균 23.4억으로, 전월 대비 1.2억(+5.4%) 상승.
> 인근 분당구 전체 평균은 -0.8% 하락 중으로, 해당 단지가 지역 평균을 역행하는 상승세를 보이고 있음."

---

## Phase 9 — MCP 서버 (Neo4j 데이터 외부 노출)

### 목표
수집된 Neo4j 데이터를 MCP 프로토콜로 외부 LLM(Gemini, Claude)에 직접 노출.

### 주요 작업
- `packages/mcp-server/` 패키지 추가
- Neo4j 쿼리를 MCP Tool로 래핑:
  - `get_region_trend`, `get_complex_trend`, `search_transactions`
  - `run_cypher` (안전한 읽기 전용 Cypher 실행)
- MCP 서버 배포 (Oracle VM or Synology)

### 필요 시점
- 외부 LLM이 Neo4j 데이터를 **직접** 쿼리해야 할 때
- IDE(Gemini, Cursor 등)에서 부동산 데이터 질의 지원

---

## Phase 10 — 매물·호가 데이터 확장

### 목표
현재 국토부 실거래가(계약 완료 데이터)에만 의존하는 한계를 넘어,
현재 매물 호가 및 매물 등록/삭제 이벤트 추적.

### 검토 중인 소스
- 네이버 부동산 비공식 API (파싱)
- 직방/호갱노노 데이터
- 새로운 MCP 도구 추가 시 우선 연동

---

## Phase 11 — Kakao 알림 활성화

### 목표
현재 `skipped` 상태로 구현된 Kakao 알림 어댑터(`notifications.ts`)를
"나에게 보내기" API를 통해 실제 동작하도록 활성화.

### 사전 조건
- Kakao REST API 키 발급
- OAuth 토큰 갱신 자동화 로직 구현

---

## 데이터 흐름 전체 그림 (Phase 7 이후)

```
                    ┌─────────────────────────────────┐
                    │     Oracle Free Tier VM          │
                    │                                  │
[매일 06시 크론] ───▶│  Collector Bot                   │
                    │    │                             │
                    │    ├─▶ mcporter / 직접 API       │ ◀── 국토부 실거래가
                    │    │                             │
                    │    └─▶ @myhome/shared            │
                    │         upsertTransaction()     │──▶ ☁️ Neo4j Aura
                    │                                  │
                    │  기존 Bot (스케줄러 12h)          │
                    │    ├─▶ ruleEngine.runRuleCheck() │
                    │    ├─▶ storage (app-state.json)  │
                    │    ├─▶ graphDb.upsertTransaction()│──▶ ☁️ Neo4j Aura
                    │    └─▶ notifications.send()      │──▶ Telegram
                    └─────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │     Synology NAS (Docker)        │
                    │                                  │
                    │  Dashboard (Express + React)     │
                    │    ├─▶ 기존 대시보드 (Phase 1~6) │
                    │    ├─▶ 그래프 분석 5탭 (Phase 7B)│◀── ☁️ Neo4j Aura
                    │    └─▶ 인사이트 프롬프트 빌더    │
                    │              │                   │
                    │              ▼ (Phase 8)         │
                    │         Gemini/OpenAI API        │
                    └─────────────────────────────────┘
```

---

## 기술 부채 목록 (development_plan.json 기준)

> Phase 7 구현 전후에 중요도에 따라 순차 해소 예정.

### 🔴 Critical
| ID | 내용 |
|----|------|
| C1 | `storage.ts` writeState 동시 쓰기 Race Condition 방지 |
| C2 | `ensureStateFile` 에러 처리 개선 |
| C3 | PATCH `/rules/:id` 요청에 Zod 검증 적용 |
| C4 | `addressSearch.ts` 활성화 및 routes.ts 연결 |
| C5 | `text-signal`, `text-warn` CSS 클래스 정의 |
| C6 | 모바일 햄버거 버튼 → 사이드바 드로어 활성화 |
| C7 | 지역 자동완성 선택 시 Step 2 자동 이동 |

### 🟠 High
| ID | 내용 |
|----|------|
| H1 | `sourceLimitNotice` 공통 상수 추출 |
| H3 | Telegram fetch에 타임아웃 추가 |
| H4 | 5건 초과 매칭 시 "외 N건" 메시지 |
| H5 | 스케줄러 중첩 실행 방지 플래그 |
| H6 | 프로세스 종료 시 graceful shutdown |
| H7 | `alertedDedupeKeys` Set 적용 성능 최적화 |
