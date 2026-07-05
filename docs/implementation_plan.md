# SQLite 전환 및 아키텍처 단순화 구현 계획 (v1.0)

> 복잡한 Neo4j 그래프 DB와 분리된 배포 환경(Oracle VM)을 걷어내고, 단일 서버 내에서 가볍게 구동 가능한 SQLite 파일 DB 기반의 심플한 아키텍처로 전환합니다. 

---

## 1. 아키텍처 변경 비교

### AS-IS (기존 설계)
* **데이터 수집기 (Collector Bot)**: Oracle Free Tier (ARM VM)에서 별도 실행
* **대시보드 (Dashboard)**: Synology NAS (Docker)에서 실행
* **데이터베이스 (Graph DB)**: Neo4j Aura (Cloud Free Tier, 최대 20만 노드 용량 제한)
* **시각화**: react-force-graph-2d 기반의 노드-링크 네트워크 시각화 탭 존재

### TO-BE (단일 서버 + SQLite)
* **통합 인프라**: 하나의 서버(Synology NAS 또는 로컬 개발 환경)에서 대시보드 백엔드와 스케줄 기반 데이터 수집기가 함께 동작
* **데이터베이스 (RDBMS)**: 파일 기반의 **SQLite (`better-sqlite3` 대신 내장 `node:sqlite` 채택)** 도입. 로컬 디스크 상에 `data/myhome.db` 파일로 영구 저장
* **시각화**: 복잡한 네트워크 그래프 탭을 제거하고, 통계 중심의 4개 탭(종합 현황, 단지별 분석, 드릴다운, AI 인사이트)으로 단순화

```
┌──────────────────────────────────────────────┐
│             myhome (단일 서버)                │
│             npm workspaces 기반              │
├───────────────┬──────────────────────────────┤
│ packages/     │ packages/                    │
│ shared/       │ dashboard/                   │
│               │                              │
│ • SQLite      │ • Express Server + React     │
│   클라이언트   │ • 주기적 수집 스케줄러 내장  │
│   (node:      │ • REST API                   │
│    sqlite)    │ • 실거래 통계 대시보드       │
│ • 테이블      │                              │
│   스키마 정의  │                              │
└───────────────┴──────────────────────────────┘
                        │
                        ▼ (로컬 파일)
             💾 SQLite (data/myhome.db)
```

---

## 2. User Review Required

> [!IMPORTANT]
> **패키지 결합 구조**:
> `packages/collector`에 작성되어 있던 데이터 수집 로직은 그대로 유지하되, 대시보드 서버(`packages/dashboard/server/scheduler.ts`)가 이 수집 라이브러리를 직접 import하여 주기적(예: 매일 오전 6시)으로 프로세스 내에서 직접 실행하도록 구성합니다. 이를 통해 추가 배포나 크론 설정 작업이 전혀 불필요해집니다.

> [!IMPORTANT]
> **UI 변경 사항**:
> 프론트엔드에서 `react-force-graph-2d` 라이브러리 및 "그래프 네트워크" 탭이 제거됩니다. 의존성을 가볍게 줄여 Vite 빌드 크기를 최소화합니다.

---

## 3. 데이터베이스 스키마 설계

SQLite 기반의 정규화된 3가지 테이블 스키마를 구성합니다.

```sql
-- 1. 지역 테이블
CREATE TABLE IF NOT EXISTS regions (
  lawd_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 2. 단지 테이블
CREATE TABLE IF NOT EXISTS complexes (
  id TEXT PRIMARY KEY, -- 'lawd_code|complex_name' 형식의 고유 키
  lawd_code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (lawd_code) REFERENCES regions(lawd_code),
  UNIQUE(lawd_code, name)
);

-- 3. 실거래가 상세 테이블
CREATE TABLE IF NOT EXISTS transactions (
  dedupe_key TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL,
  deal_date TEXT NOT NULL,
  price_eok REAL NOT NULL,
  area_m2 REAL,
  floor INTEGER,
  collected_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (complex_id) REFERENCES complexes(id)
);

-- 인덱스 추가 (조회 속도 최적화)
CREATE INDEX IF NOT EXISTS idx_transactions_deal_date ON transactions(deal_date);
CREATE INDEX IF NOT EXISTS idx_transactions_complex_id ON transactions(complex_id);
CREATE INDEX IF NOT EXISTS idx_complexes_lawd_code ON complexes(lawd_code);
```

---

## 4. 세부 변경 파일 계획

### [Component: `@myhome/shared`]

#### [DELETE] `packages/shared/src/graphDb.ts`
* Neo4j 연동 및 드라이버 코드를 제거합니다.

#### [NEW] [db.ts](file:///E:/apps/myhome/packages/shared/src/db.ts)
* `node:sqlite`를 사용하여 연결을 생성합니다.
* `initDb()`: 데이터베이스 기동 시 위 스키마의 DDL을 안전하게 실행합니다.
* `upsertTransaction()`: 트랜잭션을 적용하여 `regions` ➔ `complexes` ➔ `transactions` 순으로 `INSERT OR IGNORE` 및 `ON CONFLICT DO UPDATE`를 수행합니다.
* 기존 `graphDb.ts`가 노출하던 통계/조회 인터페이스를 SQL 쿼리로 매핑합니다:
  * `getComplexTrend()`: 단지명 부분 일치 검색 및 월별 평균가 집계 SQL
  * `getRegionTrend()`: 해당 지역코드 소속 단지들의 월별 평균가 집계 SQL
  * `getGraphStats()`: 각 테이블 레코드 수 집계 SQL
  * `searchTransactions()`: 다중 필터(기간, 평수, 단지명) 기반 검색 SQL
  * `getDrilldownRegions()`, `getDrilldownComplexes()`, `getDrilldownAreas()`: 드릴다운 탐색용 그룹화 집계 SQL
  * `getComplexDetail()`: 단지 통계, 층별 분포, 최근 거래 10건 조회 SQL
  * `getDataContext()`: LLM 분석 전송용 데이터 포맷팅 SQL

#### [MODIFY] [index.ts](file:///E:/apps/myhome/packages/shared/src/index.ts)
* `graphDb.ts`를 가리키던 export 구문을 새 `db.ts`로 전환합니다.

#### [MODIFY] [package.json](file:///E:/apps/myhome/packages/shared/package.json)
* `neo4j-driver` 의존성을 제거하고 `better-sqlite3` 대신 내장 `node:sqlite`를 활용합니다.

---

### [Component: `@myhome/dashboard`]

#### [MODIFY] [package.json](file:///E:/apps/myhome/packages/dashboard/package.json)
* `neo4j-driver` 및 `react-force-graph-2d` 의존성을 제거합니다.

#### [MODIFY] [packages/dashboard/server/index.ts](file:///E:/apps/myhome/packages/dashboard/server/index.ts)
* 서버 실행 시 `initDb()`를 호출하고, 종료 시 `closeDb()`를 연결합니다.
* Neo4j 관련 안내 로그를 제거합니다.

#### [MODIFY] [packages/dashboard/server/routes-graph.ts](file:///E:/apps/myhome/packages/dashboard/server/routes-graph.ts)
* 임포트 대상을 `closeGraphDb` 등에서 SQLite `db` 함수들로 전환합니다.
* `/api/graph/topology` API는 빈 데이터를 리턴하도록 처리합니다 (호출에 의한 404/500 에러 방지).

#### [MODIFY] [packages/dashboard/server/ruleEngine.ts](file:///E:/apps/myhome/packages/dashboard/server/ruleEngine.ts)
* `process.env.GRAPH_DB_ENABLED` 대신 항상 로컬 DB에 수집된 실거래가 upsert되도록 조건문을 수정하거나 완화합니다. (또는 `SQLITE_DB_ENABLED`와 같은 옵션으로 매핑)

#### [MODIFY] [packages/dashboard/server/scheduler.ts](file:///E:/apps/myhome/packages/dashboard/server/scheduler.ts)
* 기존 룰 체킹 외에, 매일 새벽 6시가 되면 `@myhome/collector`의 데이터를 긁어오는 메인 함수를 프로세스 내에서 직접 실행할 수 있도록 통합 수집 스케줄 기능을 추가합니다.

#### [MODIFY] [packages/dashboard/src/pages/GraphDashboard.tsx](file:///E:/apps/myhome/packages/dashboard/src/pages/GraphDashboard.tsx)
* "그래프 네트워크" 탭을 제거하고, 탭 구성을 4개로 축소합니다.
* UI 제목 및 설명에서 "Neo4j" 키워드를 제거합니다.

#### [DELETE] `packages/dashboard/src/pages/graph/GraphViewTab.tsx`
* react-force-graph-2d를 사용하던 그래프 탭 파일 자체를 완전히 삭제합니다.

---

### [Component: `@myhome/collector`]

#### [MODIFY] [packages/collector/src/index.ts](file:///E:/apps/myhome/packages/collector/src/index.ts)
* Neo4j DB 대신 SQLite DB에 데이터를 긁어와 바로 Upsert하도록 참조 패키지를 수정합니다.
* 외부 스케줄러가 호출할 수 있도록 메인 수집 함수(`runCollector()`)를 `export` 형태로 노출시킵니다.

---

## 5. 검증 계획

### 1단계: 빌드 및 의존성 검증
* `npm install` 실행 및 의존성 삭제/추가 확인
* `npm run build`를 통해 공유 패키지(`@myhome/shared`), 데이터 수집기(`@myhome/collector`), 대시보드(`@myhome/dashboard`)가 정상적으로 빌드되는지 확인

### 2단계: 기능 검증 (런타임 테스트)
* 서버 기동 시 `data/myhome.db` 파일이 자동 생성되고 스키마가 초기화되는지 검증
* `collector` 수집 스크립트 수동 실행 테스트 ➔ SQLite DB 내에 데이터가 올바르게 쌓이는지 테이블 조회 검증
* 대시보드 웹 UI에서 종합 현황, 단지별 분석, 드릴다운 탭의 데이터 및 그래프가 에러 없이 정확히 표현되는지 확인
* AI 인사이트 탭에서 SQLite DB 요약 데이터(컨텍스트)가 프롬프트 빌더에 알맞게 자동 기입되는지 확인
