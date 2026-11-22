# myhome (Shared DB · Server · Dashboard UI) 5대 리팩토링 계획서

> 작성일: 2026-11-22  
> 기준 커밋: `main` (`origin/main`)  
> 목적: `myhome`(총 23,600+ lines)에서 코드가 집중된 5개 핵심 모듈을 분리해 유지보수성과 테스트 가능성을 높인다.  
> **제약**: 기존 API 엔드포인트·응답 스키마·Cloudflare Pages 프록시·MCP 동작 및 UI 기능은 **100% 하위 호환**을 유지한다(순수 리팩토링).

---

## 리팩토링 대상 5개 & 단계별 실행 계획 (Step = PR 단위)

### Step 1. `[Shared/DB]` `packages/shared/src/db/analytics.ts` (1,217 lines) 모듈 분리
- **현황**: 프로젝트 내 유일한 1,000줄 초과 파일로, 18개 이상의 대형 SQL 집계/추이/비교/랭킹 쿼리 함수가 한 파일에 집중됨.
- **목표**:
  - `packages/shared/src/db/analytics/` 디렉터리 아래 기능별로 분할:
    - `priceTrends.ts` (시계열 가격/평단가 추이)
    - `complexComparison.ts` (단지 비교/요약)
    - `marketRanking.ts` (상승/하락/거래량 순위)
    - `helpers.ts` (공통 SQL 조건 빌더 및 날짜/면적 헬퍼)
  - 기존 `packages/shared/src/db/analytics.ts`는 하위 호환을 위한 re-export 배럴(`export * from './analytics/...'`)만 유지.
- **검증**: `shared` 빌드 및 기존 DB/대시보드 테스트 통과.

### Step 2. `[Backend]` `packages/dashboard/server/authRoutes.ts` (751 lines) 서비스 계층 분리
- **현황**: Google OAuth, 세션/쿠키 발급, 허용 계정 검증 등 라우팅 핸들러와 인증/DB 헬퍼 24개+가 단일 라우트 파일에 혼재.
- **목표**:
  - `packages/dashboard/server/services/authService.ts` 신설 (OAuth 토큰 교환, 허용 계정 확인, 세션 생성/검증/폐기 분리).
  - `authRoutes.ts`는 요청 파싱, 서비스 호출, 쿠키/응답 설정만 담당(250 lines 이하 목표).
- **검증**: 대시보드 서버 타입체크 및 인증/라우트 테스트 통과.

### Step 3. `[UI]` `packages/dashboard/src/pages/Settings.tsx` (755 lines) 섹션 분리
- **현황**: `useState`/`useEffect` 25개가 단일 페이지에 집중되어 텔레그램/알림·계정/허용목록·수집/화면 설정이 뒤엉켜 있음(`SettingsMcpSection.tsx`만 분리된 상태).
- **목표**:
  - `components/settings/`(또는 기존 `components/Settings*Section.tsx` 컨벤션) 아래 섹션별 컴포넌트 분리:
    - `SettingsNotificationSection.tsx` (텔레그램/알림 규칙)
    - `SettingsAccountSection.tsx` (계정/보안/허용 계정 링크)
    - `SettingsGeneralSection.tsx` (기본 보기/테마/기타)
  - 각 섹션은 자체 데이터 조회/저장 훅을 사용하고, `Settings.tsx`는 섹션 조합과 탭/스크롤 레이아웃만 담당(200 lines 이하 목표).
- **검증**: 대시보드 `npm run build` 및 테스트 통과.

### Step 4. `[UI]` `packages/dashboard/src/pages/ActivityLog.tsx` (771 lines) 훅·뷰 분리
- **현황**: 로그 필터, 페이지네이션, 상세 모달, 상태 배지, API 조회가 단일 페이지 컴포넌트에 집중됨.
- **목표**:
  - `hooks/useActivityLogs.ts`로 필터·조회·페이지네이션 상태 분리.
  - `components/activity/` 아래 `ActivityLogFilterBar.tsx`, `ActivityLogTable.tsx`, `ActivityLogDetailModal.tsx` 분리.
  - `ActivityLog.tsx`는 200 lines 이하로 축소.
- **검증**: 대시보드 `npm run build` 및 테스트 통과.

### Step 5. `[UI]` `packages/dashboard/src/components/Layout.tsx` (579 lines) 셸 분할
- **현황**: 사이드바 내비게이션, 모바일 드로어, 상단 헤더, 사용자 프로필/로그아웃/테마 메뉴가 하나의 `Layout.tsx`에 뭉쳐 있음.
- **목표**:
  - `components/layout/` 아래 `SidebarNav.tsx`, `MobileNavDrawer.tsx`, `TopHeaderBar.tsx`로 분리.
  - `Layout.tsx`는 반응형 셸 조합만 담당(200 lines 이하 목표).
- **검증**: 전체 워크스페이스 빌드(`npm run build`) 및 테스트(`npm test`) 통과.

---

## 작업 시 유의사항
- 반드시 **Step 1 → Step 2 → Step 3 → Step 4 → Step 5** 순서로 PR/커밋을 나누어 진행한다.
- Cloudflare Pages 빌드(`npm run build` / `tsc`) 및 서버 번들 경로가 깨지지 않도록 import 경로를 확인한다.
