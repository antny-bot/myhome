# 법원경매 정보 API 조사

> 현재 실거래가(과거 매매) 조회 기능에 더해 "법원경매 매물"을 조회하는 기능을 추가할 수
> 있을지 검토하기 위한 조사 자료. **결론: 법원경매정보(courtauction.go.kr)를 무료로
> 제공하는 공식 오픈 API는 없다.** 실제 연동이 필요해지면 이 문서의 옵션 비교를 참고한다.

## 배경

`server/mcpClient.ts`의 `getApartmentPrices()` / `getApartmentList()`는 국토교통부
실거래가(과거 매매) 데이터를 MCP(`AptInfo-*`) 경유로 조회한다. 동일한 패턴으로 "법원경매
매물(현재 진행 중인 경매 사건)" 데이터를 추가하면 좋겠다는 아이디어에서, 한국 법원경매
정보를 제공하는 API가 있는지, 있다면 무료/유료인지 조사했다.

## 옵션 비교

| 옵션 | 비용 | 비고 |
|------|------|------|
| **법원경매정보 (courtauction.go.kr)** | - | 대법원이 운영하는 공식 사이트. 일반 개발자용 OpenAPI/REST API를 공개하지 않음. `openapi.scourt.go.kr` 형태의 연계 API가 존재하나 기관 간 연계 용도로 보이며 접근이 제한됨(외부에서 403) |
| **공공데이터포털 (data.go.kr)** | 무료 | "법원경매 매물 리스트" 자체를 제공하는 오픈API는 없음. 한국주택금융공사의 "법적절차진행이력정보" 같은 관련 파일데이터는 있으나 경매 매물 목록과는 다름 |
| **온비드 OnBid (data.go.kr 경유)** | 무료 | 공공데이터포털에 오픈API 있음. 단, 이는 **공매**(국세 압류재산·캠코 자산 매각)이며 **법원경매와는 법적 절차·운영 주체가 다른 별개 제도** — 혼동 주의 |
| **CODEF (developer.codef.io)** | **유료 (사용량 기반 과금)** | "법원경매정보 경매사건검색 API"를 제공하는 민간 API 중개 플랫폼. 법원경매정보를 정형 데이터로 가공해 제공. "쓴 만큼만 내는" 구독형 과금 — 정확한 단가는 가입 후 확인 필요 |
| **쿠콘(Kuckon) 등 데이터 브로커** | 유료 | "대법원 법원경매정보 조회" API 제공. 기업 계약 기반으로, 소규모 개인 프로젝트엔 부담될 수 있음 |
| **지지옥션 / 옥션원(구 굿옥션) / 탱크옥션 / 태인 등 민간 경매정보 서비스** | 유료 (B2C 구독) | 현장조사·사진·등기 분석 등 가공 데이터까지 포함. API 형태로 제공하는 곳은 제한적이며 별도 제휴/계약 필요 |
| **오픈소스 비공식 크롤러** (`guriguri/cauca`, `yoiyoy/node-cauca` 등, GitHub) | 무료 | courtauction.go.kr을 크롤링해 REST API화한 프로젝트. 무료이지만 비공식이라 약관 위반 가능성과 사이트 구조 변경 시 유지보수 중단 리스크가 있음 |

## 결론 및 추천

- **합법·안정적인 경로로 가장 현실적인 옵션은 CODEF의 "법원경매정보 경매사건검색 API"**다.
  사용량 기반 과금이라 초기 비용 부담이 적지만, 정식 가입 후 단가를 확인해야 한다.
- **완전 무료로 하려면 비공식 크롤러(`cauca` 계열)를 직접 운영하거나 자체 크롤링을
  구현**해야 하며, 이 경우 courtauction.go.kr의 이용약관·로봇 배제 정책 위반 소지와 사이트
  개편 시 깨질 위험을 감안해야 한다.
- **온비드(공매) API는 법원경매와 다른 제도**이므로, "법원경매"를 요구하는 사용자에게
  온비드 데이터를 대신 보여주면 안 된다.

## (참고) 연동 시 따를 패턴

향후 실제로 연동한다면, 기존 실거래가 기능의 구조를 그대로 따르는 것이 가장 자연스럽다.

- `server/mcpClient.ts`에 `getAuctionList(lawd_cd, ...)` 같은 함수를 추가
  (CODEF/크롤러 클라이언트를 별도 모듈로 두고 여기서 호출)
- `server/routes.ts`에 `/auctions/list` 같은 신규 엔드포인트 추가
- 가격/조건 필터링이 필요하면 `server/ruleEngine.ts`의 `transactionToMatch()` 구조를
  참고해 `auctionToMatch()` 형태로 모방
- API 키 등 인증 정보는 `region-search.md`의 `KAKAO_REST_API_KEY`처럼 환경변수로 관리하고
  `.env.example`에 추가

## 참고 링크

- [법원경매정보 경매사건검색 API - CODEF](https://developer.codef.io/products/public/each/ck/auction-events)
- [대한민국 법원 경매정보 (courtauction.go.kr)](https://www.courtauction.go.kr/)
- [대한민국 법원 등기정보광장 Open API 안내](https://data.iros.go.kr/rp/oa/openOapiIntro.do)
- [한국자산관리공사_온비드 물건 정보 조회서비스 - 공공데이터포털](https://www.data.go.kr/data/15000837/openapi.do)
- [GitHub - guriguri/cauca: 법원 경매 정보 REST API 서비스 (crawler + rest api)](https://github.com/guriguri/cauca)
- [GitHub - yoiyoy/node-cauca: 법원경매 API](https://github.com/yoiyoy/node-cauca)
