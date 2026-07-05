# myhome 프로젝트 로드맵

> 아파트 알림 ➔ 이력 축적 ➔ SQLite 기반 분석 ➔ LLM 인사이트로 진화하는 단계별 계획.

---

## 현황 요약 (2026-07)

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 | 프로젝트 스캐폴드 (Vite, Express, TypeScript, Tailwind) | ✅ 완료 |
| Phase 2 | 도메인 타입 + JSON 저장소 (`data/app-state.json`) | ✅ 완료 |
| Phase 3 | MCP 연동 + 규칙 엔진 (mcporter, ruleEngine) | ✅ 완료 |
| Phase 4 | 알림 + 스케줄러 (Telegram, 중복 방지) | ✅ 완료 |
| Phase 5 | REST API (rules, check-runs, notifications, config) | ✅ 완료 |
| Phase 6 | 프론트엔드 대시보드 (규칙 관리, 이력 조회, 지역 자동완성) | ✅ 완료 |
| **Phase 7A** | **모노레포 전환 + shared 패키지 추출** | ✅ 완료 |
| **Phase 7B** | **SQLite DB 분석 대시보드 (4탭 리포트)** | ✅ 완료 |
| **Phase 7C** | **데이터 수집 봇 (Collector) 단일 서버 스케줄러 통합** | ✅ 완료 |
| **Phase 7D** | **Docker 컨테이너화 및 GitHub Actions CI/CD 구축** | ✅ 완료 |
| Phase 8 | LLM API 직접 연동 (Gemini/OpenAI) | 📋 계획 |
| Phase 9 | MCP 서버 (SQLite 데이터 외부 LLM 노출) | 📋 계획 |
| Phase 10 | 매물·호가 데이터 확장 (실거래 외 소스 추가) | 📋 계획 |
| Phase 11 | Kakao 알림 활성화 | 📋 계획 |

---

## 인프라 배치도 (단일 서버 단순화 적용)

```
┌───────────────────────────────────────────────┐
│              Synology NAS / Local             │
│            (단일 서버 인프라 환경)            │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ Dashboard Server (Express 백엔드)        │  │
│  │ - REST API 제공 (:4174)                 │  │
│  │ - 300초 주기 실거래 룰 매칭 감시        │  │
│  │ - 매일 새벽 6시 자동 수집 스케줄러      │  │
│  │                                         │  │
│  │   ┌─────────────────────────────────┐   │  │
│  │   │ Collector Bot (내장 라이브러리) │   │  │
│  │   │ - 국토부 오픈 API 직접 호출     │   │  │
│  │   │ - 한 번에 최대 9999건 조회      │   │  │
│  │   └───────────────┬─────────────────┘   │  │
│  └───────────────────┼─────────────────────┘  │
│                      │                        │
│                      ▼ (로컬 파일 입출력)     │
│             💾 SQLite (data/myhome.db)        │
└──────────────────────┬────────────────────────┘
                       │
                       ├─▶ 국토부 OpenAPI (실거래 데이터 획득)
                       ├─▶ PlayMCP mcp-gateway (지역/단지 보조 조회)
                       └─▶ Telegram Bot (알림 발송)
```

---

## Phase 7A — 모노레포 전환 + Shared 패키지 추출 (완료)

### 목표
기능별로 패키지를 분리하여 공유 패키지(`@myhome/shared`), 데이터 수집기(`@myhome/collector`), 대시보드 백엔드 및 웹 웹앱(`@myhome/dashboard`) 구조로 모노레포를 구축했습니다.

---

## Phase 7B — SQLite DB 분석 대시보드 (완료)

### 목표
파일 기반의 로컬 SQLite DB를 구축하여 국토부 실거래 이력을 영구 보존하고, 이를 Recharts 차트로 집계 분석하는 리포트 대시보드를 추가했습니다.
* **사용 기술**: Node.js v24 내장 `node:sqlite` (`DatabaseSync`) 적용 (네이티브 컴파일 에러 해결 및 무의존성 달성).
* **데이터 보존 위치**: `data/myhome.db` 파일에 축적됩니다.
* **4개 탭 리포트**: 종합 현황, 단지별 분석, 드릴다운, 💡 AI 인사이트로 구성됩니다. (Vite 웹 최적화를 위해 복잡한 노드-링크 시각화 탭은 제거되었습니다.)

---

## Phase 7C — 데이터 수집 봇 (Collector) 단일 서버 스케줄러 통합 (완료)

### 목표
대시보드 백엔드 서버의 기동 스케줄러(`scheduler.ts`) 내부에 매일 새벽 6시 자동 수집 로직을 내장하고, **국토부 아파트매매 실거래가 오픈 API**를 직접 HTTP GET 방식으로 호출(`numOfRows=9999`)하도록 설계하여 **10건 수집 제한을 완벽하게 우회**했습니다.

#### 환경 설정 (`.env`)
```env
# 공공데이터포털 일반 인증키 등록 (필수)
DATA_GO_KR_API_KEY=7614cc8803e9944860e23c7a1dd96236474891a272d88f27ce8edc8938d6cecc
# SQLite 적재 사용 플래그
GRAPH_DB_ENABLED=true
```

---

## Phase 7D — Docker 컨테이너화 및 GitHub Actions CI/CD 구축 (완료)

### 목표
Synology Container Manager(Docker Compose) 환경 배포를 원활히 지원할 수 있도록 모노레포 프로젝트를 Docker 이미지화하였으며, GitHub 리포지토리 이벤트를 기반으로 자동 빌드 및 이미지 정리를 수행하는 CI/CD를 구축했습니다.

* **Express 백엔드 정적 서빙 및 호스트 바인딩**: Docker 단일 컨테이너 기동 시 대시보드 웹앱이 함께 배포될 수 있도록 Express 서버 내에 `packages/dashboard/dist` 정적 서빙 및 SPA 폴백 라우트를 추가했습니다. 호스트 바인딩 기본값을 `0.0.0.0`으로 하여 외부 통신이 가능하도록 설계했습니다.
* **Dockerfile & Compose 파일 추가**: 24-alpine 기반의 멀티 스테이지 빌드 방식 Dockerfile과 Synology 프로젝트 생성용 docker-compose.yml 템플릿을 개발했습니다.
* **GitHub Actions 파이프라인**:
  - Releases 발행 시 Docker 이미지를 자동 빌드해 `ghcr.io`에 푸시하는 배포 워크플로우를 추가했습니다.
  - 매주 월요일 KST 새벽 3시에 최신 10개 버전 및 `latest` 이미지를 제외하고 가장 오래된 패키지 버전을 주기적으로 청소하는 삭제 워크플로우를 내장했습니다.

---

## Phase 8 — LLM API 직접 연동

### 목표
인사이트 탭에 OpenAI/Gemini API를 연동하여, 로컬 SQLite에서 요약한 월별 추이와 시계열 가격 데이터 컨텍스트를 활용해 자동으로 실거래 트렌드 진단 및 투자 적정성 리포트를 생성하도록 지능화합니다.

* **Text-to-SQL**: LLM이 자연어 질문을 입력받아 적합한 SQLite SQL 쿼리를 생성하고 실행 결과를 분석하도록 구현할 예정입니다.
* **주간 분석 리포트**: 텔레그램을 통해 주기적으로 자동 분석 보고서를 발송하는 크론 스케줄을 추가할 계획입니다.

---

## Phase 9 — MCP 서버 (SQLite 데이터 외부 노출)

### 목표
수집된 로컬 SQLite DB의 부동산 실거래 데이터를 MCP(Model Context Protocol) 도구로 노출하여, 에이전트(Gemini, Cursor 등)가 사용자의 데이터베이스를 직접 읽어 들여 질의에 답변할 수 있도록 생태계를 구축합니다.
* **노출 툴 예정**: `get_local_stats`, `query_local_db`, `get_complex_trend_direct`
