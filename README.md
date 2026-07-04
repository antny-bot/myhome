# myhome (Apartment Alert & Graph Analyzer)

PlayMCP `mcp-gateway`를 활용하여 아파트 실거래가 및 단지 정보를 주기적으로 수집하고, 설정한 조건에 부합하는 매물을 웹 대시보드와 Telegram으로 실시간 알림을 제공하며, 수집된 데이터를 Neo4j 그래프 데이터베이스를 통해 다각도로 분석하는 로컬/서버용 토탈 솔루션입니다.

## 주요 기능

- **관심 지역 알림 규칙 설정**: 지역명, 단지명 키워드, 거래 가격 범위, 거래년월 등을 기준으로 알림 등록.
- **실거래가 자동 수집**: `mcporter`를 활용해 국토교통부 실거래 데이터 정기 수집.
- **중복 알림 방지**: 동일 거래에 대해 유니크 키를 통한 중복 발송 차단.
- **웹 대시보드 제공**: 알림 규칙 관리, 즉시 조회, 실거래 탐색 및 로컬 상태 확인.
- **Neo4j 그래프 분석 (5개 탭)**:
  - **Overview**: 전체 거래 추이, 평균 거래가, 거래량 비교 차트.
  - **단지 분석**: 특정 아파트 단지의 평형별 시세 추이, 층별 분포 분석.
  - **드릴다운**: 시/도 -> 구/군 -> 단지 -> 평형으로 이어지는 계층적 탐색.
  - **그래프 뷰**: Region-Complex-Transaction 관계를 나타내는 노드-링크 인터랙티브 다이어그램.
  - **인사이트**: LLM 프롬프트 빌더를 활용한 수집 데이터 요약 및 분석 지원.
- **알림 채널**: Telegram Bot API 연동 (Kakao 알림 어댑터 확장 설계 완료).

## 디렉토리 구조 (모노레포)

이 프로젝트는 npm workspaces 기반의 모노레포 구조로 설계되었습니다.

```text
myhome/
├── packages/
│   ├── shared/       # 공통 모듈 (@myhome/shared) - Neo4j 클라이언트, 공통 타입, 유틸리티
│   ├── collector/    # 데이터 수집 봇 (@myhome/collector) - 크론 기반 실거래 수집 적재 파이프라인
│   └── dashboard/    # 대시보드 (@myhome/dashboard) - Express 서버 + React 프론트엔드
├── docs/             # 프로젝트 세부 설계 및 사양 문서
└── data/             # 로컬 데이터 (dashboard/data)
```

## 기술 구성

- **Frontend**: React (v19), TypeScript, Vite, Tailwind CSS, Recharts, react-force-graph-2d
- **Backend**: Node.js, TypeScript, Express, `tsx`
- **Graph Database**: Neo4j Aura (Free Tier), `neo4j-driver` v6
- **MCP client**: `mcporter`
- **Data source**: PlayMCP `mcp-gateway` (국토교통부 아파트 실거래가 데이터)
- **Local storage**: `packages/dashboard/data/` (JSON 파일 기반 규칙 및 이력 보관)
- **Notification**: Telegram Bot API

---

## 사전 준비

다음 환경 및 도구가 필요합니다.

- **Node.js**: 20 이상 및 npm
- **mcporter**: CLI 도구 설치 및 PlayMCP `mcp-gateway` 연결 상태 확인
- **Neo4j Aura**: 무료 계정 생성 및 데이터베이스 인스턴스 준비 (그래프 분석 기능 사용 시 필요)

### MCP 연결 및 설치 확인

```powershell
node --version
npm --version
mcporter --version
```

MCP 연결 상태를 확인합니다.
```powershell
mcporter list mcp-gateway
```
아파트 관련 도구 목록이 정상적으로 표시되는지 확인하십시오.

---

## 설치 및 빌드

1. **프로젝트 의존성 설치 (루트 경로)**
   ```powershell
   npm install
   ```

2. **전체 패키지 빌드**
   ```powershell
   npm run build
   ```
   이 명령은 `@myhome/shared` -> `@myhome/collector` -> `@myhome/dashboard` 순으로 빌드를 수행합니다.

---

## 실행 방법

### 1. 웹 대시보드 & API 서버 실행
Frontend(Vite)와 Backend(Express)를 동시에 실행합니다.
```powershell
npm run dev
```

- **웹 대시보드 주소**: <http://127.0.0.1:5173>
- **Backend API 주소**: <http://127.0.0.1:4174>
- **API 상태 확인**: <http://127.0.0.1:4174/api/health>

### 2. 수집 봇 (Collector) 독립 실행
수동으로 실거래 수집 파이프라인을 트리거하려면 collector 워크스페이스에서 실행합니다.
```powershell
npm run collect --workspace=packages/collector
```

---

## 환경 변수 설정 (.env)

프로젝트 루트 폴더에 `.env` 파일을 생성하고 아래 형식을 참조하여 환경 변수를 설정합니다.

```env
# 카카오 주소 검색 API 키 (선택 사항: 주소 자동완성 기능 활성화)
KAKAO_REST_API_KEY=YOUR_REST_API_KEY

# Telegram 알림 설정 (선택 사항)
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID

# Neo4j 그래프 데이터베이스 연동 설정 (선택 사항)
GRAPH_DB_ENABLED=true
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```

---

## 로컬 데이터 저장소

각종 사용자 설정 및 이력은 `packages/dashboard/data/` 디렉토리에 JSON 파일 형태로 안전하게 보관됩니다. 이 파일들은 개인 정보가 포함되므로 Git에서 제외됩니다.

- `app-state.json`: 등록된 알림 규칙, 최근 조회 실행 이력 및 발송된 알림 내역.
- `graph-presets.json`: 그래프 분석 대시보드에서 저장한 필터 프리셋 목록.
- `insights.json`: LLM 프롬프트 빌더를 통해 생성/기록한 분석 인사이트 기록.

---

## 주요 API 엔드포인트

### 기본 및 알림 규칙 API
| HTTP Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/health` | Backend 서비스 상태 확인 |
| `GET` | `/api/config` | 시스템 환경설정 및 API 구성 확인 |
| `GET` | `/api/rules` | 등록된 관심 조건 알림 규칙 목록 조회 |
| `POST` | `/api/rules` | 신규 관심 조건 알림 규칙 등록 |
| `PATCH` | `/api/rules/:id` | 특정 규칙의 활성화 여부 변경 및 수정 |
| `POST` | `/api/rules/:id/run` | 규칙 즉시 조회 실행 |
| `GET` | `/api/check-runs` | 최근 실거래가 조회 실행 결과 목록 |
| `GET` | `/api/notifications` | 발송된 알림 이력 목록 |

### 그래프 분석 API (Neo4j 기반)
| HTTP Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/graph/search` | 필터 조건에 따른 실거래 거래 목록 검색 |
| `GET` | `/api/graph/drilldown/regions` | 지역(시/도) 단위 드릴다운 집계 |
| `GET` | `/api/graph/drilldown/complexes` | 단지 단위 드릴다운 집계 |
| `GET` | `/api/graph/drilldown/areas` | 평수(전용면적) 단위 드릴다운 집계 |
| `GET` | `/api/graph/topology` | 시각화용 그래프 토폴로지 노드-링크 데이터 조회 |
| `GET` | `/api/graph/complex/:name/detail` | 특정 아파트 단지의 연도/평형별 상세 트렌드 조회 |
| `GET` | `/api/graph/context` | LLM 프롬프트 생성용 데이터 요약 컨텍스트 추출 |
| `GET/POST/DELETE` | `/api/graph/presets` | 그래프 분석 필터 프리셋 관리 |
| `GET/POST/DELETE` | `/api/graph/insights` | 분석 인사이트 기록 CRUD |

---

## MCP 도구 활용 예시

`mcporter`를 이용해 국토교통부 실거래 정보 및 단지 조회를 직접 호출해볼 수 있습니다.

- **지역코드 조회**:
  ```powershell
  mcporter call mcp-gateway.AptInfo-get_region_code region_name='분당구' --output json
  ```
- **특정 지역 월별 실거래가 조회**:
  ```powershell
  mcporter call mcp-gateway.AptInfo-get_apt_price lawd_cd=41135 deal_ymd=202606 --output json
  ```
- **아파트 단지 목록 조회**:
  ```powershell
  mcporter call mcp-gateway.AptInfo-get_apt_list sgg_code=41135 page=1 size=50 --output json
  ```

---

## 문제 해결 및 Q&A

### `spawn EINVAL` 오류 (Windows)
- 최신 코드에서는 Windows에서 `mcporter`의 JS CLI를 Node로 직접 실행하여 문제를 완화하였습니다. 동일 에러가 지속된다면 아래 명령을 실행하여 `mcporter`가 전역 경로 또는 실행 가능한 상태인지 확인하십시오.
  ```powershell
  mcporter list mcp-gateway
  Get-Command mcporter
  npm run build
  ```

### `Could not find region code` 오류
- 입력한 지역명이 잘못되었거나 불완전한 경우 발생합니다. 행정구역 공식 명칭 혹은 단순 명료한 명칭(예: `분당구`, `강남구`, `성남시 분당구`)으로 재조회해 보십시오.

### Telegram 알림 누락
- `.env`에 설정된 `TELEGRAM_BOT_TOKEN` 및 `TELEGRAM_CHAT_ID`가 올바른지 확인하십시오.
- 대시보드의 알림 이력 탭에서 상태 코드가 `sent`인지 `skipped` / `failed` 인지 점검하십시오.
- `/api/config`를 브라우저로 띄워 `telegramConfigured: true`인지 확인해 보십시오.

---

## 구현 계획 및 참고 문서

- **프로젝트 개요 및 구조**: `docs/OVERVIEW.md`
- **로드맵 및 진행 상황**: `docs/ROADMAP.md`
- **기능 스펙 설계**: `docs/superpowers/specs/`
