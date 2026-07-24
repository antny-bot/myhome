# [06] myhome 프로젝트 로드맵

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
                        ├─▶ 국토부 OpenAPI (실거래·지역코드·단지목록 단일 소스)
                        ├─▶ 행안부 JUSO / 카카오 API (도로명→LAWD_CD 변환)
                        ├─▶ PlayMCP mcp-gateway (자연어 NL 질의 전용 — Phase 9+)
                        └─▶ Telegram Bot (알림 발송)
```

---

## Phase 7A — 모노레포 전환 + Shared 패키지 추출 (완료)

### 목표
기능 분리 모노레포 구축: 공유 패키지(`@myhome/shared`), 데이터 수집기(`@myhome/collector`), 대시보드 백엔드/웹앱(`@myhome/dashboard`).

---

## Phase 7B — SQLite DB 분석 대시보드 (완료)

### 목표
로컬 SQLite DB 구축, 실거래 이력 영구 보존. Recharts 차트 집계 분석 리포트 대시보드 추가.
* **사용 기술**: Node.js v24 내장 `node:sqlite` (`DatabaseSync`) 적용 (의존성 최소화).
* **데이터 보존 위치**: `data/myhome.db` 파일 적재.
* **4개 탭 리포트**: 종합 현황, 단지별 분석, 드릴다운, 💡 AI 인사이트. (Vite 최적화 위해 복잡한 노드-링크 탭 제거).

---

## Phase 7C — 데이터 수집 봇 (Collector) 단일 서버 스케줄러 통합 (완료)

### 목표
대시보드 서버 스케줄러(`scheduler.ts`) 내 매일 새벽 6시 자동 수집 로직 내장. **국토부 아파트매매 실거래가 오픈 API** HTTP GET 호출(`numOfRows=9999`), **10건 수집 제한 우회**.

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
Synology Container Manager 배포 지원용 모노레포 Docker 이미지화, GitHub 이벤트 기반 자동 빌드 및 정리 CI/CD 구축.

* **Express 백엔드 정적 서빙 및 호스트 바인딩**: Docker 기동 시 대시보드 웹앱 동시 배포 위해 Express 서버 내 `packages/dashboard/dist` 정적 서빙/SPA 폴백 라우트 추가. 호스트 바인딩 `0.0.0.0` 외부 통신 가능 설계.
* **Dockerfile & Compose 파일 추가**: 24-alpine 기반 멀티 스테이지 빌드 Dockerfile, docker-compose.yml 템플릿 개발.
* **GitHub Actions 파이프라인**:
  - Releases 발행 시 Docker 이미지 빌드 및 `ghcr.io` 푸시.
  - 매주 월요일 KST 새벽 3시 최신 10개 버전 및 `latest` 제외한 오래된 이미지 자동 삭제.

---

## Phase 8 — LLM API 직접 연동

### 목표
인사이트 탭 OpenAI/Gemini API 연동. SQLite 월별 추이, 시계열 가격 데이터 컨텍스트 기반 실거래 트렌드 진단 및 투자 적정성 리포트 자동 생성 지능화.

* **Text-to-SQL**: 자연어 질문 기반 SQLite SQL 쿼리 생성/실행 및 결과 분석 구현 예정.
* **주간 분석 리포트**: 텔레그램 주기적 자동 분석 보고서 발송 크론 스케줄 추가 계획.

---

## Phase 9 — MCP 서버 (SQLite 데이터 외부 노출)

### 목표
로컬 SQLite DB 실거래 데이터 MCP(Model Context Protocol) 도구 노출, 에이전트(Gemini, Cursor 등) DB 직접 읽기 및 답변 생태계 구축.
* **노출 툴 예정**: `get_local_stats`, `query_local_db`, `get_complex_trend_direct`
