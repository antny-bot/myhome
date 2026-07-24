# [07] 지역 검색 / 주소 자동완성

> "지역명 검색" 입력값 **여러 하위 후보 축소** 표시 및 선택 후보 지역코드(`lawd_cd`) 기준 실거래가 조회 기능. 카카오 Local 주소 검색 API 사용, 키 없을 시 MCP 단일 검색 폴백.

## 배경

도입 전 `경기도 수원시` 입력 시 범위 축소 불가. 서버 단일 결과 반환(`getRegionCode` 단일 변환) 및 프론트 후보 선택 UI 부재 기인. 수원시 4개 구(장안·권선·팔달·영통) 각각 다른 `lawd_cd` 보유하여 축소 필수적임.

## 동작 흐름

```
사용자가 지역명 입력 (예: "경기도 수원시")
   │  300ms 디바운스
   ▼
src/App.tsx  searchRegions(query)  ──►  GET /api/regions/search?query=...
   │                                         │
   │                                         ▼
   │                              server/routes.ts /regions/search
   │                                 ├─ KAKAO 키 있음 → searchAddresses()  (다중 후보)
   │                                 └─ 키 없음/실패 → getRegionCode()      (단일 폴백)
   ▼
자동완성 드롭다운에 후보 표시 → 사용자가 선택
   ▼
selectRegion(): regionName = displayName, lawdCode 세팅
   ▼
lawdCode + 거래년월 → /api/apartments/list 로 단지 목록 로드
```

## 관련 파일

| 파일 | 역할 |
|------|------|
| `server/addressSearch.ts` | 카카오 주소 검색 호출 및 응답 매핑. `searchAddresses()`, `isKakaoConfigured()` |
| `server/routes.ts` | `GET /regions/search` (카카오/MCP 분기 및 폴백), `GET /config` `kakaoSearchConfigured` |
| `server/mcpClient.ts` | `getRegionCode()` — 키 미설정 시 폴백 경로 |
| `src/App.tsx` | 디바운스 자동완성 `useEffect`, `selectRegion()`, `handleSearch()`, 드롭다운 UI |
| `src/api.ts` | `searchRegions()` 클라이언트 |
| `src/types.ts` | `RegionSearchResult` 타입 |
| `server/types.ts` | `RegionCodeResult` 타입(서버 매핑 결과) |

## 카카오 API 연동 상세

- 엔드포인트: `GET https://dapi.kakao.com/v2/local/search/address.json?query=<q>&size=10`
- 헤더: `Authorization: KakaoAK ${KAKAO_REST_API_KEY}`
- Node 20 글로벌 `fetch` 사용(외부 의존성 없음).
- 응답 매핑 (`documents[]` → `RegionSearchResult[]`):
  - `lawdCode = doc.address.b_code.slice(0, 5)` — 법정동코드(10자리) 앞 5자리 실거래가 API `lawd_cd`(시군구 코드)와 일치. `b_code` 부재 또는 5자리 미만 시 제외.
  - `displayName = doc.address_name` (전체 주소 문자열)
  - `raw = doc`
  - `displayName` 기준 **중복 제거**, 최대 10개 반환.

## 폴백 동작

- `KAKAO_REST_API_KEY` 미설정 시 카카오 분기 생략 및 `getRegionCode()` 단일 결과를 `[result]` 반환(기존 동작 유지, 자동완성 없음).
- 카카오 호출 실패(네트워크, 인증 등) 시 로그 기록 후 **MCP 폴백** 시도. 양측 실패 시 에러 응답.
- 프론트는 `GET /api/config` `kakaoSearchConfigured`로 키 설정 여부 인지 가능.

## 환경변수

```
KAKAO_REST_API_KEY=   # 카카오 developers 앱의 REST API 키
```

발급: <https://developers.kakao.com> 앱 생성 → 앱 키 → REST API 키.
실행 전 환경변수 주입(README "지역명 자동완성" 참고). 백엔드 `.env` 자동 로드 미지원으로 실행 셸 직접 설정 필요.

## 제약 / 주의

- 실거래가 데이터 **시군구(5자리) 단위**임. 동 선택 시에도 해당 동 소속 시군구 단위로 조회(동 단위 필터링 미지원).
- 카카오 키 및 외부 네트워크 필수 작동. 그 외 환경은 폴백으로만 동작.

## 확장 포인트

- 키워드 검색(`/v2/local/search/keyword.json`) 병행하여 건물/단지명 검색 추가 가능.
- 선택 후보 규칙 저장 시 `regionCode` 함께 저장하여 재검색 비용 축소 가능.
- 네이버 지오코딩 교체/병행 시 `addressSearch.ts` provider 분기 처리.
