# Apartment Alert & Analytics Dashboard (myhome)

국토교통부 아파트 실거래가 공공 데이터와 공간/지도 API를 연동하여, 관심 조건의 실거래 정보를 Telegram으로 실시간 전달하고 다차원 통계 분석과 AI 시장 인사이트를 제공하는 모니터링 대시보드 플랫폼입니다.

---

## 주요 특징

- **실시간 감시 및 알림**: 지역, 단지명, 금액, 면적별 감시 규칙 설정 및 Telegram 즉시 알림
- **초고속 하이브리드 캐시**: 과거 3개월 이전 거래 로컬 캐시 즉시 응답(0.05초 내외), 최근 3개월 데이터 실시간 동기화
- **다차원 통계 시각화**: 월별 시계열 가격/거래량 추이, 평형별/층수별 Box Plot 가격 분포 분석
- **AI 시장 진단**: 최신 실거래 흐름 기반 Gemini LLM 단지 동향 및 가격 평가 리포트 생성
- **공간/역세권 분석**: 지하철역 기준 도보 반경(300m/500m/1,000m) 단지 탐색 및 지역별 평단가 히트맵
- **모바일 퍼스트 반응형**: 스마트폰(390px)부터 태블릿, 데스크톱까지 지원하는 인터페이스 및 i18n(한국어/영어) 지원

---

## 기술 스택

| 영역 | 기술 스택 | 설명 |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS | 모바일 퍼스트 반응형 UI, i18n 다국어 지원 |
| Data Visualization | Recharts | 시계열 라인/바 차트, Box Plot 통계 시각화 |
| Backend | Node.js (v24), Express, TypeScript, tsx | REST API, KST 룰 엔진, 스케줄러 내장 |
| Database | SQLite (`node:sqlite`) | FTS5 전문 검색, WAL 모드, LRU 캐시 적용 |
| AI Integration | Google Gemini API | 아파트 단지별 실거래 트렌드 정성 분석 |
| External APIs | 국토교통부 실거래가 API, 카카오 Local API, 행안부 주소 API, Telegram Bot API | 공공 데이터 수집 및 메신저 연동 |
| Infrastructure | Docker, Docker Compose, GitHub Actions | 멀티스테이지 컨테이너 빌드, GHCR 자동 배포 |
| Monorepo | npm workspaces | 3개 워크스페이스(`shared`, `collector`, `dashboard`) |

---

## 시스템 구조

```
myhome/
├── packages/
│   ├── shared/        # 공통 도메인 DB 계층, 공공 API 클라이언트, XML 파서, 공통 타입
│   ├── collector/     # 국토부 실거래가 자동 수집 및 적재 배치 엔진
│   └── dashboard/     # Express 백엔드 서버(API, 스케줄러) 및 Vite React 웹 프론트엔드
├── docs/              # 상세 개발 및 아키텍처 기술 문서
├── scripts/           # i18n 무결성 검사 등 유지보수 스크립트
├── Dockerfile         # 컨테이너 멀티스테이지 빌드 정의
└── docker-compose.yml # 배포용 Compose 템플릿
```

---

## 기능 명세

### 1. 실거래 모니터링 & 알림
- **감시 규칙 커스터마이징**: 시군구, 법정동, 아파트 단지명, 가격 범위(최소/최대), 전용면적 범위(최소/최대) 조합
- **Telegram 연동**: 신규 등록 건 발생 시 계약일, 단지명, 층수, 전용면적, 거래금액 즉시 발송
- **실행 관리**: 규칙별 최근 검사 일시(`Check-Runs`) 및 발송 히스토리(`Notifications`) 대시보드 조회
- **수동 즉시 검사**: 스케줄 주기 외 웹 대시보드에서 신규 거래 즉시 수집/대조 트리거

### 2. 검색 & 스마트 캐시
- **주소 자동완성**: 카카오 및 행안부 API 기반 시군구/법정동 및 단지명 실시간 검색
- **하이브리드 캐시 전략**:
  - 과거 3개월 이전 거래: 로컬 SQLite에서 즉시 응답 (평균 0.05초 내외)
  - 최근 3개월 거래: 30일 신고 유예 기간을 고려하여 외부 공공 API 실시간 동기화
- **지역 일괄 적재**: 단지 검색 시 관할 시군구(5자리 법정동 코드) 단위 백그라운드 선적재

### 3. 다차원 통계 & 시각화
- **시계열 분석**: 월별 평균/최고/최저/중위 거래가 및 월간 거래량 추이 차트
- **Box Plot 통계**: 평형대별/층수별 가격 분포(최소값, Q1, 중앙값, Q3, 최대값) 및 이상치 파악
- **단지 종합 리포트**: 단지 기본 정보(세대수, 주차공간, 준공연월), 최근 10건 실거래 목록, 매트릭스
- **단위 변환 토글**: 전용면적(실평수) ↔ 공급면적(분양평수), ㎡ ↔ 평(3.3㎡) 원클릭 전환

### 4. 공간 & 역세권 분석
- **지하철 역세권 탐색**: 기준 역사로부터 도보 반경(300m, 500m, 1,000m) 내 위치 단지 매핑
- **지역 클러스터 지도**: 시군구 전체 단지 지리적 위치, 최신 거래가, 평단가(3.3㎡당 가격) 히트맵
- **좌표 보정 도구 (`CoordPickerMap`)**: 위치 좌표가 누락되거나 오류가 있는 단지를 지도 클릭으로 직접 보정
- **수집 연동**: 미수집 단지에 대한 원클릭 실거래 수집 요청 및 자동 지오코딩 일괄 매핑

### 5. AI 시장 분석
- **Gemini LLM 연동**: 수집된 최근 거래 추이 데이터를 바탕으로 단지별 시세 동향 요약
- **정성적 의사결정 보조**: 급등/급락 분석, 거래량 회복 강도, 매수/매도 검토 코멘트 자동 도출

### 6. 플랫폼 & 보안
- **사용자 인증**: Google OAuth 2.0 기반 세션 인증 및 접근 허용 이메일 화이트리스트 검증
- **독립 설정 관리**: Telegram 봇 토큰, 카카오 API 키, Gemini API 키 계정별 독립 분리
- **UI 개인화**: 다크/라이트 모드, WDS Blue/Violet/Green 액센트 테마, Noto Sans/Serif 서체 및 폰트 크기 조절
- **글로벌라이제이션**: 한국어/영어 i18n 완벽 대응 및 390px 모바일 뷰 최적화 레이아웃

---

## 시작 가이드

### 요구 사항
- Node.js >= 22.12.0
- npm >= 10.0.0

### 설치 및 환경 설정

```bash
# 1. 저장소 복제 및 의존성 설치
git clone https://github.com/your-repo/myhome.git
cd myhome
npm install

# 2. 환경 변수 설정
cp packages/dashboard/.env.example packages/dashboard/.env
```

주요 환경 변수:
- `MOLIT_API_KEY`: 국토교통부 실거래가 공공 데이터 API 키
- `KAKAO_REST_API_KEY`: 카카오 로컬/지도 REST API 키
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: 텔레그램 봇 토큰 및 알림 수신 대상 채팅 ID
- `GEMINI_API_KEY`: Google Gemini API 키 (선택)
- `ALLOWED_EMAILS`: 구글 로그인 접근 허용 이메일 목록 (쉼표 구분)

### 개발 서버 실행

```bash
# Frontend(Vite) + Backend(Express) + 자동 수집 스케줄러 동시 실행
npm run dev
```

### 빌드 및 배포

```bash
# 전체 워크스페이스 순차 빌드
npm run build

# Docker Compose 실행
docker compose up -d --build
```

---

## 기술 개발 문서 안내

상세 아키텍처, 데이터베이스 스키마, 수집 정책 및 연동 명세는 `docs/` 디렉터리에 수록되어 있습니다.

| 순번 | 문서 | 주요 기술 내용 |
|:---:|---|---|
| 01 | [프로젝트 개요 (01_OVERVIEW.md)](docs/01_OVERVIEW.md) | 모노레포 구조, 기술 스택, 핵심 구현 패턴, 개발 현황 |
| 02 | [캐싱 및 수집 정책 (02_CACHE_POLICY.md)](docs/02_CACHE_POLICY.md) | 국토부 OpenAPI 연동, 하이브리드 캐시, 호출 안전 및 재시도 정책 |
| 03 | [백엔드 & 스케줄러 (03_BACKEND_SCHEDULER.md)](docs/03_BACKEND_SCHEDULER.md) | Express 서버 구조, KST 룰 엔진, 일일 자동 수집 스케줄러, 환경 변수 |
| 04 | [데이터베이스 가이드 (04_DATABASE.md)](docs/04_DATABASE.md) | SQLite 테이블 DDL, 복합 인덱스, FTS5 전문 검색, SQL 최적화 |
| 05 | [디자인 및 화면 가이드 (05_DESIGN.md)](docs/05_DESIGN.md) | 시맨틱 디자인 토큰, 반응형 브레이크포인트, 타이포그래피, 차트 규격 |
| 06 | [프로젝트 로드맵 (06_ROADMAP.md)](docs/06_ROADMAP.md) | Phase 1~8.5 완료 현황 및 Phase 9 이후 진행 계획 |
| 07 | [지역 검색 & 자동완성 (07_REGION_SEARCH.md)](docs/07_REGION_SEARCH.md) | 카카오 Local API 연동, 주소 검색 디바운스, 장애 폴백 메커니즘 |
| 08 | [부동산원 API 명세 (08_RONE_API.md)](docs/08_RONE_API.md) | 한국부동산원 전국주택가격동향 통계 조회 API 연동 가이드 |
| 09 | [시스템 아키텍처 (09_ARCHITECTURE.md)](docs/09_ARCHITECTURE.md) | 3계층 컴포넌트 구조, 데이터 흐름, REST API 엔드포인트 명세, Docker 배포 |
| 10 | [건축물대장 API 명세 (10_BUILDING_REGISTER_API.md)](docs/10_BUILDING_REGISTER_API.md) | 국토부 건축HUB 건축물대장 오픈 API 연동 명세 |
| 11 | [표준 에러 코드 (11_ERROR_CODES.md)](docs/11_ERROR_CODES.md) | RFC 7807 호환 API 표준 에러 규격 및 클라이언트 대응 가이드 |
