# SQLite 전환 및 아키텍처 단순화 구현 계획 (v1.0)

> 복잡한 Neo4j 그래프 DB와 분리된 배포 환경(Oracle VM)을 걷어내고, 단일 서버 내에서 가볍게 구동 가능한 SQLite 파일 DB 기반의 심플한 아키텍처로 전환합니다. 

---

## 1. 아키텍처 변경 비교

### AS-IS (기존 설계)
* **데이터 수집기 (Collector Bot)**: Oracle Free Tier (ARM VM) 별도 실행.
* **대시보드 (Dashboard)**: Synology NAS (Docker) 실행.
* **데이터베이스 (Graph DB)**: Neo4j Aura (Cloud Free Tier, 최대 20만 노드 제한).
* **시각화**: react-force-graph-2d 기반 노드-링크 네트워크 시각화 탭 사용.

### TO-BE (단일 서버 + SQLite)
* **통합 인프라**: 단일 서버(Synology NAS/로컬) 대시보드 백엔드 + 스케줄 기반 데이터 수집기 동시 동작.
* **데이터베이스 (RDBMS)**: 파일 기반 **SQLite (`better-sqlite3` 대신 내장 `node:sqlite` 채택)**. 로컬 `data/myhome.db` 파일 저장.
* **시각화**: 네트워크 그래프 탭 제거, 통계 중심 4개 탭(종합 현황, 단지별 분석, 드릴다운, AI 인사이트) 구성.

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
> `packages/collector` 데이터 수집 로직 유지, 대시보드 서버(`packages/dashboard/server/scheduler.ts`)가 수집 라이브러리 직접 import해 주기적(매일 오전 6시) 실행. 추가 배포/크론 불필요.

> [!IMPORTANT]
> **UI 변경 사항**:
> 프론트엔드 `react-force-graph-2d` 라이브러리, "그래프 네트워크" 탭 제거. Vite 빌드 크기 최소화.

---

## 3. 데이터베이스 스키마 설계

SQLite 기반 정규화 테이블 3종 구성.

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
* Neo4j 연동, 드라이버 코드 제거.

#### [NEW] [db.ts](file:///E:/apps/myhome/packages/shared/src/db.ts)
* `node:sqlite` 연결 생성.
* `initDb()`: 데이터베이스 기동 시 스키마 DDL 실행.
* `upsertTransaction()`: 트랜잭션 적용, `regions` ➔ `complexes` ➔ `transactions` 순 `INSERT OR IGNORE`, `ON CONFLICT DO UPDATE` 수행.
* 기존 `graphDb.ts` 통계/조회 인터페이스 SQL 쿼리 매핑:
  * `getComplexTrend()`: 단지명 부분 일치 검색, 월별 평균가 집계.
  * `getRegionTrend()`: 지역코드 소속 단지 월별 평균가 집계.
  * `getGraphStats()`: 테이블 레코드 수 집계.
  * `searchTransactions()`: 다중 필터(기간, 평수, 단지명) 검색.
  * `getDrilldownRegions()`, `getDrilldownComplexes()`, `getDrilldownAreas()`: 드릴다운 탐색용 그룹화 집계.
  * `getComplexDetail()`: 단지 통계, 층별 분포, 최근 거래 10건 조회.
  * `getDataContext()`: LLM 분석 전송용 데이터 포맷팅.

#### [MODIFY] [index.ts](file:///E:/apps/myhome/packages/shared/src/index.ts)
* `graphDb.ts` export 구문 새 `db.ts` 전환.

#### [MODIFY] [package.json](file:///E:/apps/myhome/packages/shared/package.json)
* `neo4j-driver` 의존성 제거, 내장 `node:sqlite` 활용.

---

### [Component: `@myhome/dashboard`]

#### [MODIFY] [package.json](file:///E:/apps/myhome/packages/dashboard/package.json)
* `neo4j-driver`, `react-force-graph-2d` 의존성 제거.

#### [MODIFY] [packages/dashboard/server/index.ts](file:///E:/apps/myhome/packages/dashboard/server/index.ts)
* 서버 실행 시 `initDb()` 호출, 종료 시 `closeDb()` 연결. Neo4j 안내 로그 제거.

#### [MODIFY] [packages/dashboard/server/routes-graph.ts](file:///E:/apps/myhome/packages/dashboard/server/routes-graph.ts)
* 임포트 대상 SQLite `db` 함수 전환. `/api/graph/topology` API 빈 데이터 리턴 처리(404/500 방지).

#### [MODIFY] [packages/dashboard/server/ruleEngine.ts](file:///E:/apps/myhome/packages/dashboard/server/ruleEngine.ts)
* 로컬 DB 실거래가 상시 upsert되도록 조건 수정.

#### [MODIFY] [packages/dashboard/server/scheduler.ts](file:///E:/apps/myhome/packages/dashboard/server/scheduler.ts)
* 룰 체킹 외 매일 새벽 6시 `@myhome/collector` 데이터 수집 함수 직접 실행 통합 스케줄 추가.

#### [MODIFY] [packages/dashboard/src/pages/GraphDashboard.tsx](file:///E:/apps/myhome/packages/dashboard/src/pages/GraphDashboard.tsx)
* "그래프 네트워크" 탭 제거, 4개 탭 축소. UI 제목, 설명 내 "Neo4j" 키워드 제거.

#### [DELETE] `packages/dashboard/src/pages/graph/GraphViewTab.tsx`
* react-force-graph-2d 사용 그래프 탭 파일 삭제.

---

### [Component: `@myhome/collector`]

#### [MODIFY] [packages/collector/src/index.ts](file:///E:/apps/myhome/packages/collector/src/index.ts)
* SQLite DB 수집 및 Upsert 참조 패키지 수정. 메인 수집 함수(`runCollector()`) `export` 노출.

---

## 5. 검증 계획

### 1단계: 빌드 및 의존성 검증
* `npm install` 실행, 의존성 삭제/추가 확인.
* `npm run build` 모노레포 패키지(`@myhome/shared`, `@myhome/collector`, `@myhome/dashboard`) 빌드 확인.

### 2단계: 기능 검증 (런타임 테스트)
* 서버 기동 시 `data/myhome.db` 생성 및 스키마 초기화 검증.
* `collector` 수집 스크립트 수동 실행, SQLite DB 적재 검증.
* 대시보드 웹 UI 종합 현황, 단지별 분석, 드릴다운 탭 그래프 표현 확인.
* AI 인사이트 탭 SQLite DB 요약 데이터 프롬프트 자동 기입 확인.
