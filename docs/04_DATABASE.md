# [04] 로컬 SQLite 데이터베이스 가이드 (Database Guide)

Node.js 내장 `node:sqlite` 기반 로컬 실거래 DB(`data/myhome.db`) 스키마, 인덱스, SQL 최적화 명세.

## 1. 데이터베이스 DDL 스키마

### A. 지역 정보 테이블 (`regions`)
```sql
CREATE TABLE IF NOT EXISTS regions (
  lawd_code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### B. 단지 테이블 (`complexes`)
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
  dedupe_key TEXT PRIMARY KEY,    -- 고유키 (지역|단지|계약일|면적|층|동|거래유형|등기일|가격)
  complex_id TEXT NOT NULL,       -- complexes(id) FK
  lawd_code TEXT NOT NULL,        -- 5자리 시군구코드
  deal_date TEXT NOT NULL,        -- 계약일 (YYYY-MM-DD)
  price_eok REAL NOT NULL,        -- 거래금액 (억)
  area_m2 REAL,                   -- 전용면적 (㎡)
  area_key INTEGER,               -- 정규화 면적 키 (ROUND(area_m2 * 100))
  floor INTEGER,                  -- 층수
  collected_at TEXT NOT NULL,     -- 수집 일시
  updated_at TEXT,                -- 갱신 일시
  cancel_date TEXT,               -- 해제사유발생일 (YYYY-MM-DD, 집계 제외)
  dealing_type TEXT,              -- 거래유형 ('중개거래' | '직거래')
  apt_dong TEXT,                  -- 동
  legacy_key TEXT,                -- 구 dedupe_key 호환
  FOREIGN KEY (complex_id) REFERENCES complexes(id)
);
```

### D. 분양면적 매핑 테이블 (`complex_area_mappings`)
```sql
CREATE TABLE IF NOT EXISTS complex_area_mappings (
  complex_id TEXT NOT NULL,
  area_m2 REAL NOT NULL,
  area_key INTEGER,               -- ROUND(area_m2 * 100)
  supply_area_m2 REAL NOT NULL,
  source TEXT DEFAULT 'api',
  created_at TEXT NOT NULL,
  PRIMARY KEY (complex_id, area_m2),
  FOREIGN KEY (complex_id) REFERENCES complexes(id)
);
```

## 2. 인덱스 및 FTS5 가상 테이블

```sql
-- 실거래 시계열 및 필터 최적화
CREATE INDEX IF NOT EXISTS idx_transactions_deal_date ON transactions(deal_date);
CREATE INDEX IF NOT EXISTS idx_transactions_complex_id ON transactions(complex_id);
CREATE INDEX IF NOT EXISTS idx_transactions_complex_deal_date ON transactions(complex_id, deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_lawd_code_deal_date ON transactions(lawd_code, deal_date);
CREATE INDEX IF NOT EXISTS idx_transactions_cancel_date ON transactions(cancel_date);
CREATE INDEX IF NOT EXISTS idx_transactions_complex_area_key ON transactions(complex_id, area_key);

-- 분양면적 매핑 조인 인덱스
CREATE INDEX IF NOT EXISTS idx_cam_complex_area_key ON complex_area_mappings(complex_id, area_key);

-- 단지 및 지역 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_complexes_lawd_code ON complexes(lawd_code);
CREATE INDEX IF NOT EXISTS idx_complexes_name ON complexes(name);
CREATE INDEX IF NOT EXISTS idx_complexes_lawd_name ON complexes(lawd_code, name);
CREATE INDEX IF NOT EXISTS idx_complexes_geocoded ON complexes(lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_regions_display_name ON regions(display_name);

-- FTS5 전문 검색 (단지명 부분 매칭)
CREATE VIRTUAL TABLE IF NOT EXISTS complexes_fts USING fts5(
  name, lawd_code UNINDEXED, complex_id UNINDEXED, tokenize='unicode61'
);
```

## 3. 적재 원칙 및 데이터 정합성

- **시군구 단위 일괄 적재**: 국토부 API 특성상 단지 조회 시 해당 시군구 5자리(`LAWD_CD`) 전체 수집. DB 일괄 Upsert로 동일 지역 후속 조회 캐시 히트 극대화.
- **정밀 중복 방지 (`dedupe_key`)**:
  `lawdCode|apartmentName|dealDate|areaM2|floor|aptDong|dealingType|registeredDate|priceEok` 조합. 동·가격·거래유형이 다른 정상 복수 거래 보존.
- **해제 거래 보존 및 집계 제외**:
  `cdealDay`/`cdealType` 감지 시 `cancel_date`에 기록. 물리 삭제 대신 논리 상태 보존. 모든 통계/조회 쿼리에 `WHERE cancel_date IS NULL` 기본 강제.

## 4. SQL 최적화 5대 패턴

1. **정규화 `area_key` 정수 조인**:
   부동소수점 비교 대신 `t.area_key = m.area_key` 정수 조인(`idx_transactions_complex_area_key`)으로 풀 스캔 차단.
2. **SARGable 범위 조건**:
   `substr(deal_date, 1, 7)` 함수식 금지. `deal_date >= ? AND deal_date <= ?` B-Tree 인덱스 레인지 스캔 강제.
3. **FTS5 접두 검색 우선**:
   `c.name LIKE '%...%'` 풀 스캔 대신 FTS5 가상 테이블 접두 매칭으로 `complex_id` 우선 특정.
4. **커서 기반 페이징 & 10,000건 안전 상한**:
   `(deal_date, dedupe_key)` 커서 페이징 지원. 기본 상한 10,000건 제한으로 메모리 보호.
5. **Prepared Statement LRU 캐시**:
   동적 SQL 파싱 오버헤드 방지. 최대 200개 LRU 상한(`getPreparedStatement`) 적용.
