# Apartment Alert

국토교통부 아파트 실거래가 오픈 API 및 PlayMCP `mcp-gateway`의 지역/단지 정보를 조회하여, 사용자가 저장한 감시 조건과 일치하는 실거래 결과를 웹 대시보드와 Telegram으로 실시간 알려주는 아파트 실거래 모니터링 시스템입니다.

---

## 🚀 주요 특징 및 개선 사항 (v0.3.2)

* **지능형 로컬 DB 캐싱 (v0.3.2)**: 국토부 OpenAPI 호출 트래픽을 아끼기 위해 3개월이 초과된 과거 고정 데이터는 SQLite DB에 적재된 내역이 있을 시 API 호출을 완전 생략하고 로컬에서 즉시 서빙(0.05초 내외)합니다. 최근 3개월 데이터는 30일 신고 유예 규정을 반영해 API를 매번 호출하여 최신 신고 건을 실시간으로 갱신합니다.
* **국토부 OpenAPI 직접 연동**: 10건 조회 한계가 있는 외부 MCP 서버를 우회하고 공공데이터포털 오픈 API를 직접 호출(`numOfRows=9999`)하여 한 달 전체 데이터를 누락 없이 수집합니다.
* **로컬 SQLite 데이터베이스 (`node:sqlite`)**: 외부 클라우드 DB(Neo4j) 의존성 및 Native Addon 컴파일 문제를 완전히 해결하기 위해, Node.js 24 내장 SQLite 모듈을 도입하여 파일 기반(`data/myhome.db`)으로 빠르게 통계를 집계하고 관리합니다.
* **단일 서버 통합 스케줄러**: 데이터 수집 봇(Collector)을 대시보드 서버 내에 탑재하여, 별도의 주기적 크론 프로세스를 띄울 필요 없이 하나의 서버 안에서 수집과 웹 대시보드가 통합 구동됩니다.
* **Vite 웹 빌드 최적화**: 복잡하고 무거운 노드-링크 시각화(`react-force-graph-2d`)를 걷어내고, 4개의 통계 탭(종합 현황, 단지별 분석, 드릴다운, AI 인사이트) 중심으로 화면을 경량화했습니다.
* **Docker화 및 CI/CD 자동 배포**: Synology Container Manager에서 Docker Compose를 통해 바로 기동할 수 있도록 Docker 설정이 완비되었으며, GitHub Actions를 통해 Release 시 이미지 빌드 및 자동 용량 정리 파이프라인을 지원합니다.

---

## 🛠️ 기술 구성

* **Frontend**: React (v19), TypeScript, Vite, Tailwind CSS
* **Backend**: Node.js (v24), TypeScript, Express
* **Database**: SQLite (Node.js 내장 `node:sqlite` 활용, `data/myhome.db` 파일 저장)
* **XML Parser**: `fast-xml-parser`
* **Data Sources**: 
  * 국토교통부 아파트매매 실거래 상세 자료 오픈 API (실거래가 수집)
  * PlayMCP `mcp-gateway` (지역코드 검색 및 아파트 단지 목록 보조 연동)
* **Notification**: Telegram Bot API

```text
       React Dashboard
              │
              ▼ (REST API)
   Express Server + Scheduler ──▶ Telegram Bot
              │
              ├─▶ (Direct fetch) ──▶ 국토부 OpenAPI (실거래 데이터)
              ├─▶ (mcporter)      ──▶ PlayMCP mcp-gateway (지역/단지 보조)
              │
              ▼ (Local storage)
      [SQLite (myhome.db)]
```

---

## 🔐 보안 및 로그인 (Google OAuth)

서비스 보안 및 외부 무단 접근을 방지하기 위해 Google OAuth 2.0 기반의 로그인 인증 체계가 구축되어 있습니다.
* **접근 제한 (Whitelist)**: 이메일 화이트리스트(`ALLOWED_EMAILS`) 제어가 포함되어 있습니다. 이 리스트가 비어있거나, 목록에 등록되지 않은 구글 계정으로 로그인할 경우 대시보드 접근이 전면 거부됩니다.
* **최초 구동 시 필수 조치**: 최초 서버를 띄우기 전 반드시 `.env` 파일에 `ALLOWED_EMAILS`를 최소 1개 이상 기입해 두어야 대시보드에 정상적으로 첫 진입을 할 수 있습니다.

---

## 📋 사전 준비

다음 환경 변수 및 사전 설정이 필요합니다.

1. **공공데이터포털(data.go.kr) 아파트매매 실거래 상세 자료 API 신청**:
   * API 신청 후 발급받은 일반 인증키를 준비합니다.
2. **Node.js 24 이상**:
   * 내장 SQLite 기능(`node:sqlite`) 활성화를 위해 **Node.js v24** 이상 실행 환경이 필요합니다.
3. **`mcporter` CLI**:
   * 지역 검색 자동완성을 위해 `mcporter`가 로컬에 설치되어 있고 `mcp-gateway` 연결 상태가 유효해야 합니다.

---

## ⚙️ 설정 주입 (.env 및 config.yaml)

### 1. 환경 변수 설정 (`.env`)
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 값들을 기입합니다.

```env
PORT=4174
CHECK_INTERVAL_SECONDS=300

# 공공데이터포털 국토부 실거래가 API 일반 인증키 (필수)
DATA_GO_KR_API_KEY=YOUR_PUBLIC_DATA_PORTAL_KEY

# 카카오 Local 주소 검색 REST API 키 (선택, 지역명 자동완성용)
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY

# Telegram 알림 설정 (선택)
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID

# SQLite 적재 스위치
GRAPH_DB_ENABLED=true

# Google OAuth 2.0 로그인 설정 (보안 필수)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:4174/api/auth/google/callback
# 대시보드 접근을 허용할 구글 이메일 목록 (쉼표로 구분하여 기재, 빈칸일 시 로그인 불가)
ALLOWED_EMAILS=user1@gmail.com,user2@gmail.com
```

### 2. YAML 설정 파일 (`config.yaml`)
포트 지정을 위해 `.env` 파일 외에도 루트 디렉토리의 `config.yaml` (또는 `config.yml`, `app.yaml`, `app.yml`)을 사용할 수 있습니다.
```yaml
port: 4174
```
**포트 적용 우선순위**:
1. 시스템 환경 변수 (`process.env.PORT`)
2. `.env` 파일 내 `PORT`
3. YAML 설정 파일 내 `port` (또는 `PORT`)
4. 기본 포트 (`4174`)

---

## 📦 로컬 설치 및 실행

### 1. 의존성 설치
```powershell
npm install
```

### 2. 전체 빌드
```powershell
npm run build
```

### 3. 개발 서버 실행 (Frontend + Backend 동시 기동)
```powershell
npm run dev
```

* **웹 대시보드**: <http://127.0.0.1:5174> (Vite Web)
* **Backend API**: <http://127.0.0.1:4174>

---

## 🐳 Docker 배포 (Synology Container Manager 및 일반 Docker)

단일 컨테이너로 빌드하여 배포하며, Express 백엔드가 빌드된 React 대시보드 화면을 함께 서빙합니다.

### 1. Synology Container Manager 배포 방법
1. Synology NAS **Container Manager**에서 **프로젝트** 탭 -> **생성**을 선택합니다.
2. `docker-compose.yml 작성`을 선택한 뒤, 프로젝트 루트의 [docker-compose.yml](file:///e:/apps/myhome/docker-compose.yml) 파일 내용을 복사해 붙여넣습니다.
3. 생성 시 설정 환경 변수에 필수 API 키 정보와 Telegram 챗 ID 정보를 입력하고 시작합니다.

### 2. Docker Compose로 로컬 기동
루트 경로에 `.env` 및 `docker-compose.yml`이 존재하는 상태에서 아래 명령을 실행합니다.
```bash
docker-compose up -d
```
* **대시보드 및 API 주소**: <http://localhost:4174>
* **데이터 보존**: SQLite 데이터베이스는 호스트의 `./data` 디렉토리에 볼륨 매핑되어 안전하게 유지됩니다.

### 3. CI/CD 및 이미지 관리 (GitHub Actions)
- **Release 자동 빌드**: GitHub 리포지토리의 Release가 생성되면, 자동으로 Docker 이미지가 빌드되어 GitHub Container Registry (`ghcr.io`)로 업로드됩니다.
- **오래된 이미지 자동 정리**: 저장 용량 관리를 위해 매주 월요일 KST 새벽 3시에 최근 10개 버전 및 `latest` 이미지를 제외하고 가장 오래된 패키지 버전을 자동으로 정리하는 청소 워크플로우(`cleanup-ghcr.yml`)가 동작합니다.

---

## ⚡ 캐싱 및 수집 정책

이 시스템은 국토교통부 OpenAPI 호출 트래픽을 아끼고 사용자 조회의 반응 감도를 비약적으로 향상시키기 위해 **지능형 하이브리드 캐싱 정책**을 구현하고 있습니다.

* **과거 데이터 (거래월 기준 최근 3개월 초과 과거)**:
  - 실거래 신고 유예 기간(30일)이 완전히 지난 고정 상태의 데이터입니다. SQLite DB에 조회 조건인 지역코드(`LAWD_CD`) 및 거래월에 적재된 실거래 내역이 **1건이라도 존재**하면, 외부 국토부 API 호출을 완전히 생략(`Cache Hit`)하고 로컬 DB 데이터를 즉각 반환합니다.
* **최근 데이터 (거래월 기준 최근 3개월 이내)**:
  - 실시간으로 새로운 실거래 계약 건의 신고 등록이 활발히 진행되는 영역입니다. 로컬 DB의 데이터 존재 여부와 무관하게 **반드시 외부 국토부 API를 호출**(`Cache Miss/Refresh`)하여 최신 데이터를 반영하고 로컬 SQLite와 그래프 DB를 갱신(Upsert)합니다.

---

## 📊 주요 API 라우팅

### 인증 및 보안 (Google OAuth)
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/auth/google` | Google 로그인 페이지로 리디렉션 |
| `GET` | `/api/auth/google/callback` | Google OAuth 콜백 처리 및 세션 발급 |
| `GET` | `/api/auth/me` | 현재 사용자 세션 및 로그인 정보 조회 |
| `POST` | `/api/auth/logout` | 사용자 세션 만료 및 로그아웃 |

### 기본 규칙 및 모니터링 API
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/health` | Backend 상태 확인 |
| `GET` | `/api/config` | 시스템 환경 설정 확인 |
| `GET` | `/api/rules` | 관심 알림 조건 목록 |
| `POST` | `/api/rules` | 관심 알림 조건 생성 |
| `PATCH` | `/api/rules/:id` | 관심 알림 조건 수정 및 상태 변경 |
| `POST` | `/api/rules/:id/run` | 관심 조건 즉시 수집 및 검사 실행 |
| `GET` | `/api/check-runs` | 수집 및 룰 매칭 이력 조회 |
| `GET` | `/api/notifications` | 발송된 알림 이력 |

### SQLite 실거래 분석 API
| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/graph/stats` | SQLite DB 전체 레코드 통계 |
| `GET` | `/api/graph/complex/:name/trend` | 특정 단지의 월별 실거래 평단 단가 추이 |
| `GET` | `/api/graph/region/:lawdCode/trend` | 특정 지역 소속 단지들의 월별 거래 트렌드 |
| `GET` | `/api/graph/search` | 기간, 지역, 아파트명, 평수 필터 조합 검색 |
| `GET` | `/api/graph/drilldown/regions` | 시/도 레벨 실거래 통계 드릴다운 |
| `GET` | `/api/graph/drilldown/complexes` | 단지 레벨 실거래 통계 드릴다운 |
| `GET` | `/api/graph/drilldown/areas` | 평형대별 실거래 통계 드릴다운 |
| `GET` | `/api/graph/complex/:name/detail` | 단지 상세 (평수, 층별 통계 및 최근 10건 실거래) |
| `GET` | `/api/graph/context` | LLM 프롬프트 입력용 데이터 요약 텍스트 생성 |
| `CRUD`| `/api/graph/presets` | 대시보드 필터 프리셋 관리 |
| `CRUD`| `/api/graph/insights` | AI 분석 인사이트 이력 관리 |
