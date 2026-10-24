# [04] 로컬 SQLite 데이터베이스 가이드 (Database Guide)

Node.js 24 내장 `node:sqlite` 모듈 도입, 파일 기반(`data/myhome.db`) 로컬 실거래 데이터베이스 스키마 및 집계 기조 설명.

---

## 1. 데이터베이스 스키마 (Schema)
로컬 DB 지역(`regions`), 아파트 단지(`complexes`), 실거래 내역(`transactions`) 테이블 구성, 1:N 관계 가짐.

### A. 지역 정보 테이블 (`regions`)
```sql
CREATE TABLE IF NOT EXISTS regions (
  lawd_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### B. 아파트 단지 테이블 (`complexes`)
```sql
CREATE TABLE IF NOT EXISTS complexes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lawd_code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lawd_code) REFERENCES regions(lawd_code),
  UNIQUE(lawd_code, name)
);
```

### C. 실거래 내역 테이블 (`transactions`)
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complex_id INTEGER NOT NULL,
  dedupe_key TEXT UNIQUE NOT NULL, -- 중복 적재 방지용 복합 키
  deal_date TEXT NOT NULL,        -- 계약일 (YYYY-MM-DD)
  price_eok REAL NOT NULL,        -- 거래금액 (억)
  area_m2 REAL NOT NULL,          -- 전용면적 (㎡)
  floor INTEGER NOT NULL,         -- 층수
  collected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complex_id) REFERENCES complexes(id)
);
```

---


### D. 주요 인덱스 구성 (Indexes)
```sql
-- 거래일 및 단지별 시계열 조회 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_deal_date ON transactions(deal_date);
CREATE INDEX IF NOT EXISTS idx_transactions_complex_id ON transactions(complex_id);
CREATE INDEX IF NOT EXISTS idx_transactions_complex_deal_date ON transactions(complex_id, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_lawd_code_deal_date ON transactions(lawd_code, deal_date);

-- 단지명 및 지역명 검색 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_complexes_lawd_code ON complexes(lawd_code);
CREATE INDEX IF NOT EXISTS idx_complexes_name ON complexes(name);
CREATE INDEX IF NOT EXISTS idx_complexes_lawd_name ON complexes(lawd_code, name);
CREATE INDEX IF NOT EXISTS idx_complexes_geocoded ON complexes(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_regions_display_name ON regions(display_name);

-- FTS5 전문 검색 가상 테이블 (단지명 초고속 부분 검색)
CREATE VIRTUAL TABLE IF NOT EXISTS complexes_fts USING fts5(
  name, lawd_code UNINDEXED, complex_id UNINDEXED, tokenize='unicode61'
);
```

## 2. 적재 기조 및 룰
- **지역 코드 단위 전체 적재**: 국토부 API 특성상 특정 단지 조회 시 해당 지역 코드(5자리 시군구) 전체 실거래 데이터 다운로드됨. 수집 지역 전체 실거래 DB Upsert, 이후 해당 지역 타 아파트 검색 시 캐시 히트 확률 극대화, 통계 정확성 담보.
- **중복 방지 (Deduplicate)**: `dedupe_key` `지역코드_단지명_계약일_면적_층수` 조합 문자열 구성, 동일 거래 중복 적재 완벽 방지.

---


## 3. SQL 쿼리 최적화 패턴
1. **SARGable 범위 비교 원칙**:
   - `deal_date`(YYYY-MM-DD) 컬럼에 `substr(deal_date, 1, 7)`과 같은 함수식을 씌우지 않고, `deal_date >= ? AND deal_date <= ?` 직접 범위 조건으로 조회하여 B-Tree 인덱스 레인지 스캔을 보장합니다.
2. **Window Function CTE 일괄 집계**:
   - `getRegionComplexesMapData`와 같이 지역 내 모든 단지의 최신 거래가를 조회할 때, 단지마다 상관 서브쿼리를 실행하지 않고 `ROW_NUMBER() OVER (PARTITION BY complex_id ORDER BY deal_date DESC, rowid DESC)` 윈도우 함수 CTE를 이용해 1회 일괄 조인으로 단축합니다.
3. **대량 조회 메모리 보호 가드**:
   - `searchTransactions` 조회 시 결과 세트에 `LIMIT 3000` 안전 가드를 두어 무제한 메모리 팽창을 방지합니다.

---
## 4. 관련 코드 위치
- [db.ts](file:///e:/apps/myhome/packages/shared/src/db.ts): DDL 스키마 선언, `upsertTransaction` 적재 로직, 대시보드 통계용 집계 SQL 함수군 구현
