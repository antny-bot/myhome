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
  id TEXT PRIMARY KEY, -- 'lawd_code|complex_name'
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
  dedupe_key TEXT PRIMARY KEY,    -- 고유 식별 키 (지역|단지|계약일|면적|층|동|거래유형|등기일|가격)
  complex_id TEXT NOT NULL,       -- complexes(id) 외래키
  lawd_code TEXT NOT NULL,        -- 5자리 법정동코드
  deal_date TEXT NOT NULL,        -- 계약일 (YYYY-MM-DD)
  price_eok REAL NOT NULL,        -- 거래금액 (억)
  area_m2 REAL,                   -- 전용면적 (㎡)
  floor INTEGER,                  -- 층수
  collected_at TEXT NOT NULL,     -- 수집 일시
  updated_at TEXT,                -- 갱신 일시
  cancel_date TEXT,               -- 해제사유발생일 (YYYY-MM-DD, 통계/검색 제외)
  dealing_type TEXT,              -- 거래유형 ('중개거래' | '직거래')
  apt_dong TEXT,                  -- 아파트 동
  legacy_key TEXT,                -- 구 dedupe_key 보존
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
CREATE INDEX IF NOT EXISTS idx_transactions_cancel_date ON transactions(cancel_date);

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
- **정밀 중복 방지 (Deduplicate) 및 복수 거래 보존**:
  - `dedupe_key`: `lawdCode|apartmentName|dealDate|areaM2|floor|aptDong|dealingType|registeredDate|priceEok` 조합으로 구성되어, 동일 조건(같은 단지·일자·면적·층)이라도 가격/동/거래유형이 다른 정상 복수 거래가 유실되지 않고 안전하게 보존됩니다.
- **해제(취소) 거래 보존 및 집계 제외**:
  - 국토부 API의 `cdealDay`(해제사유발생일) / `cdealType`을 감지하여 DB `cancel_date`에 기록하되 물리적 삭제 대신 논리적 상태로 보존합니다.
  - 모든 실거래 조회 및 집계 쿼리는 `AND cancel_date IS NULL` 조건을 기본 적용하여 왜곡 없는 정확한 통계를 산출합니다.

---

## 3. SQL 쿼리 최적화 패턴
1. **SARGable 범위 비교 원칙**:
   - `deal_date`(YYYY-MM-DD) 컬럼에 `substr(deal_date, 1, 7)`과 같은 함수식을 씌우지 않고, `deal_date >= ? AND deal_date <= ?` 직접 범위 조건으로 조회하여 B-Tree 인덱스 레인지 스캔을 보장합니다.
2. **Window Function CTE 일괄 집계**:
   - N+1 상관 서브쿼리 대신 `tx_summary` CTE 및 Window Function(`FIRST_VALUE`, `PARTITION BY`)으로 단 1회 스캔하여 집계합니다.
