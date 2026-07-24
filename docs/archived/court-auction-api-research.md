# 법원경매 정보 API 조사

> 실거래가 조회 외 "법원경매 매물" 조회 기능 추가 검토용 조사 자료. **결론: 법원경매정보(courtauction.go.kr) 무료 제공 공식 오픈 API 없음.** 연동 필요 시 본 문서 옵션 비교 참고.

## 배경

`server/mcpClient.ts` `getApartmentPrices()` / `getApartmentList()`는 국토교통부 실거래가 데이터를 MCP(`AptInfo-*`) 경유 조회함. 동일 패턴으로 "법원경매 매물(진행 중 경매 사건)" 추가 위해 한국 법원경매 정보 API 존재 여부 및 유/무료 조사.

## 옵션 비교

| 옵션 | 비용 | 비고 |
|------|------|------|
| **법원경매정보 (courtauction.go.kr)** | - | 대법원 공식 사이트. 일반 개발자용 OpenAPI/REST API 미공개. `openapi.scourt.go.kr` 형태 연계 API 존재하나 기관 간 연계용으로 외부 접근 제한(403). |
| **공공데이터포털 (data.go.kr)** | 무료 | "법원경매 매물 리스트" 제공 오픈 API 없음. 주택금융공사 "법적절차진행이력정보" 등 파일 데이터 있으나 경매 매물 목록과 다름. |
| **온비드 OnBid (data.go.kr 경유)** | 무료 | 공공데이터포털 오픈 API 존재. 단, 이는 **공매**(국세 압류재산·캠코 자산 매각)이며 **법원경매와 법적 절차·운영 주체 다른 별개 제도** — 혼동 주의 |
| **CODEF (developer.codef.io)** | **유료 (사용량 기반 과금)** | "법원경매정보 경매사건검색 API" 제공 민간 API 중개 플랫폼. 정형 데이터 가공 제공. 종량제 구독 과금 — 단가 가입 후 확인 필요 |
| **쿠콘(Kuckon) 등 데이터 브로커** | 유료 | "대법원 법원경매정보 조회" API 제공. 기업 계약 기반으로 소규모 개인 프로젝트에 부담 가능성 있음 |
| **지지옥션 / 옥션원(구 굿옥션) / 탱크옥션 / 태인 등 민간 경매정보 서비스** | 유료 (B2C 구독) | 현장조사·사진·등기 분석 등 가공 데이터 포함. API 제공 제한적이며 별도 제휴/계약 필요 |
| **오픈소스 비공식 크롤러** (`guriguri/cauca`, `yoiyoy/node-cauca` 등, GitHub) | 무료 | courtauction.go.kr 크롤링해 REST API화한 프로젝트. 무료이나 비공식으로 약관 위반 가능성 및 사이트 구조 변경 시 유지보수 리스크 존재 |

## 결론 및 추천

- **합법·안정적 경로 기준 최선책은 CODEF "법원경매정보 경매사건검색 API"임**. 종량제 과금으로 초기 비용 부담 적으나 가입 후 단가 확인 필요.
- **무료화 위해 비공식 크롤러(`cauca` 계열) 운영 또는 자체 크롤링 구현 필요**. courtauction.go.kr 약관·로봇 배제 정책 위반 및 사이트 개편 시 작동 중단 리스크 존재.
- **온비드(공매)는 법원경매와 다른 제도임**. "법원경매" 요청에 온비드 데이터 제공 금지.

## (참고) 연동 시 따를 패턴

실거래가 기능 구조 모방해 연동 설계.

- `server/mcpClient.ts`에 `getAuctionList(lawd_cd, ...)` 추가 (CODEF/크롤러 클라이언트 별도 호출).
- `server/routes.ts`에 `/auctions/list` 엔드포인트 추가.
- 필터링 필요 시 `server/ruleEngine.ts` `transactionToMatch()` 참고해 `auctionToMatch()` 구현.
- API 키 등 인증 정보는 `region-search.md` `KAKAO_REST_API_KEY`처럼 환경변수 관리 및 `.env.example` 추가.

## 참고 링크

- [법원경매정보 경매사건검색 API - CODEF](https://developer.codef.io/products/public/each/ck/auction-events)
- [대한민국 법원 경매정보 (courtauction.go.kr)](https://www.courtauction.go.kr/)
- [대한민국 법원 등기정보광장 Open API 안내](https://data.iros.go.kr/rp/oa/openOapiIntro.do)
- [한국자산관리공사_온비드 물건 정보 조회서비스 - 공공데이터포털](https://www.data.go.kr/data/15000837/openapi.do)
- [GitHub - guriguri/cauca: 법원 경매 정보 REST API 서비스 (crawler + rest api)](https://github.com/guriguri/cauca)
- [GitHub - yoiyoy/node-cauca: 법원경매 API](https://github.com/yoiyoy/node-cauca)
