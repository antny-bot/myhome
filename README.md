# Apartment Alert & Analytics Dashboard

국토교통부 아파트 실거래가 오픈 API 및 카카오 지도/주소 API를 연동하여, 사용자가 설정한 관심 조건과 일치하는 실거래 정보를 Telegram 알림과 웹 대시보드로 실시간 전달하고, 수집된 데이터를 로컬 SQLite DB 기반으로 다차원 통계 분석하는 통합 아파트 실거래 모니터링 플랫폼입니다.

---

## 🚀 주요 기능 (Features)

### 1. 실시간 아파트 실거래 감시 & 맞춤형 알림
* **조건별 감시 룰 설정**: 특정 지역(시군구/법정동), 아파트명 키워드, 거래가격(최소~최대), 전용면적(최소~최대), 비교 기준(주차대수, 대단지, 역세권, 신축 등)을 조합하여 맞춤형 감시 룰을 무제한 등록할 수 있습니다.
* **Telegram 메신저 즉시 발송**: 신규 등록된 실거래 매물이 감시 조건과 일치할 경우, 계약일·단지명·층수·면적·거래금액 정보가 포함된 메시지를 텔레그램으로 자동 발송합니다.
* **수집 및 검사 이력 관리**: 룰별 수집 실행 기록(`Check-Runs`) 및 알림 발송 히스토리(`Notifications`)를 대시보드에서 투명하게 확인하고 관리할 수 있습니다.

### 2. 고속 실거래 검색 & 지능형 하이브리드 캐싱
* **3개월 이상 과거 확정 데이터 즉시 서빙 (Cache Hit)**: 이미 로컬 DB에 수집된 3개월 이전 데이터는 외부 API 호출을 생략하고 0.05초 내외로 초고속 서빙하여 공공데이터 API 트래픽을 절감합니다.
* **최근 3개월 최신 거래 실시간 동기화 (Cache Refresh)**: 30일 실거래 신고 유예 규정을 반영하여, 최근 3개월 데이터는 API를 호출해 신규 등록 건을 실시간으로 갱신·동기화합니다.
* **대용량 누락 없는 수집**: 한 달 전체 실거래 데이터를 단일 트랜잭션 배치로 안전하게 적재합니다.

### 3. 다차원 실거래 분석 대시보드
* **시계열 가격 및 거래량 추이**: 월별 평균가, 최대/최소가, 중위값(Median) 및 거래량을 Recharts 기반의 부드러운 시계열 차트로 시각화합니다.
* **Box Plot (상자 수염 그림) 통계**: 평형대별/층수별 가격 분포(Q1, Q3, Min, Max, Median)를 정밀하게 분석할 수 있습니다.
* **단지별 상세 리포트**: 단지 기본 정보(세대수, 주차대수, 사용승인일), 최근 10건 실거래 내역, 평형별/층수별 가격 매트릭스를 제공합니다.
* **면적 및 단위 실시간 변환**: 전용면적 vs 공급면적, 평(3.3㎡) vs ㎡ 단위를 원클릭으로 토글할 수 있습니다.
* **💡 AI 분석 인사이트 (Gemini API)**: 수집된 거래 추이를 바탕으로 Gemini LLM이 시장 동향 및 단지 평가 인사이트를 자동 요약합니다.

### 4. 지하철역 역세권 분석 (Nearby Station)
* **반경별 단지 시각화**: 지하철역 검색 시 반경(300m, 500m, 1,000m) 내 위치한 아파트 단지를 카카오 지도 위에 직관적으로 매핑합니다.
* **수집/미수집 단지 시각적 구분**: 로컬 DB에 수집된 단지와 미수집 단지를 구분 표시하며, 미수집 단지는 "실거래 수집" 버튼으로 즉시 백엔드 적재를 요청할 수 있습니다.

### 5. 지역별 아파트 지도 탐색 (Region Map)
* **시군구 단지 클러스터 및 평단가 히트맵**: 지역 내 전체 단지의 위치, 최신 거래가, 평균 평단가, 거래량을 지도 마커와 리스트로 동시에 비교 탐색할 수 있습니다.
* **원클릭 단지 분석 연동**: 지도 위의 마커나 목록 카드를 클릭하면 단지 분석 리포트로 즉시 이동합니다.

### 6. 카카오 Local & 행안부 주소 자동완성
* **정밀 지역코드 매핑**: 사용자가 입력한 자연어 주소에서 시군구 5자리 지역코드(`LAWD_CD`)를 자동 매핑하고 법정동 후보를 드롭다운으로 안내합니다.
* **장애 복구 폴백 (Fallback)**: 카카오 API 키가 없거나 호출 제한 시 로컬 DB 지역 사전으로 자동 대체됩니다.

### 7. 데이터베이스 웹 어드민 (Database Admin)
* **웹 SQL 질의 콘솔**: 브라우저에서 로컬 SQLite DB에 직접 쿼리를 실행하고 결과를 확인할 수 있습니다.
* **단지 메타데이터 관리**: 위경도 좌표, 지번/도로명 주소, 총 세대수, 주차공간, 사용승인일 등의 메타데이터를 관리합니다.
* **카카오 지도 기반 수동 좌표 보정 툴 (`CoordPickerMap`)**: 좌표가 누락되었거나 보정이 필요한 단지를 지도 위에서 직접 클릭하여 위치를 지정할 수 있습니다.
* **일괄 지오코딩 배치**: 미매핑 단지의 위경도를 백그라운드에서 일괄 수집하는 배치 제어기를 탑재했습니다.

### 8. 수집 현황 통계 & 감사 로그
* **수집 현황 대시보드 (`Collect Page`)**: 날짜별/월별 실거래 수집 건수 및 평균 평단가 추이를 확인하고, 특정 일자를 클릭하여 지역별 수집 상세를 드릴다운할 수 있습니다.
* **사용자 활동 로그 (`Activity Log`)**: 페이지 조회, 검색, 규칙 생성, 설정 변경 등 사용자 활동을 상세 기록하고 DAU/WAU/MAU 통계를 제공합니다.

### 9. 맞춤형 UI 테마 & 다국어 지원 (i18n)
* **UI 테마 커스터마이징**: WDS Blue, Violet, Green의 주조색 테마, 글자 크기(12px~22px), 폰트(Noto Sans KR / Noto Serif KR)를 실시간 변경할 수 있습니다.
* **완벽한 다국어 (한국어 / English)**: 모든 사용자 화면 텍스트가 다국어 사전을 통해 렌더링되며 언어를 원클릭으로 전환할 수 있습니다.
* **반응형 모바일 퍼스트**: 390px 스마트폰부터 태블릿, 와이드 데스크톱까지 최적화된 레이아웃을 제공합니다.

### 10. 보안 및 계정 격리 (Google OAuth 2.0)
* **Google OAuth 2.0 로그인**: 비인가 사용자의 접근을 차단하고 안전한 세션 관리를 제공합니다.
* **이메일 화이트리스트 (`ALLOWED_EMAILS`)**: 등록된 관리자 및 허용 사용자만 대시보드에 접근할 수 있습니다.
* **개인별 API 키 설정**: 텔레그램 봇 토큰, 카카오 API 키, Gemini API 키를 사용자 계정별로 독립 저장하여 사용할 수 있습니다.

---

## 🛠️ 기술 구성

* **Frontend**: React (v19), TypeScript, Vite, Tailwind CSS, Recharts
* **Backend**: Node.js (v24), TypeScript, Express, `tsx`
* **Database**: SQLite (Node.js 내장 `node:sqlite` 활용, `data/myhome.db` 파일 저장)
* **Maps SDK**: Kakao Maps SDK (비동기 동적 로드)
* **External APIs**: 
  * 국토교통부 아파트매매 실거래 상세 자료 오픈 API
  * 카카오 Local API & 행정안전부 도로명주소 오픈 API
  * Telegram Bot API
  * Google Gemini API (AI 인사이트)

```text
         React Dashboard (Web) ◀────────────────────────┐
                 │                                      │ (Kakao Maps JS API)
                 ▼ (REST API)                           │
   Express Server + Scheduler ──▶ Telegram Bot          │
                 │                                      │
                 ├─▶ (Direct fetch) ──▶ 국토부 OpenAPI (실거래 데이터)
                 ├─▶ (Direct fetch) ──▶ 카카오 Local API / 행안부 JUSO (지오코딩/주소 자동완성)
                 ├─▶ (LLM SDK)       ──▶ Gemini API (AI 분석 인사이트 생성)
                 │
                 ▼ (Local storage)
         [SQLite (myhome.db)]
```

---

## 📚 개발자 및 아키텍처 문서 안내

시스템 아키텍처, 데이터베이스 스키마 및 인덱스 구조, 백엔드 모듈러 라우팅, 프론트엔드 컴포넌트 설계 등 세부 개발 관련 내용은 **개발 문서(docs/)** 및 **[AGENTS.md](AGENTS.md)**를 참고하시기 바랍니다.

| 순번 | 개발/수정 부문 | 필독 개발문서 |
|:---:|---|---|
| **01** | **프로젝트 구조, 기술 스택, 모듈 패턴** | [docs/01_OVERVIEW.md](docs/01_OVERVIEW.md) |
| **02** | **국토부 OpenAPI 연동 & 실거래 캐싱 정책** | [docs/02_CACHE_POLICY.md](docs/02_CACHE_POLICY.md) |
| **03** | **백엔드 Express 서버 & 자동 수집 스케줄러** | [docs/03_BACKEND_SCHEDULER.md](docs/03_BACKEND_SCHEDULER.md) |
| **04** | **SQLite DB 스키마, 인덱스 & SQL 최적화** | [docs/04_DATABASE.md](docs/04_DATABASE.md) |
| **05** | **프론트엔드 UI, Recharts 차트, 반응형/i18n** | [docs/05_DESIGN.md](docs/05_DESIGN.md) |
| **06** | **개발 진행 현황 & Phase별 로드맵** | [docs/06_ROADMAP.md](docs/06_ROADMAP.md) |
| **07** | **지역 검색 및 주소 자동완성 기능** | [docs/07_REGION_SEARCH.md](docs/07_REGION_SEARCH.md) |
| **08** | **부동산원 OpenAPI 명세 및 호출 가이드** | [docs/08_RONE_API.md](docs/08_RONE_API.md) |
| **09** | **시스템 아키텍처 가이드 (데이터 흐름·연동)** | [docs/09_ARCHITECTURE.md](docs/09_ARCHITECTURE.md) |

---

## ⚙️ 설정 주입 (.env 및 config.yaml)

### 환경 변수 설정 (`.env`)
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 값들을 기입합니다.

```env
PORT=4174
CHECK_INTERVAL_SECONDS=300

# 공공데이터포털 국토부 실거래가 API 일반 인증키 (필수)
DATA_GO_KR_API_KEY=YOUR_PUBLIC_DATA_PORTAL_KEY

# 카카오 Local API REST 키 (지역명 자동완성 및 백엔드 지오코딩용)
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY

# 카카오 지도 JavaScript API 키 (웹 대시보드 지도 시각화용)
KAKAO_JAVASCRIPT_KEY=YOUR_KAKAO_JAVASCRIPT_KEY

# 행정안전부 도로명주소 오픈 API 승인키 (선택, 카카오 API 키 부재 시 대체)
JUSO_CONFM_KEY=YOUR_JUSO_CONFIRM_KEY

# Telegram 알림 설정 (선택)
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID

# SQLite 적재 사용 플래그
GRAPH_DB_ENABLED=true

# Gemini API 설정 (대시보드 내 AI 인사이트 생성용)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Google OAuth 2.0 로그인 설정 (보안 필수)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:4174/api/auth/google/callback

# 대시보드 접근을 허용할 구글 이메일 목록 (쉼표 구분)
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
```

---

## 📦 로컬 설치 및 실행

### 1. 의존성 설치
```powershell
npm install
```

### 2. 전체 빌드 (workspaces 순차 빌드)
```powershell
npm run build
```

### 3. 개발 서버 실행 (Frontend + Backend 동시 기동)
```powershell
npm run dev
```

* **웹 대시보드**: <http://127.0.0.1:5174> (Vite React Web)
* **Backend API**: <http://127.0.0.1:4174>

---

## 🐳 Docker 배포 (Synology NAS & Docker Compose)

단일 컨테이너로 빌드하여 배포하며, Express 백엔드가 빌드된 React 대시보드 정적 파일을 서빙합니다.

```bash
docker-compose up -d
```
* **대시보드 및 API 주소**: <http://localhost:4174>
* **데이터 보존**: SQLite 데이터베이스는 호스트의 `./data` 디렉토리에 볼륨 매핑되어 안전하게 유지됩니다.

---

## 📊 주요 REST API 엔드포인트

### 인증 및 사용자 설정
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/auth/google` | Google 로그인 리디렉션 |
| `GET` | `/api/auth/google/callback` | Google OAuth 콜백 처리 및 세션 발급 |
| `GET` | `/api/auth/me` | 현재 사용자 세션 정보 조회 |
| `POST` | `/api/auth/logout` | 세션 종료 및 로그아웃 |
| `GET` | `/api/user-config` | 개인 API 키(Telegram/Kakao/Gemini) 조회 |
| `POST` | `/api/user-config` | 개인 API 키 저장 및 갱신 |

### 감시 조건 및 알림
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/rules` | 관심 알림 조건 목록 조회 |
| `POST` | `/api/rules` | 신규 관심 조건 등록 |
| `PATCH` | `/api/rules/:id` | 관심 조건 수정 및 활성화/비활성화 |
| `DELETE`| `/api/rules/:id` | 관심 조건 삭제 |
| `POST` | `/api/rules/:id/run` | 관심 조건 즉시 수집 및 검사 실행 |
| `GET` | `/api/check-runs` | 수집 및 룰 매칭 이력 조회 |
| `GET` | `/api/notifications` | 발송된 알림 내역 조회 |

### 실거래 수집 및 지역 탐색
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/regions/search` | 지역명 주소 자동완성 검색 |
| `GET` | `/api/apartments/list` | 특정 지역(법정동) 아파트 단지 목록 조회 |
| `GET` | `/api/transactions` | 국토부 실거래 데이터 수집 및 조회 |
| `GET` | `/api/transactions/batch` | 특정 기간 일괄 실거래 조회 |

### SQLite 분석 및 대시보드
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/graph/stats` | 로컬 DB 전체 레코드 통계 |
| `GET` | `/api/graph/db-regions` | DB 수집 완료 지역 목록 |
| `GET` | `/api/graph/regions-summary` | 수집 지역별 요약 통계 |
| `GET` | `/api/graph/complex/:name/trend` | 특정 단지 월별 평단가 추이 |
| `GET` | `/api/graph/complex/:name/detail` | 특정 단지 상세 리포트 (평형/층별 통계 및 최근 거래) |
| `GET` | `/api/graph/nearby-station` | 지하철역 반경 내 아파트 단지 조회 |
| `GET` | `/api/graph/collect-stats/daily` | 일자별 실거래 수집 통계 |
| `GET` | `/api/graph/collect-stats/monthly` | 등록월별 실거래 수집 통계 |
| `GET` | `/api/graph/collect-stats/region` | 특정 수집일/월의 지역별 수집 상세 |
| `CRUD`| `/api/graph/presets` | 대시보드 조회 필터 프리셋 관리 |
| `CRUD`| `/api/graph/insights` | Gemini AI 분석 인사이트 관리 |

### 시스템 관리 & 활동 로그
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/system-config` | 시스템 전체 환경설정 마스킹 조회 (관리자 전용) |
| `POST` | `/api/system-config` | 시스템 환경설정 갱신 (관리자 전용) |
| `PUT` | `/api/complexes/coords` | 단지 위경도 좌표 수동 수정 |
| `POST` | `/api/complexes/coords/reset` | 특정 단지 좌표 초기화 |
| `POST` | `/api/geocoding/reset-failures` | 지오코딩 실패 상태 초기화 및 재시도 활성화 |
| `GET` | `/api/logs` | 사용자 활동 로그 목록 및 페이징 조회 (관리자 전용) |
| `GET` | `/api/logs/stats` | 활동 유형별 통계 및 DAU/WAU/MAU 조회 (관리자 전용) |
