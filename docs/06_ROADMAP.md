# [06] myhome 프로젝트 로드맵 (Roadmap)

아파트 알림 ➔ 이력 축적 ➔ SQLite 기반 분석 ➔ LLM 인사이트 진화 계획.

## 1. 현황 요약 (Phase 진행 상태)

| Phase | 내용 | 상태 |
|---|---|---|
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
| **Phase 7E** | **국토부 API 단일화 + MCP 분리 + 역세권/어드민/로그 UX 개선** | ✅ 완료 |
| **Phase 8** | **LLM API 연동 (Gemini API + AI 인사이트 자동화)** | ✅ 완료 |
| **Phase 8.5** | **모바일 UI/UX 최적화, 공통 컴포넌트 모듈화, 번들 스플리팅** | ✅ 완료 |
| Phase 9 | MCP 서버 (SQLite 데이터 외부 LLM 노출) | 📋 계획 |
| Phase 10 | 매물·호가 데이터 확장 (실거래 외 소스 추가) | 📋 계획 |
| Phase 11 | Kakao 알림 활성화 | 📋 계획 |

## 2. 인프라 아키텍처

```
┌───────────────────────────────────────────────┐
│              Synology NAS / Local             │
│  ┌─────────────────────────────────────────┐  │
│  │ Dashboard Server (Express 백엔드)        │  │
│  │ - REST API (:4174)                      │  │
│  │ - 300초 주기 실거래 룰 감시             │  │
│  │ - 매일 새벽 6시 자동 수집 스케줄러      │  │
│  │                                         │  │
│  │   ┌─────────────────────────────────┐   │  │
│  │   │ Collector Bot (내장 라이브러리) │   │  │
│  │   │ - 국토부 오픈 API 직접 호출     │   │  │
│  │   └───────────────┬─────────────────┘   │  │
│  └───────────────────┼─────────────────────┘  │
│                      │                        │
│                      ▼ (로컬 파일 I/O)        │
│             💾 SQLite (data/myhome.db)        │
└──────────────────────┬────────────────────────┘
                       │
                       ├─▶ 국토부 OpenAPI (실거래 데이터 소스)
                       ├─▶ 행안부 JUSO / 카카오 API (도로명→LAWD_CD 변환)
                       ├─▶ Gemini API (AI 분석 인사이트)
                       └─▶ Telegram Bot (알림 발송)
```

## 3. Phase별 핵심 작업 내역

- **Phase 7A (모노레포)**: `@myhome/shared`, `@myhome/collector`, `@myhome/dashboard` 분리.
- **Phase 7B (분석 대시보드)**: SQLite 4탭 대시보드(종합, 단지별, 드릴다운, AI 인사이트), Recharts 시계열/BoxPlot 연동.
- **Phase 7C (단일 스케줄러 통합)**: 별도 데몬 제거, Express 서버 내 `scheduler.ts`로 수집기 흡수, KST 06:00 1회 가동.
- **Phase 7D (컨테이너/배포)**: `node:24-alpine` Dockerfile, Docker Compose 볼륨 매핑, GitHub Actions GHCR 빌드/배포.
- **Phase 7E (연동 단순화)**: 실거래 데이터 소스 국토부 API 단일화, 카카오 로컬 지오코딩 및 역세권 반경 탐색 구축.
- **Phase 8 (Gemini 연동)**: Google Gemini SDK 기반 시세 및 단지 동향 AI 자동 분석.
- **Phase 8.5 (번들/모바일 최적화)**: 모바일 뷰 분기, Recharts 코드 스플리팅(-81.7% 번들 경량화).
