# 프로젝트 회고 및 개선 계획 (Phase 7)

본 문서는 **아파트 실거래 알림 및 대시보드 서비스 (myhome)** 프로젝트의 Phase 7(모노레포, SQLite DB 분석, Docker 배포 파이프라인 구축 등) 완료에 따른 성과 회고와 향후 개선을 위한 구체적인 계획을 다룹니다.

---

## 1. 🌟 주요 성과 (What Went Well)

### 📦 npm workspaces 모노레포 전환 (`@myhome/shared`)
* **코드 재사용성 극대화**: 프론트엔드/백엔드/수집기 전체에서 사용되는 SQLite 데이터베이스 커넥션, XML 파서, 공통 타입 정의 등을 하나의 `@myhome/shared` 라이브러리로 추출하여 중복 코드를 제거하고 유지보수성을 크게 향상시켰습니다.

### 💾 SQLite 로컬 DB 통합 및 데이터 수집 최적화
* **의존성 최소화**: 외부 ORM(Prisma, Sequelize 등)을 도입하지 않고, Node.js v24 내장 `node:sqlite` (`DatabaseSync`)를 활용하여 시스템 리소스 낭비가 없는 경량 데이터베이스 환경을 성공적으로 안착시켰습니다.
* **OpenAPI 호출 제한 극대화**: 국토부 API의 10건 호출 한계를 `numOfRows=9999`와 지역구(법정동) 단위 전체 Fetch 후 로컬 DB 적재(Upsert) 방식을 도입하여 효율적으로 우회했습니다. 이로 인해 동일 지역 단지 조회 시 캐시 히트율이 급격히 증가했습니다.

### 🐋 Docker 컨테이너화 및 CI/CD 자동화
* **배포 단순화**: Express 백엔드 내에서 React 빌드 결과물(`packages/dashboard/dist`)을 정적 서빙하도록 설계하여 단일 컨테이너 내에서 백엔드와 프론트엔드가 모두 서비스될 수 있도록 최적화했습니다.
* **GitHub Actions 자동화**: Releases 트리거 시 GitHub Container Registry (GHCR)에 Docker 이미지를 자동 빌드 및 배포하고, 매주 월요일 KST 새벽 3시에 10개의 최신 버전만 보존하고 잔여 이미지를 자동 정리하는 리소스 정리 파이프라인을 구축했습니다.

---

## 2. ⚠️ 아쉬운 점 및 개선 요구사항 (What Could Be Improved)

### 🚨 빌드 사전 검증(CI) 단계의 누수
* **상황**: 최근 원격 커밋 반영 후 빌드 시 `packages/dashboard/server/routes.ts` 내에 선언되지 않은 `answer` 변수 호출 오타로 인해 빌드 오류가 발생했습니다.
* **원인**: GitHub Actions CI 파이프라인에서 단순 코드 검사 및 릴리즈 팩 위주로 검증이 진행되고, 모노레포 전체 빌드 및 TypeScript 엄격 검사(`tsc --noEmit` 등)가 완전하게 사전에 차단하지 못했습니다.
* **해결 계획**: CI 단계 혹은 로컬 Git hooks에 `npm run build` 또는 TypeScript 타입 검증을 필수 단계로 통합해 오타 및 린트 오류가 Master 브랜치에 merge되거나 릴리즈되지 않도록 방지합니다.

### ⚡ 프론트엔드 빌드 용량 최적화 (Chunk Size)
* **상황**: Pretendard 웹 폰트 패키지를 도입하고 local 빌드하는 과정에서 일부 에셋의 번들 크기가 500kB를 초과하는 경고가 발생했습니다.
* **해결 계획**: 프론트엔드 번들러(Vite/Rollup) 설정에서 코드 분할(Code Splitting)이나 폰트 서브셋 최적화 설정을 재점토하여 로딩 성능을 추가 개선합니다.

---

## 3. 🚀 향후 로드맵 및 개선 계획 (Action Items)

### 🤖 Phase 8: LLM 직접 연동
* **인사이트 탭 활성화**: OpenAI / Gemini API 연동을 완료하여, SQLite에 누적된 아파트 가격 추이 및 시계열 트렌드 데이터를 프롬프트 컨텍스트로 제공하고 투자 적정성 리포트를 자동 생성하도록 합니다.
* **Text-to-SQL 구현**: 에이전트 및 사용자가 자연어 질문을 입력하면 이를 SQLite SQL 쿼리로 자동 변환하여 데이터를 실시간 탐색할 수 있는 기능을 내장할 예정입니다.

### 🔌 Phase 9: MCP (Model Context Protocol) 서버 활성화
* 로컬 SQLite DB 데이터 조회를 위한 MCP 서버를 정식 구축하여 Gemini, Cursor 등의 외부 AI 코딩 에이전트와 직접 소통하고 데이터를 분석할 수 있는 외부 연동 생태계를 조성합니다.

---

**작성일**: 2026-07-21  
**대상 버전**: v0.3.0 (Phase 7 완료 본)
