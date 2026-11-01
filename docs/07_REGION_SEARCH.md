# [07] 지역 검색 및 주소 자동완성 (Region Search)

자연어 주소 입력 시 카카오 Local API를 통해 시군구 지역코드(`LAWD_CD`) 후보를 자동완성하고 단지 목록을 로드하는 메커니즘.

## 1. 동작 흐름

```
사용자 주소 입력 (예: "수원시 영통구")
   │  300ms 디바운스
   ▼
GET /api/regions/search?query=...
   │
   ├─ KAKAO 키 유효 → searchAddresses() (다중 후보 목록 반환)
   └─ 키 부재/실패  → getRegionCode()   (로컬 DB / 폴백 단일 매핑)
   ▼
자동완성 드롭다운 후보 노출 → 사용자 선택
   ▼
selectRegion(): 법정동명 + lawdCode (5자리) 확정
   ▼
GET /api/apartments/list?lawdCode=... → 해당 지역 단지 목록 서빙
```

## 2. 관련 파일 및 역할

| 파일 | 역할 |
|---|---|
| `packages/dashboard/server/addressSearch.ts` | 카카오 주소 검색 API 호출, 응답 매핑 |
| `packages/dashboard/server/routes/transactionRoutes.ts` | `GET /regions/search` (카카오/폴백 분기) |
| `packages/shared/src/db/regions.ts` | 로컬 DB 기반 지역 사전 검색 폴백 |
| `packages/dashboard/src/App.tsx` | 디바운스 검색 입력, 드롭다운 UI 제어 |
| `packages/dashboard/src/api/` | 지역 검색 API 클라이언트 |

## 3. 카카오 API 연동 규격

- **엔드포인트**: `GET https://dapi.kakao.com/v2/local/search/address.json?query=<q>&size=10`
- **헤더**: `Authorization: KakaoAK ${KAKAO_REST_API_KEY}`
- **파싱 규칙**:
  - `lawdCode = doc.address.b_code.slice(0, 5)` (법정동 10자리 중 앞 5자리가 국토부 `LAWD_CD`와 일치)
  - `displayName = doc.address_name`
  - `displayName` 기준 중복 제거, 최대 10건 반환.

## 4. 폴백 및 제약

- **키 부재/호출 실패**: 로컬 SQLite DB 지역 테이블(`regions`) FTS 매핑으로 대체.
- **국토부 데이터 단위 제약**: 실거래가 데이터는 시군구(5자리) 단위로만 API 제공됨. 세부 읍면동 선택 시에도 소속 시군구 전체로 조회 후 프론트/DB에서 필터링.
