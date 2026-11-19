# myhome — Agent 진입점

## 필수 규칙
- **대화**: 한국어 진행.
- **모호 요청**: 임의 해석 금지, 확인 필수.
- **i18n**: 사용자 노출 문자열 항상 i18n 처리 (한국어/English).
- **프론트엔드**: 모바일 퍼스트 — 390px 모바일·태블릿·데스크톱 검증.
- **병렬 작업**: 독립 가능 작업 한정 subagent 병렬 진행.

## 모듈러 아키텍처 규칙 (v0.3.5 이후)
- **DB 계층**: 2,000줄 이상의 거대 단일 `db.ts` 대신 `packages/shared/src/db/` 하위 전용 도메인 모듈(`transactions.ts`, `analytics.ts`, `regions.ts` 등)에 기능 추가. `db.ts`는 하위 호환 re-export 배럴로 유지.
- **서버 라우팅**: `server/routes.ts` 단일 파일에 비즈니스 로직을 누적하지 않고 `server/routes/` 하위 도메인 라우터(`ruleRoutes`, `configRoutes`, `transactionRoutes`, `logRoutes`)에 분리 배치.
- **프론트엔드 차트**: Recharts 커스텀 도형 및 스타일은 `src/components/charts/` 공통 모듈 재사용.
- **SQL 쿼리 작성**: 컬럼에 함수식을 씌우지 않는 SARGable 범위 비교 준수, N+1 상관 서브쿼리 지양(Window Function 또는 일괄 조인 활용).

## 안드레 카파시(Andrej Karpathy) AI 협업 4대 원칙
1. **읽기 우선 (Read before write)**: 코드 작성·수정 전 기존 소스 동작·맥락 완벽 파악.
2. **작고 점진적인 변경 (Small, incremental changes)**: 방대한 아키텍처 일괄 수정 금지, 빌드·동작 확인 가능 최소 단위 점진 수정.
3. **검증 및 테스트 우선 (Validate and Test)**: 수정 코드 정상 가동 검증 단위 테스트·실행 확인 절차 준수.
4. **제약 및 컨텍스트 준수 (Respect constraints)**: 정의된 규칙·시스템 가이드 범위 내 안전 수정.

## 지식 조회 및 문서 관리 (Wiki & Docs Rule)
1. **위키 우선 조회 (Wiki Consultation)**: 시스템 아키텍처, 국토부/부동산원 API 규격, 캐시 정책, 타 프로젝트 연동 규격, 과거 의사결정 이력 확인 시 코드 탐색 전 반드시 `llm-wiki`의 `index.md` 및 `wiki/`(또는 `llm-wiki` MCP)를 먼저 조회한다.
2. **세부 명세 원본 참조**: OpenAPI 명세, 지역코드 매핑, DB 스키마 등 특정 모듈의 상세 구현 명세가 필요한 경우 `docs/` 디렉터리 내 해당 원본 문서를 참고한다.
3. **문서 동기화 의무 (Documentation Sync)**: API 스펙, DB 스키마, 캐시 정책, 수집 스케줄러 등 외부 인터페이스 및 구조 변경 시 작업 완료 후 반드시 `docs/` 내 관련 문서를 최신화한다. (코드 라인 단위 세부사항 지양, 아키텍처·데이터 흐름·스펙·배경 위주 간결 갱신)
