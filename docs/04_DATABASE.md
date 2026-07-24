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

## 2. 적재 기조 및 룰
- **지역 코드 단위 전체 적재**: 국토부 API 특성상 특정 단지 조회 시 해당 지역 코드(5자리 시군구) 전체 실거래 데이터 다운로드됨. 수집 지역 전체 실거래 DB Upsert, 이후 해당 지역 타 아파트 검색 시 캐시 히트 확률 극대화, 통계 정확성 담보.
- **중복 방지 (Deduplicate)**: `dedupe_key` `지역코드_단지명_계약일_면적_층수` 조합 문자열 구성, 동일 거래 중복 적재 완벽 방지.

---

## 3. 관련 코드 위치
- [db.ts](file:///e:/apps/myhome/packages/shared/src/db.ts): DDL 스키마 선언, `upsertTransaction` 적재 로직, 대시보드 통계용 집계 SQL 함수군 구현
