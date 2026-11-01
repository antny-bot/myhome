# [08] 부동산원 (R-ONE) Open API 명세 및 호출 가이드

한국부동산원(R-ONE) 부동산통계정보 Open API 연동 규격.
- 통계표 코드: [`[08-1] 부동산원 통계표 코드 목록`](file:///E:/apps/myhome/docs/08-1_RONE_API_LIST.md)
- 지역코드: [`[08-2] 부동산원 지역코드 마스터 목록`](file:///E:/apps/myhome/docs/08-2_RONE_API_REGION_CODE.md)

## 1. 개요 및 인증

- **인증키**: `.env`의 `RONE_API_KEY`
- **프로토콜**: RESTful HTTP GET / POST
- **기본 URL**: `https://www.reb.or.kr/r-one/openapi/`

## 2. 공통 요청 인자

| 변수명 | 타입 | 필수 | 설명 | 기본값 |
|---|---|---|---|---|
| `Key` | STRING | Y | 발급 인증키 (누락 시 `sample` 10건 제한) | `RONE_API_KEY` |
| `Type` | STRING | Y | 응답 포맷 (`xml` / `json`) | `xml` |
| `pIndex` | INTEGER | Y | 페이지 번호 | `1` |
| `pSize` | INTEGER | Y | 페이지당 건수 | `100` |

## 3. 상세 API 명세

### 3.1 서비스 통계목록 API (`SttsApiTbl`)
- **URL**: `https://www.reb.or.kr/r-one/openapi/SttsApiTbl`
- **요청인자**: `STATBL_ID` (통계표ID, 선택)
- **출력값**: `STATBL_ID`, `STATBL_NM`, `DTACYCLE_CD`, `DTACYCLE_NM`, `STAT_ID`, `TOP_ORG_NM`, `OPEN_STATE`, `DATA_START_YY`, `DATA_END_YY`, `STATBL_IDTFR`, `STATBL_CMMT`, `V_ORDER`, `RPSTUI_NM`

### 3.2 통계 세부항목 목록 API (`SttsApiTblItm`)
- **URL**: `https://www.reb.or.kr/r-one/openapi/SttsApiTblItm`
- **요청인자**:
  - `STATBL_ID` (통계표 ID, 필수)
  - `ITM_TAG` (항목 태그, 선택)
- **출력값**: `STATBL_ID`, `ITM_TAG`, `ITM_ID`, `PAR_ITM_ID`, `ITM_NM`, `ITM_FULLNM`, `UI_NM`, `ITM_CMMT_IDTFR`, `ITM_CMMT_CONT`, `V_ORDER`

### 3.3 통계 조회 조건 설정 API (`SttsApiTblData`)
- **URL**: `https://www.reb.or.kr/r-one/openapi/SttsApiTblData`
- **요청인자**:
  - `STATBL_ID` (통계표 ID, 필수)
  - `DTACYCLE_CD` (주기코드, 필수)
  - `WRTTIME_IDTFR_ID` (작성시점, 선택)
  - `GRP_ID`, `CLS_ID`, `ITM_ID` (선택)
  - `START_WRTTIME`, `END_WRTTIME` (조회 범위, 선택)
- **출력값**: `STATBL_ID`, `DTACYCLE_CD`, `WRTTIME_IDTFR_ID`, `GRP_ID`, `GRP_NM`, `CLS_ID`, `CLS_NM`, `ITM_ID`, `ITM_NM`, `DTA_VAL`, `UI_NM`, `GRP_FULLNM`, `CLS_FULLNM`, `ITM_FULLNM`, `WRTTIME_DESC`

## 4. API 에러 및 응답 코드

| 코드 | 구분 | 내용 |
|---|---|---|
| `000` | INFO | 정상 처리 |
| `200` | INFO | 해당 데이터 없음 |
| `290` | ERROR | 인증키 유효하지 않음 |
| `300` | ERROR | 필수값 누락 또는 인증키 사용 제한 |
| `310` | ERROR | 해당 서비스 부재 (SERVICE 인자 확인) |
| `333` | ERROR | 요청위치 값 타입 오류 (정수 필요) |
| `336` | ERROR | 1회 요청 한도 초과 (최대 1,000건) |
| `337` | ERROR | 일별 트래픽 한도 초과 |
| `500` | ERROR | 서버 내부 오류 |
| `600` | ERROR | 데이터베이스 연결 오류 |
| `601` | ERROR | SQL 쿼리 문장 오류 |

## 5. 호출 예시

### 5.1 주택종합 매매가격지수 조회 예시
- 통계표: `(월) 매매가격지수_주택종합` (`STATBL_ID=A_2024_00016`)
- 세부항목: `지수` (`ITM_ID=100001`)
- 주기: 월별 (`DTACYCLE_CD=month`)

```http
GET https://www.reb.or.kr/r-one/openapi/SttsApiTblData?Key=YOUR_RONE_API_KEY&Type=json&pIndex=1&pSize=100&STATBL_ID=A_2024_00016&DTACYCLE_CD=month&ITM_ID=100001
```

### 5.2 주요 지역코드 매핑 예시 (`A_2024_00048` 계절조정 아파트 매매가격지수)

| 분류명 | 지역코드 | 법정동코드 |
|---|---|---|
| 전국 | `500001` | `1000010` |
| 수도권 | `500002` | `1000020` |
| 지방 | `500003` | `1000030` |
| 6대광역시 | `500004` | `1000040` |
| 서울 | `500008` | `11000000` |
| 경기 | `500009` | `41000000` |
| 인천 | `500010` | `28000000` |
| 부산 | `500011` | `26000000` |
| 대구 | `500012` | `27000000` |
| 대전 | `500014` | `30000000` |
| 세종 | `500016` | `36110000` |
| 서울>강북지역>도심권 | `520010` | `1002011` |
| 서울>강남지역>동남권 | `520015` | `1002015` |
