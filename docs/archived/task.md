# 작업 목록 (task.md)

## [x] Phase 7A: 모노레포 전환 + Shared 패키지 추출
- [x] 루트 `package.json` 수정 및 `tsconfig.base.json` 생성
- [x] `packages/shared/` 생성, `@myhome/shared` 구현
  - [x] `packages/shared/package.json`
  - [x] `packages/shared/tsconfig.json`
  - [x] `packages/shared/src/types.ts`
  - [x] `packages/shared/src/graphDb.ts` (이동)
  - [x] `packages/shared/src/utils.ts`
  - [x] `packages/shared/src/index.ts`
- [x] `packages/dashboard/` 생성 및 기존 코드 이동
  - [x] `packages/dashboard/package.json` (기존 package.json 기반 수정)
  - [x] `packages/dashboard/tsconfig.json` 등 설정 파일 이동 및 수정
  - [x] `server/`, `src/`, `public/`, `data/` 전체 이동
- [x] 코드 내부 `@myhome/shared` 의존성 적용 및 빌드 검증

## [x] Phase 7B: 그래프 DB 분석 대시보드 (5탭 리포트)
- [x] 패키지 설치 (`recharts`, `react-force-graph-2d` @ `packages/dashboard`)
- [x] `packages/shared/src/graphDb.ts` 쿼리 확장
- [x] `packages/dashboard/server/routes-graph.ts` 및 프리셋/인사이트 라우트 구현
- [x] 프론트엔드 API 클라이언트, 타입 업데이트
- [x] 프론트엔드 분석 페이지 구현 (5개 탭 + 필터 패널)
  - [x] `GraphDashboard.tsx` (메인)
  - [x] `FilterPanel.tsx` (필터/프리셋)
  - [x] `OverviewTab.tsx` (개요)
  - [x] `ComplexTab.tsx` (단지)
  - [x] `DrilldownTab.tsx` (드릴다운)
  - [x] `GraphViewTab.tsx` (노드-링크)
  - [x] `InsightTab.tsx` (인사이트/프롬프트)
- [x] 네비게이션 추가 및 번역(i18n) 적용

## [x] Phase 7C: 데이터 수집 봇 (Collector) + Docker 배포
- [x] `packages/collector/` 스키마 구현
- [x] Dockerfile 및 docker-compose.yml 추가
- [x] 수집 봇 dry-run 및 검증
