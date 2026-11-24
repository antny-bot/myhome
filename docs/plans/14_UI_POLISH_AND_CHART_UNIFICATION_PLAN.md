# MyHome UI 정돈 및 차트 통합 개발 계획 (Phase 14)

- **작성일**: 2026-11-24
- **대상**: `packages/dashboard` (프론트엔드 전반)
- **목적**:
  1. 사이드바 접힘 상태에서 프로필 팝오버 메뉴가 메인 페이지 카드에 가려지는 버그 해결
  2. 페이지·카드·필터·차트 전반에 흩어진 시각적 요소와 스타일을 정돈하여 한눈에 읽히는 대시보드·분석 UI 구축

---

## 1. 현황 진단 (코드 기준)

### 1.1 사이드바 접힘 시 프로필 모달(팝오버) 가림 버그
- **위치**: `packages/dashboard/src/components/layout/SidebarNav.tsx`, `Layout.tsx`
- **원인**:
  - `<aside>`가 `sticky top-0`로 선언되어 CSS 스펙상 **새로운 Stacking Context**를 생성하지만, 명시적인 `z-index`가 지정되지 않아 `z-auto` 상태임.
  - `<main>` 내부의 `<div key={normalizedCurrentView} className="animate-fade-in-up">` 및 카드·지도 오버레이(`z-10` 등)가 DOM 순서상 `<aside>`보다 뒤에 위치함.
  - 사이드바를 **펼쳤을 때(`w-56`)**는 팝오버(`left-2 right-2 w-auto`)가 사이드바 폭 내부에서만 열려 티가 나지 않으나, **접었을 때(`w-16`)** `w-52` 팝오버가 오른쪽 `<main>` 영역으로 삐져나오면서 `<main>` 측 Stacking Context 아래로 가려짐.

### 1.2 전체 UI가 산만하게 느껴지는 구조적 원인
1. **이중화된 디자인 토큰과 하드코딩 색상 혼재**
   - `styles/theme.css`의 레거시 HSL 변수와 `styles.css`의 시맨틱 토큰(`bg-elevated`, `border-normal`, `text-strong`), 그리고 개별 컴포넌트의 하드코딩된 `slate-*` / `white/80` / `dark:bg-slate-900` 클래스가 섞여 있음.
   - 모서리(`rounded-lg` / `rounded-xl` / `rounded-2xl`)와 그림자(`shadow-xs` / `shadow-sm` / `shadow-lg`), 블러(`backdrop-blur-sm` / `md` / `lg`) 기준이 컴포넌트마다 다름.
2. **대시보드 첫 화면의 과도한 시선 분산 (`DesktopDashboardView.tsx`)**
   - 지도 영역 위에 3개의 플로팅 오버레이(좌상단 검색창, 우상단 수집 지역 관리, 좌하단 도움말 박스)가 동시에 떠 있음.
   - 우측 `2×2` `StatCard`와 하단 `RecentRuns` · `AlertHistorySection`이 같은 시각적 무게로 나열되어 핵심 정보(상태 요약 vs 이력)의 위계가 약함.
3. **차트 컴포넌트의 파편화 (`components/charts/` vs 개별 페이지)**
   - 공통 래퍼(`ChartFrame`, `ChartTooltip`, `chartStyles.ts`)가 정의되어 있음에도 실제 차트들이 이를 일관되게 사용하지 않음:
     - `TimeSeriesSection.tsx`: 헤더에 지역/평형 필터 2개 + 커스텀 범례 토글 버튼 5개가 한 줄에 몰려 복잡하며, 기본 노출 시리즈(거래량 Area + 박스플롯 Bar + 평균선 Line)가 겹쳐 초기 가독성이 떨어짐.
     - `ComplexChartsSection.tsx`: `formatBoxPlotTooltip`을 인라인 JSX로 별도 구현하고, `hiddenKeys` 토글 UI도 `TimeSeriesSection`과 다른 스타일을 사용.
     - `ActivityLogCharts.tsx`: `CustomLegend`에 `text-slate-500` 하드코딩, `tooltipContentStyle` 인라인 사용 등 또 다른 패턴으로 동작.
4. **분석 페이지 간 헤더·탭·필터 패턴 불일치**
   - `GraphDashboard.tsx`(`ResponsiveTabs`)와 `ComplexAnalysisPage.tsx`(인라인 밑줄 탭 + `PageHeader`)가 서로 다른 탭/레이아웃 패턴을 사용함.
5. **모바일(`< 768px`) 및 태블릿(`768px ~ 1023px`, 폴드 펼친 화면 포함) 반응형 불균형**
   - **태블릿(`md`)**: `useBreakpoint.ts` 기준 `768px+`는 데스크톱 레이아웃(`SidebarNav` + `DesktopDashboardView`)을 타는데, 사이드바를 접어 쓰는 경우가 많아 프로필 팝오버 가림 버그에 직접 노출됨. 또한 `BentoGrid`에서 `md={6}` 지도 아래 `DashboardStatCards`(`fill`)와 `RecentRuns`·`AlertHistorySection`(`md={3}`)이 배치될 때 세로 비율·카드 폭이 어색해짐.
   - **모바일(`< md`)**: `MobileDashboardView.tsx`의 지도 높이(`calc(100dvh - 124px - safe-area)`)와 하단 바텀시트(`52px`) + 하단 탭바(`56px`) 간 높이 계산이 어긋나 지도 하단이 가려질 수 있고, 상단 `PageHeader`의 DB 통계 3종이 좁은 화면에서 세로 공간을 과도하게 차지함. 바텀시트 내부 스크롤(`max-h-[calc(78vh-58px)]` vs 부모 `h-[75vh]`) 불일치 및 `animate-bounce` 화살표가 산만함을 유발.
   - **모바일 상·하단 내비게이션 분산**: `TopHeaderBar.tsx`(테마·설정·로그아웃)와 `MobileNavDrawer.tsx`(`AllMenuDrawer`, 전체 메뉴·기본 페이지·PWA 설치)로 계정/설정 동선이 위아래로 나뉘어 있고, `AllMenuDrawer`·바텀시트에 `bg-white/95 dark:bg-slate-900/95`, `slate-*` 하드코딩이 남아 있음.

---

## 2. 단계별 개발 계획

### Phase 1. 사이드바 프로필 팝오버 가림 버그 수정 및 레이아웃 레이어 정립
**목표**: 사이드바 펼침/접힘 및 모든 페이지(지도·차트·카드) 위에서 프로필 메뉴가 100% 정상 노출되도록 수정

- **대상 파일**:
  - `packages/dashboard/src/components/layout/SidebarNav.tsx`
  - `packages/dashboard/src/components/Layout.tsx`
- **구현 내용**:
  1. `SidebarNav`의 `<aside>`에 명시적 레이어 `z-30` 부여.
  2. 프로필 팝오버 메뉴를 `createPortal(..., document.body)`로 렌더링하고, 프로필 버튼의 `getBoundingClientRect()` 기준 `fixed` 좌표(접힘 시 버튼 우측 `left: rect.right + 8`, 펼침 시 버튼 상단 정렬)로 배치하여 부모 `sticky` / `overflow` / `transform` 영향 완전 차단.
  3. 사이드바 `collapsed` 상태 토글 시 열려 있던 팝오버 자동 닫힘 처리 및 `Escape` 키로 닫기 지원.
  4. 전역 Z-Index 계층 규칙 문서화 및 적용:
     - 지도/차트 내부 오버레이: `z-10`
     - Sticky 헤더/사이드바: `z-30` (모바일 바텀시트 백드롭 `z-20`, 바텀시트 `z-30`, `TopHeaderBar` `z-30`)
     - 드롭다운/팝오버(Portal): `z-40`
     - 모달/드로어(`AllMenuDrawer`, `RegionManagerModal`): `z-50` (드로어 본문 `z-[60]` → `z-50` 백드롭 / `z-[55]` 본문으로 정리)
  5. **태블릿(`md`) 사이드바 기본 동작 점검**:
     - `768px ~ 1023px` 구간에서는 초기 진입 시 사이드바 접힘(`collapsed`) 또는 좁은 폭에서도 `<main>` 최소 가용 폭 확보 확인.
- **완료 기준**:
  - 데스크톱·태블릿(`md` 768px+) 사이드바 접힘(`w-16`) 상태에서 대시보드 지도/카드, 실거래 분석 차트 위에서도 프로필 메뉴가 가려짐 없이 클릭·조작 가능.

---

### Phase 2. 디자인 토큰 및 카드/컨테이너 Surface 위계 통일
**목표**: 화면 전반의 색상·테두리·둥글기·여백 규격을 하나로 맞춰 정돈된 톤앤매너 확보

- **대상 파일**:
  - `packages/dashboard/src/styles/theme.css` (미사용 레거시 정리 또는 `styles.css`로 일원화)
  - `packages/dashboard/src/styles.css`
  - `packages/dashboard/src/components/SectionCard.tsx`
  - `packages/dashboard/src/components/StatCard.tsx`
  - `packages/dashboard/src/pages/dashboard/DesktopDashboardView.tsx`
- **구현 내용**:
  1. **Surface & Elevation 3단계 규격화**:
     - `Base` (`bg-normal`): 페이지 배경
     - `Card` (`bg-elevated border border-normal rounded-2xl shadow-xs`): 기본 섹션/차트/KPI 카드
     - `Floating` (`bg-elevated/95 backdrop-blur-md border border-normal rounded-xl shadow-lg`): 지도 위 컨트롤, 툴팁, 팝오버
  2. **하드코딩 색상 제거**:
     - `bg-white/80`, `dark:bg-slate-900`, `border-slate-200`, `text-slate-500` 등을 시맨틱 토큰(`bg-elevated`, `border-normal`, `text-neutral`, `text-strong`)으로 치환.
     - 모바일 전용 컴포넌트(`MobileDashboardView.tsx` 바텀시트·핸들, `AllMenuDrawer.tsx`, `TopHeaderBar.tsx`)의 `slate-*` / `bg-white/95` 하드코딩도 동일하게 시맨틱 토큰으로 통일.
  3. **KPI 카드(`StatCard`) 시각 위계 정리**:
     - 레이블(`text-xs text-neutral`) → 핵심 수치(`text-2xl font-bold tabular-nums tracking-tight`) → 보조 배지/상태 순으로 정보 밀도 축소, 불필요한 장식 테두리 제거.

---

### Phase 3. 차트 시스템 통합 및 시각화 정돈
**목표**: 모든 차트가 동일한 프레임·범례·툴팁·색상 규칙을 따르고, 첫 화면에서 과밀하지 않게 읽히도록 개선

- **대상 파일**:
  - `packages/dashboard/src/components/charts/ChartFrame.tsx`
  - `packages/dashboard/src/components/charts/ChartTooltip.tsx`
  - `packages/dashboard/src/components/charts/ChartLegendToggles.tsx` *(신규 공통 컴포넌트)*
  - `packages/dashboard/src/components/charts/chartStyles.ts`
  - `packages/dashboard/src/pages/graph/OverviewTab/TimeSeriesSection.tsx`
  - `packages/dashboard/src/pages/graph/OverviewTab/ComplexCompareSection.tsx`
  - `packages/dashboard/src/pages/graph/ComplexTab/ComplexChartsSection.tsx`
  - `packages/dashboard/src/components/activity/ActivityLogCharts.tsx`
- **구현 내용**:
  1. **`ChartFrame` 표준화**:
     - 모든 차트 섹션을 `ChartFrame`으로 감싸 헤더(제목 + 부제), 우측 컨트롤 슬롯(단위/필터), 범례 토글 바(2줄 이상 넘어가도 깔끔하게 줄바꿈되는 전용 슬롯), 본문 높이를 통일.
     - 데이터 없음 / 로딩 중 스켈레톤 상태도 `ChartFrame` 내부에서 일관되게 처리.
  2. **범례 토글 UI 단일화 (`ChartLegendToggles`)**:
     - `TimeSeriesSection`과 `ComplexChartsSection`의 제각각인 토글 버튼을 하나의 컴팩트한 필(pill) 토글 컴포넌트로 통합.
     - 비활성 시리즈는 투명도만 낮춰 레이아웃 점프 방지.
  3. **툴팁 단일화 (`ChartTooltip`)**:
     - `ComplexChartsSection`의 인라인 `formatBoxPlotTooltip`과 `ActivityLogCharts`의 `tooltipContentStyle`을 `ChartTooltip` 계열로 통합.
     - 금액/건수/퍼센트 표기에 `tabular-nums` 적용.
  4. **차트 기본 노출 밀도 정돈 및 모바일/태블릿 차트 가독성 확보**:
     - `TimeSeriesSection`: 초기 기본값을 **평균가 라인 + 거래량 바**(또는 박스플롯 중 핵심 2개)로 가볍게 두고, 수염(Whisker)·중위값 등 상세 통계는 토글로 켜서 보도록 정돈.
     - X축 틱 간격(`interval="preserveStartEnd"` / 반응형 `minTickGap`)과 Y축 단위 표기(`chartYAxisProps` 모바일 `width: 40~44`, 데스크톱 `52`)를 반응형으로 조정해 390px 모바일 화면에서도 차트 플롯 영역이 좁아지지 않게 개선.
     - `ChartFrame` 내부 차트 높이 규격화: 모바일 `h-[240px]` / 태블릿(`md`) `h-[280px]` / 데스크톱(`lg`) `h-[320px]`.
     - `ActivityLogCharts`: 하드코딩된 `text-slate-500` 제거, `ChartFrame` 적용으로 대시보드 다른 차트와 동일한 카드 톤 유지, 태블릿(`md`) 구간에서 Pie + Area 차트 2열 배치 시 최소 폭 깨짐 방지(`md:grid-cols-1 xl:grid-cols-2` 또는 `lg:grid-cols-2`).

---

### Phase 4. 대시보드 및 분석 페이지 레이아웃 정돈
**목표**: 첫 화면과 탐색 화면의 여백·정렬·컨트롤 배치를 단순화해 작업 흐름 집중도 향상

- **대상 파일**:
  - `packages/dashboard/src/pages/dashboard/DesktopDashboardView.tsx`
  - `packages/dashboard/src/pages/dashboard/MobileDashboardView.tsx`
  - `packages/dashboard/src/pages/GraphDashboard.tsx`
  - `packages/dashboard/src/pages/ComplexAnalysisPage.tsx`
  - `packages/dashboard/src/pages/graph/FilterPanel/`
- **구현 내용**:
  1. **대시보드 지도 오버레이 다이어트**:
     - 좌하단 고정 도움말 배너(`HelpCircle` 박스)는 상단 관리 버튼 툴팁이나 빈 상태 안내로 흡수해 지도 가시 영역 확대.
     - 검색창과 `수집 지역 관리` 버튼의 높이·패딩·블러 스타일 통일.
  2. **대시보드 하단 이력 및 태블릿(`md`) Bento 배치 정리**:
     - `RecentRuns`와 `AlertHistorySection` 기본 높이 및 빈 상태 높이 정렬, 과도한 배지/아이콘 중첩 축소.
     - 태블릿(`md` 768px~1023px)에서는 지도 `md={6}` + KPI 4종을 4열(`md:grid-cols-4`) 1줄 컴팩트 바로 배치하고(`fill` 해제), `RecentRuns`·`AlertHistorySection`은 `md={6}` 1열 또는 `md={3}` 여백 확보로 좁은 카드 깨짐 방지.
  3. **모바일(`< 768px`) 대시보드 및 내비게이션 정돈**:
     - `MobileDashboardView.tsx`: 상단 `PageHeader` 아래 DB 통계 3종을 컴팩트 1줄 요약 바(`지역 N · 단지 N · 거래 N`)로 축소해 지도 가시 면적 확대.
     - 지도 컨테이너 높이를 하단 바텀시트(`52px`) + 탭바(`56px`) + `safe-area-inset-bottom` 합계와 정확히 맞춰 지도 하단 가림 해소.
     - 바텀시트 펼침 높이와 내부 스크롤 영역(`h-[75dvh]` 기준 `flex-1 min-h-0 overflow-y-auto`)을 일치시키고, 핸들의 `animate-bounce` 제거로 시각적 산만함 축소.
     - `TopHeaderBar`와 `MobileBottomNav`/`AllMenuDrawer` 간 중복·분산된 액션(테마·설정·로그아웃)의 역할을 명확히 정리(상단 헤더는 브랜드+빠른 테마/알림 또는 설정, 전체 메뉴 드로어는 메뉴+기본 페이지+앱 설치).
  4. **분석 페이지 탭/필터 통일**:
     - `ComplexAnalysisPage`의 인라인 밑줄 탭을 `GraphDashboard`와 동일한 `ResponsiveTabs` 컴포넌트로 교체.
     - `FilterPanel`의 칩/셀렉트 높이와 간격을 `h-9` 기준으로 맞춰 2~3줄로 흩어지던 필터 바를 컴팩트하게 정렬(모바일에서는 접기/펼치기 또는 2열 그리드로 세로 길이 축소).

---

## 3. 검증 계획

각 Phase 완료 시 아래 항목을 확인한다:
1. **타입·빌드 검증**: `packages/dashboard`에서 `npm run typecheck` 및 `npm run build` 통과
2. **단위 테스트**: 기존 테스트(`npm test`) 통과 및 레이아웃/차트 유틸 테스트 확인
3. **브라우저 실사 확인 (데스크톱 1280px+ / 태블릿 768~1024px·폴드 펼친 화면 / 모바일 390px, 라이트/다크 모드)**:
   - 데스크톱·태블릿 사이드바 접힘(`w-16`) 상태에서 프로필 클릭 시 팝오버가 대시보드 지도·카드·차트 위에 가림 없이 표시되는지 확인
   - 태블릿(`md`) 구간에서 지도·KPI·이력 카드 및 2열 차트 폭이 과도하게 좁아지거나 깨지지 않는지 확인
   - 모바일(`390px`)에서 대시보드 지도 하단이 바텀시트에 가려지지 않고, 바텀시트 스크롤·차트 축 라벨·`ResponsiveTabs`·`AllMenuDrawer`가 정상 동작하는지 확인
