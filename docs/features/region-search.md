# 지역 검색 / 주소 자동완성

> 관심 조건의 "지역명 검색"에서 입력값을 **여러 하위 후보로 좁혀** 보여주고, 선택한 후보의
> 지역코드(`lawd_cd`)로 실거래가를 조회하는 기능. 카카오 Local 주소 검색 API를 사용하며,
> API 키가 없으면 기존 MCP 단일 검색으로 폴백한다.

## 배경

도입 전에는 `경기도 수원시`처럼 입력해도 범위가 좁혀지지 않았다. 서버가 결과를 단 1개만
반환했고(`getRegionCode`는 지역명→코드 단일 변환 도구), 프론트는 그 1개를 자동 선택해
후보를 고를 UI가 없었기 때문이다. 특히 수원시는 4개 구(장안·권선·팔달·영통)가 각각 다른
`lawd_cd`를 가져 좁히기가 반드시 필요하다.

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
| `server/addressSearch.ts` | 카카오 주소 검색 호출 + 응답 매핑. `searchAddresses()`, `isKakaoConfigured()` |
| `server/routes.ts` | `GET /regions/search` (카카오↔MCP 분기/폴백), `GET /config`의 `kakaoSearchConfigured` |
| `server/mcpClient.ts` | `getRegionCode()` — 키 없을 때 폴백 경로 |
| `src/App.tsx` | 디바운스 자동완성 `useEffect`, `selectRegion()`, `handleSearch()`, 드롭다운 UI |
| `src/api.ts` | `searchRegions()` 클라이언트 |
| `src/types.ts` | `RegionSearchResult` 타입 |
| `server/types.ts` | `RegionCodeResult` 타입(서버 측 매핑 결과) |

## 카카오 API 연동 상세

- 엔드포인트: `GET https://dapi.kakao.com/v2/local/search/address.json?query=<q>&size=10`
- 헤더: `Authorization: KakaoAK ${KAKAO_REST_API_KEY}`
- Node 20 글로벌 `fetch` 사용(외부 의존성 없음).
- 응답 매핑 (`documents[]` → `RegionSearchResult[]`):
  - `lawdCode = doc.address.b_code.slice(0, 5)` — 법정동코드(10자리) 앞 5자리가 실거래가
    API의 `lawd_cd`(시군구 코드)와 동일하다. `b_code`가 없거나 5자리 미만이면 제외.
  - `displayName = doc.address_name` (전체 주소 문자열)
  - `raw = doc`
  - `displayName` 기준 **중복 제거**, 최대 10개 반환.

## 폴백 동작

- `KAKAO_REST_API_KEY` 미설정 → 카카오 분기를 건너뛰고 `getRegionCode()` 단일 결과를
  `[result]`로 반환(기존 동작 유지, 자동완성 없음).
- 카카오 호출이 실패(네트워크/인증 등)하면 로그를 남기고 **MCP 폴백**을 시도한다. 둘 다
  실패하면 에러 응답.
- 프론트는 `GET /api/config`의 `kakaoSearchConfigured`로 키 설정 여부를 알 수 있다.

## 환경변수

```
KAKAO_REST_API_KEY=   # 카카오 developers 앱의 REST API 키
```

발급: <https://developers.kakao.com> 앱 생성 → 앱 키 → REST API 키.
실행 전 환경변수로 주입(README의 "지역명 자동완성" 절 참고). 현재 백엔드는 `.env`를 자동
로드하지 않으므로 실행 셸에서 직접 설정한다.

## 제약 / 주의

- 실거래가 데이터는 **시군구(5자리) 단위**다. 동을 선택해도 실제 조회는 그 동이 속한
  시군구 단위로 이뤄진다(동 단위 필터링은 미지원).
- 카카오 키와 외부 네트워크가 있어야 자동완성이 동작한다. 그 외 환경에서는 폴백으로만 동작.

## 확장 포인트

- 키워드 검색(`/v2/local/search/keyword.json`) 병행으로 건물/단지명 검색 추가 가능.
- 선택한 후보를 규칙에 저장할 때 `regionCode`까지 함께 보존하면 재검색 비용을 줄일 수 있다.
- 네이버 지오코딩으로 교체/병행하려면 `addressSearch.ts`의 provider만 분기하면 된다.
