# [12] 대법원 법원경매 데이터 연계 명세서 (Auction Integration)

본 문서는 대법원 법원경매정보(`courtauction.go.kr`) 시스템과 myhome 아파트 단지 실거래 데이터 간의 연계 아키텍처 및 구현 명세를 설명합니다.

---

## 1. 개요 및 설계 원칙

1. **상단 GNB 메뉴 신설 배제 (Seamless Integration)**:
   - 상단/사이드 GNB에 별도의 '경매' 메뉴를 만들지 않고, 기존 아파트 지도 조회 화면(필터, 마커/목록 배지, 상세 모달), 실거래 시계열 차트(감정가/최저가 기준선), 그리고 데이터베이스 관리자 메뉴(경매 수집 현황 및 미매핑 큐 수동 매칭)에 유기적으로 통합합니다.
2. **크롤링 안전장치 (Anti-Blocking Safety Guard)**:
   - `courtauction.go.kr`의 IP 차단(`ipcheck: false`) 및 세션 차단을 방지하기 위해 단일 수집 상한(최대 20회 요청), 요청 간 3초+지터 딜레이, 차단 감지 시 1시간 쿨다운(`blockedUntil`) 게이트를 강제합니다.
3. **실측 기반의 파라미터 규격**:
   - `lawd_code` 5자리는 시도 2자리(`sidoCd`) + 시군구 3자리(`sggCd`)로 분할하여 전송합니다 (예: `41117` → `41`/`117`).
   - 용도 코드는 실측 아파트 코드(`20000`, `20100`, `20104`)를 명시적으로 전달합니다.
   - 대법원 응답의 `wgs84Xcordi`/`wgs84Ycordi`는 소수점이 절삭되어 제공되므로, 카카오 로컬 지오코딩 API를 사용하여 정밀 좌표를 산출합니다.

---

## 2. 데이터베이스 스키마

### 1) 경매 물건 원장 (`auctions`)
```sql
CREATE TABLE IF NOT EXISTS auctions (
  docid TEXT PRIMARY KEY,
  bo_cd TEXT NOT NULL,
  sa_no TEXT NOT NULL,
  srn_sa_no TEXT,
  maemul_ser TEXT NOT NULL,
  mokmul_ser TEXT NOT NULL,
  lawd_code TEXT,
  court_name TEXT,
  dept_name TEXT,
  court_tel TEXT,
  usage_l TEXT, usage_m TEXT, usage_s TEXT, usage_name TEXT,
  addr_sido TEXT, addr_sigu TEXT, addr_dong TEXT, addr_lotno TEXT,
  addr_road TEXT, addr_buld_no TEXT, addr_full TEXT,
  buld_name TEXT, dong_ho TEXT,
  area_m2 REAL,
  area_key INTEGER,
  appraisal_amt INTEGER,
  min_price INTEGER,
  min_price_rate INTEGER,
  failed_count INTEGER,
  sale_date TEXT,
  sale_time TEXT,
  sale_place TEXT,
  status_cd TEXT, progress_cd TEXT, bid_type_cd TEXT,
  raw_json TEXT,
  lat REAL, lng REAL,
  geocoded_at TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  closed_at TEXT
);
```

### 2) 단지 매칭 결과 (`auction_matches`)
```sql
CREATE TABLE IF NOT EXISTS auction_matches (
  docid TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL,
  method TEXT NOT NULL, -- 'manual' | 'geo+name' | 'geo+name+area' | 'name+area'
  confidence REAL NOT NULL,
  distance_m REAL,
  name_score REAL,
  area_verified INTEGER DEFAULT 0,
  candidates_json TEXT,
  decided_by TEXT NOT NULL, -- 'auto' | 'user'
  created_at TEXT NOT NULL,
  FOREIGN KEY (docid) REFERENCES auctions(docid) ON DELETE CASCADE,
  FOREIGN KEY (complex_id) REFERENCES complexes(id)
);
```

### 3) 수집 이력 및 쿨다운 (`auction_collect_runs`)
```sql
CREATE TABLE IF NOT EXISTS auction_collect_runs (
  id TEXT PRIMARY KEY,
  lawd_code TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  request_count INTEGER NOT NULL,
  http_status INTEGER,
  ipcheck INTEGER,
  total_cnt INTEGER,
  fetched INTEGER,
  matched INTEGER,
  unmatched INTEGER,
  blocked INTEGER DEFAULT 0,
  error TEXT
);
```

---

## 3. 3단계 복합 단지 매칭 알고리즘

1. **1단계: 반경 150m 공간 매칭 (Geospatial Matching)**
   - 카카오 주소 지오코딩으로 확보한 경매 물건 좌표를 기준으로 기등록 단지들과의 Haversine 거리 계산 ($distance \le 150\text{m}$).
2. **2단계: 이름 정규화 및 텍스트 유사도 매칭 (FTS5 + Bi-gram)**
   - 동/층/호수, 괄호, '아파트' 접미어 제거 및 브랜드 통일(예: '이편한세상' → 'e편한세상').
   - `complexes_fts` 접두어 매칭 점수와 2-gram Jaccard / Levenshtein 점수 합성.
3. **3단계: 전유면적 대조 교차 검증 (Area Key Verification)**
   - 경매 물건의 `area_key`($\text{ROUND}(\text{area\_m2} \times 100)$)와 해당 단지의 실거래 `area_key`를 대조 ($\pm 10$ 이내 허용).
4. **자동 확정 vs 미매핑 큐 판정**:
   - $distance \le 80\text{m} \land name\_score \ge 0.6 \land area\_verified$: **자동 확정 (`confidence` 0.85~0.95)**
   - 그 외 후보군은 `candidates_json`에 저장 후 **미매핑 큐 (`unmatched`)로 이관되어 관리자 화면에서 수동 매칭**.

---

## 4. 백엔드 스케줄러 & 룰 알림

1. **수집 주기**:
   - 매일 오전 **06:40 KST** 이후 1회 자동 실행 (`runDueAuctionCollector()`).
   - `auction.enabled === "false"` 또는 `lastSuccessDate === today` 시 건너뜀.
   - `blockedUntil` 시점 이전이면 즉시 스킵하여 IP 보호.
2. **알림 룰 엔진 (`auctionEngine.ts`)**:
   - `watch_rules`에 `kind: 'auction' | 'both'` 및 `max_failed_count` 지원.
   - 중복 알림 방지 키: `auction:{docid}:{sale_date}:{min_price}`.
   - 감정가, 최저매각가, 유찰횟수, 매각기일, 대법원 링크를 텔레그램으로 전송.
