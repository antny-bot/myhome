# [Plan 11] UI/UX 통일 · 모듈화 · 공통 컴포넌트 개발 계획

> 작성일: 2026-10-25 / 대상: `packages/dashboard/src` (React 19 + Tailwind + Recharts)
> 관련 문서: [05_DESIGN.md](../05_DESIGN.md) (디자인 표준), [01_OVERVIEW.md](../01_OVERVIEW.md)
> 상태: 📋 계획 (미착수)

---

## 1. 목적과 원칙

1. 페이지마다 제각각인 버튼/입력/모달/테이블/로딩/알림 UI를 **공통 컴포넌트 한 벌**로 일원화한다.
2. 1,000줄 이상 비대 페이지를 **기능 단위 하위 모듈**로 분리한다.
3. `05_DESIGN.md`의 표준(토큰, 타이포, 간격, i18n, 모바일 퍼스트)을 **코드가 실제로 따르게** 만든다. (현재 문서와 코드 간 괴리 존재)
4. 시각/동작 변경은 최소화하고 **리팩터링 중심**으로 진행한다. (Karpathy 원칙: 작고 점진적, 단계별 빌드·검증)

---

## 2. 현황 리뷰 (코드 실측)

### 2.1 페이지 규모

| 파일 | 줄 수 | 비고 |
|---|---:|---|
| `pages/graph/ComplexTab.tsx` | 1,717 | 비대 |
| `pages/graph/OverviewTab.tsx` | 1,388 | 비대 |
| `pages/RegionMapPage.tsx` | 1,360 | 비대, 하드코딩 색상 최다 |
| `pages/DatabaseAdmin.tsx` | 1,326 | 비대, 탭 다수 |
| `pages/graph/NearbyStationTab.tsx` | 1,241 | 비대 |
| `pages/Dashboard.tsx` | 1,205 | 비대 |
| `pages/graph/FilterPanel.tsx` | 1,184 | 비대 |
| `pages/Rules.tsx` / `ActivityLog.tsx` / `Settings.tsx` | 894 / 703 / 684 | 큼 |
| `locales/ko.ts` | 1,061 | 한국어만 존재 (영문 대응은 범위 제외) |

### 2.2 공통 컴포넌트 현황 (존재하는 것)

`PageHeader`, `SectionCard`, `StatCard`, `common/{EmptyState, LoadingSpinner, ResponsiveTabs}`, `charts/{BoxPlotShape, chartStyles}`, `MapLegend`, `RegionPeriodFilter`, `MultiRegionSelect`, `RegionSearchInput`.

**도입률 불균형**

- `ResponsiveTabs`: 2개 페이지만 사용 / `LoadingSpinner`: 1개 페이지만 사용 / `EmptyState`: **사용처 0**
- 반면 `animate-spin` 직접 구현이 14개 파일, 총 약 38곳에 중복.

### 2.3 문제점 (우선순위 순)

| # | 문제 | 근거(실측) | 영향 |
|---|---|---|---|
| P1 | **Button 컴포넌트 부재** | `<button` 20여 개 파일 약 250곳. Primary 버튼 클래스가 최소 6종 변형(`px-3 text-xs h-8` / `px-4 py-2 text-sm` / `px-5 py-2.5 rounded-xl` / `px-6 py-2.5 shadow-md` / `shadow-blue-500/20` 하드코딩 등) | 높이·라운드·그림자 불일치, 접근성(포커스링) 불균일 |
| P2 | **Input/Select/Field 부재** | `<input` 14개 파일 약 60곳, 입력 클래스 변형 7종 이상 (`px-3 text-xs h-[36px]`, `text-[9px] md:text-[10px] h-7` 등). 극소 폰트(9~10px)로 모바일 가독성·터치 타깃 미달 | 폼 외관 불일치, 터치 타깃 < 44px |
| P3 | **Modal/Drawer/ConfirmDialog 부재** | `fixed inset-0` 오버레이가 9곳에서 개별 구현(ComplexTab, FilterPanel, InsightTab, ActivityLog, Dashboard, DatabaseAdmin, Layout, RecentRuns×2, TelegramGuideModal) — ESC 닫기, 포커스 트랩, 스크롤 락 일관성 없음 | 접근성/동작 불일치 |
| P4 | **`alert()` / `confirm()` 네이티브 사용** | `alert(` 약 27곳(DatabaseAdmin 14, InsightTab 7 등), `confirm(` 약 10곳 | 모바일 UX 이질감, i18n/스타일 불가, 테스트 불가 → **Toast + ConfirmDialog** 필요 |
| P5 | **Table 패턴 중복** | `<table` 5개 파일 7곳 (DatabaseAdmin 3, Dashboard, ActivityLog, InsightTab, NearbyStationTab) 헤더/정렬/숫자 우측정렬 방식 제각각 | 표준(`tabular-nums`, `text-right`) 미준수 |
| P6 | **디자인 토큰 우회 (하드코딩 색상)** | `text-slate-*` RegionMapPage 100, Login 28, ComplexAnalysisPage 22, Settings 20, Layout 15 / `bg-slate-*` RegionMapPage 56 / HEX 직접 사용 ActivityLog 20, ComplexTab 9 등 / `shadow-blue-500/20` | **다크모드·Accent(violet/green) 전환 시 깨짐**, 05_DESIGN §2·§9 위반 |
| P7 | **PageHeader 문서-코드 불일치** | 문서: `.text-app-title` 사용·"카드 내부 타이틀 금지". 코드: `text-xl md:text-2xl font-black`, 모바일에서 subtitle 숨김, `<h2>` 사용(SectionCard도 `<h2>`) / `ActivityLog` 등에서 KPI에 `text-2xl font-black` 직접 지정 | 타이포 위계·`h1` 부재(a11y), 글자 크기 설정(12~22px) 미반영 |
| P8 | **StatCard 외 KPI 카드 수작업** | Dashboard·ActivityLog에서 `rounded-xl border` 카드 수동 구현 다수 (`rounded-xl border` 총 약 55곳) | 카드 padding/라운드 편차 |
| P9 | **라운드 일관성** | 입력·버튼은 `rounded-lg`, 카드는 `rounded-xl`, 일부 버튼은 `rounded-xl` | 시각 통일감 저하 |
| P10 | **브레이크포인트 직접 접근** | `window.innerWidth` 3곳(OverviewTab, RegionMapPage, ShaderBackground) | 문서 규칙 위반, SSR/리사이즈 불일치 |
| P11 | **CSS 토큰 정의 중복** | `styles.css`에 다크 토큰 블록이 `@media(prefers-color-scheme)`와 `html.dark`에 **동일 값 2벌 복제**, `styles/theme.css`(23줄)와 역할 중복 가능성 | 토큰 변경 시 누락 위험 |
| P12 | **상태 UI 비일관** | 로딩(스피너 크기/색 상이), 빈 상태(`EmptyState` 미사용), 에러 표시(텍스트/alert 혼재) | 사용자 혼란 |
| P13 | **App.tsx 라우팅 중복** | `validViews` 배열이 2곳 복붙, 관리자 뷰 목록 하드코딩, 자체 history 관리 | 뷰 추가 시 3곳 수정 필요 |
| P14 | **차트 설정 중복** | 05_DESIGN은 `stroke="#64748b"`, 그리드 `#1e293b` HEX를 규정(§9 내부 모순: 토큰 의무화 vs HEX 예시). ComplexTab/OverviewTab에 HEX 직접 | 라이트 모드 그리드 가시성, 토큰 불일치 |
| P15 | **지도 가격 색상 상수 분산** | `mapTheme.ts`는 존재하나 RegionMapPage 내부 `bg-slate-*` 56회 등 별도 스타일 다수 | 지도 페이지 톤 이질 |

---

## 3. 목표 구조

```
src/components/
├── ui/                      ← 신규: 원자(Atomic) 컴포넌트
│   ├── Button.tsx           (variant: primary|secondary|ghost|danger|link, size: sm|md|lg, loading, icon)
│   ├── IconButton.tsx
│   ├── Input.tsx / Select.tsx / Textarea.tsx / Checkbox.tsx / Toggle.tsx
│   ├── Field.tsx            (label + control + hint + error)
│   ├── Badge.tsx            (tone: neutral|primary|positive|warn|warning)
│   ├── Chip.tsx / SegmentedControl.tsx   (단위 토글, 필터 칩)
│   ├── Modal.tsx / Drawer(BottomSheet).tsx / ConfirmDialog.tsx
│   ├── Toast.tsx + ToastProvider (useToast)
│   ├── Spinner.tsx (← LoadingSpinner 흡수), Skeleton.tsx
│   └── index.ts
├── common/                  ← 조합(Molecule) 컴포넌트
│   ├── PageHeader / SectionCard / StatCard  (기존 이동·개선, 기존 경로 re-export 유지)
│   ├── DataTable.tsx        (컬럼 정의, 숫자 우측정렬·tabular-nums, 모바일 카드 전환)
│   ├── EmptyState / ErrorState / LoadingState (상태 3종 세트)
│   ├── ResponsiveTabs
│   ├── FilterBar.tsx        (기간·지역·면적 등 필터 슬롯 표준)
│   ├── KpiGrid.tsx          (StatCard 그리드 gap-4 표준)
│   └── ListRow / KeyValueList
├── charts/                  ← 기존 + ChartFrame(범례·툴팁·축 표준 래퍼), ChartTooltip, ChartLegend
├── map/                     ← KakaoMap, MapLegend, 마커 HTML 빌더 모음 (mapTheme 연계)
└── layout/                  ← Layout 분리: Sidebar, TopBar, BottomNav, AllMenuDrawer, SettingsPopover
```

공통 규칙: 모든 `ui/*`는 (1) 토큰 클래스만 사용, (2) `focus-visible` 링 내장, (3) 최소 터치 타깃 40px(모바일), (4) 텍스트는 props로 주입(i18n은 호출부), (5) `className` 오버라이드 허용(`classNames` 유틸).

---

## 4. 단계별 실행 계획

각 Phase는 **독립 PR/커밋 단위**이며, 끝날 때마다 `npm run build` + 390px/768px/1280px 수동 확인(+ 라이트/다크/Accent 3종)을 수행한다.

### Phase 0 — 기준선 정리 (0.5일)
- [ ] 현 화면 스크린샷 기준선 확보(13개 뷰 × 390/1280 × 라이트/다크) → `docs/plans/assets/` (선택)
- [ ] `styles/theme.css` vs `styles.css` 역할 정리, 다크 토큰 중복 제거(P11): `html.dark`와 media 쿼리를 CSS 커스텀 셀렉터 한 곳으로 통합
- [ ] 토큰 보강: `--radius-control/card`, `--shadow-*`, `--color-status-info`, `--color-focus-ring`, 지도/차트 토큰, `bg-primary-hover` 등 유틸 추가
- [ ] ESLint 규칙 도입 검토(`no-restricted-syntax`: `window.innerWidth`, `alert(`, `confirm(`; Tailwind 하드코딩 색상 `text-slate-` 경고)

### Phase 1 — 원자 컴포넌트 `ui/` 구축 + Storybook (3일)
0. Storybook 세팅 (라이트/다크/Accent 툴바, 390/768/1280 뷰포트)
1. `Button`, `IconButton`, `Spinner` (P1, P12)
2. `Input`, `Select`, `Textarea`, `Field`, `Toggle`, `Checkbox` (P2)
3. `Badge`, `Chip`, `SegmentedControl` (단위 토글/필터 칩)
4. `Modal`, `BottomSheet`(모바일), `ConfirmDialog` — ESC/배경 클릭/포커스 트랩/body 스크롤 락/`role="dialog"` (P3)
5. `ToastProvider` + `useToast` — `App` 루트에 장착 (P4)
6. 기존 `LoadingSpinner`/`EmptyState`는 신규 컴포넌트를 감싸는 얇은 래퍼로 전환(하위 호환)

> 완료 기준: 위 컴포넌트의 variant 전체가 Storybook 스토리로 작성되어 확인 가능 (§9 참조).

### Phase 2 — 조합 컴포넌트 `common/` 개선 (1.5일)
- [ ] `PageHeader`: 타이포를 `.text-app-title`로 교체, `h1` 의미 보정, 모바일 subtitle 정책 확정(숨김 vs 1줄 축약), 문서 일치 (P7)
- [ ] `SectionCard`: `title` 태그를 `h2`/`h3` 레벨 prop화, padding 표준(`p-4 md:p-5`) 고정
- [ ] `StatCard`/`KpiGrid`: 아이콘 톤·수치 폰트(`.text-app-metric`) 표준화, ActivityLog·Dashboard 수작업 KPI 카드 대체 대상 정의 (P8)
- [ ] `DataTable`: 컬럼 `align`/`numeric`/`sticky`, 로딩·빈·에러 상태 내장, 모바일(<768px)에서 가로 스크롤 또는 카드 리스트 전환 (P5)
- [ ] `EmptyState`/`ErrorState`/`LoadingState` 3종 정립 (P12)
- [ ] `FilterBar`: `RegionPeriodFilter`·`MultiRegionSelect`·FilterPanel 공통 슬롯 정리

### Phase 3 — 전역 치환 1: 상태·피드백 (1.5일, 위험 낮음)
- [ ] 모든 `alert(` → `toast.success/error`, `confirm(` → `ConfirmDialog` (P4) — DatabaseAdmin → InsightTab → FilterPanel → AllowedAccounts → Dashboard → Rules → RecentRuns 순
- [ ] 모든 `animate-spin` 인라인 → `Spinner`/`LoadingState` (14파일)
- [ ] 빈 상태 문구 → `EmptyState` (i18n 키 신규 추가)
- [ ] 9곳 모달 오버레이 → `Modal`/`BottomSheet` (TelegramGuideModal, TempPasswordResetModal, RecentRuns 등)

### Phase 4 — 전역 치환 2: 입력·버튼·표 (3일)
페이지 위험도 낮은 순으로 진행하며, 페이지당 1커밋:

`Login → AllowedAccounts → Collect → ComplexAnalysisPage → Settings → Rules → ActivityLog → DatabaseAdmin → Dashboard`

- [ ] `<button className="…bg-primary…">` → `<Button>` (P1, P9: 컨트롤 `rounded-lg`, 카드 `rounded-xl`로 규칙 확정)
- [ ] `<input/select>` → `Input/Select/Field`, 9~10px 극소 폰트 제거(최소 `text-app-label`) (P2)
- [ ] `<table>` 7곳 → `DataTable` (P5)
- [ ] `shadow-blue-500/20` 등 컬러 하드코딩 → `shadow-primary/20` 또는 토큰 shadow

### Phase 5 — 토큰 준수 정리 (2일)
- [ ] `text-slate-*`/`bg-slate-*`/HEX → 시맨틱 클래스 치환: RegionMapPage → Login → ComplexAnalysisPage → Settings → Layout → ActivityLog (P6)
  - 치환 매핑표: `text-slate-900/800 → text-strong`, `text-slate-500/600 → text-neutral`, `text-slate-400 → text-assistive`, `bg-white → bg-elevated/bg-normal`, `bg-slate-50/100 → bg-alternative`, `border-slate-* → border-normal`
- [ ] 차트 HEX → `var(--color-chart-*)`, `chartStyles.ts`에 axis/grid/tooltip 상수 일원화(P14), 05_DESIGN §9 예시 코드도 토큰 기준으로 수정
- [ ] 지도: 가격대 색·선택·반경 스타일을 `mapTheme.ts`로 완전 이관, RegionMapPage 잔여 하드코딩 제거(P15)
- [ ] `window.innerWidth` 3곳 → `useBreakpoint` (ShaderBackground는 예외 사유 주석) (P10)
- [ ] 다크/Accent 3종 조합 육안 점검

### Phase 6 — 비대 페이지 모듈 분리 (4~5일, 가장 위험)
원칙: **동작 불변, 파일만 분할**. 상태/훅은 `useXxx`로 추출, 화면 조각은 `components` 하위로 이동, props 인터페이스는 명시.

| 대상 | 분할안 |
|---|---|
| `ComplexTab` (1,717) | `complex/{ComplexSearchBar, ComplexSummaryCards, PriceTrendChart, FloorAreaCharts, TradeTable, useComplexData}.tsx` |
| `OverviewTab` (1,388) | `overview/{OverviewKpis, TrendChart, BoxPlotCard, RegionRanking, useOverviewData}` |
| `RegionMapPage` (1,360) | `regionMap/{MapToolbar, ComplexListPanel, ComplexDetailSheet, MarkerLayer, useRegionMap}` — 모바일 바텀시트 패턴 통일 |
| `DatabaseAdmin` (1,326) | 탭별 파일: `dbAdmin/{StatsTab, RegionsTab, GeocodeTab, MaintenanceTab …}` |
| `NearbyStationTab` (1,241) | `nearby/{StationSearch, RadiusControls, StationMap, ComplexList}` |
| `Dashboard` (1,205) | `dashboard/{SystemKpis, CollectStatus, RecentRuns, …}` |
| `FilterPanel` (1,184) | `filter/{RegionFilter, AreaFilter, PeriodFilter, PresetManager}` + 공용 `FilterBar` 연결 |
| `Layout` (465) | `layout/{Sidebar, TopBar, BottomNav, AllMenuDrawer, SettingsPopover}` |

- 한 번에 **한 파일씩**, 분할 직후 빌드·화면 동작 확인 후 다음 진행.
- 목표: 페이지 컴포넌트 ≤ 400줄, 하위 컴포넌트 ≤ 300줄.

### Phase 7 — 라우팅/구조 정리 (1일)
- [ ] `App.tsx`: `VIEWS` 메타 상수(`id`, `adminOnly`, `icon`, `labelKey`, `component`) 단일 소스화 → `validViews`/`adminViews`/Layout 메뉴 파생 (P13)
- [ ] `useViewRouter()` 훅으로 URL·history·권한 가드 분리
- [ ] 페이지 전환 시 `LoadingState` Suspense fallback 통일

### Phase 8 — 문서화 & 가드 (1일)
- [ ] `docs/05_DESIGN.md` 갱신: 공통 컴포넌트 카탈로그, 버튼/입력 사이즈 표, 라운드/그림자/간격 규칙, 상태 UI 규칙
- [ ] `docs/01_OVERVIEW.md` 디렉토리 구조 갱신, `AGENTS.md` 규칙에 "신규 UI는 `components/ui` 우선 사용" 추가
- [ ] `docs/06_ROADMAP.md`에 Phase 반영
- [ ] 수동 회귀 체크리스트 `docs/plans/11_UI_QA_CHECKLIST.md` (선택)

---

## 5. 디자인 표준 확정안 (구현 기준)

| 항목 | 표준 |
|---|---|
| 컨트롤(버튼/입력) 높이 | sm 32px / md 40px(기본) / lg 48px, 모바일 주요 액션 최소 40px |
| 컨트롤 라운드 | `rounded-lg` |
| 카드 / 모달 라운드 | `rounded-xl` / `rounded-2xl`(모바일 바텀시트 상단) |
| 버튼 variant | primary(solid) · secondary(outline) · ghost · danger · link |
| 최소 폰트 | `.text-app-caption`(12px↑). `text-[9px]`/`[10px]` 신규 금지 |
| 그림자 | 카드 `shadow-sm`, 모달 `shadow-xl`, primary 버튼 `shadow-sm` 고정(색상 그림자 제거) |
| 포커스 | `focus-visible:ring-2 ring-primary/40` 전 컴포넌트 공통 |
| 로딩 | 섹션: `LoadingState`(스피너+문구), 인라인: 버튼 `loading` prop |
| 피드백 | 성공/실패 = Toast, 파괴적 동작 = ConfirmDialog, `alert/confirm` 금지 |
| 수치 | `tabular-nums` + 우측정렬 + 천 단위 콤마(`format.ts` 유틸만 사용) |
| 제목 위계 | 페이지 `h1`(PageHeader) → 카드 `h2` → 소제목 `h3` |

---

## 6. 일정·우선순위 요약

| Phase | 내용 | 예상 | 위험 | 효과 |
|---|---|---|---|---|
| 0 | 기준선/토큰 정리 | 0.5d | 낮음 | 중 |
| 1 | `ui/` 원자 컴포넌트 + Storybook | 3d | 낮음 | **높음** |
| 2 | `common/` 개선 | 1.5d | 낮음 | 높음 |
| 3 | 피드백·모달·스피너 치환 | 1.5d | 낮음 | **높음** |
| 4 | 버튼·입력·표 치환 | 3d | 중 | **높음** |
| 5 | 토큰 준수(다크/Accent) | 2d | 중 | 높음 |
| 6 | 비대 페이지 분할 | 4~5d | **높음** | 중(유지보수) |
| 7 | 라우팅 정리 | 1d | 중 | 중 |
| 8 | 문서·가드 | 1d | 낮음 | 중 |
| **합계** | | **약 17~19일** | | |

> 권장 순서: 0 → 1 → 2 → 3 → 4 → 5 → 7 → 6 → 8. (Phase 6은 공통 컴포넌트 치환 후 진행해야 분할 대상 코드량이 줄어든다.)
> 병렬화(subagent): Phase 4의 페이지별 치환, Phase 6의 파일별 분할은 파일이 겹치지 않으므로 병렬 진행 가능.

---

## 7. 검증 방법

1. **빌드/타입**: 각 단계 `npm run build` 통과.
2. **반응형**: 390px / 768px / 1280px, 가로 스크롤·텍스트 잘림·터치 타깃 점검.
3. **테마 매트릭스**: 라이트·다크 × Accent(blue/violet/green) × 글자 크기(12/16/22px).
4. **grep 가드**(Phase 완료 시 잔여 건수 0 목표):
   - `alert(`, `confirm(` → 0
   - `window.innerWidth` → 0 (예외 1)
   - `animate-spin` 인라인 → `Spinner` 내부 1곳
   - `text-slate-`, `bg-slate-`, `#[0-9a-f]{6}` (지도 마커 HTML·차트 상수 제외) → 0
   - `<button`/`<input`/`<select`/`<table` 직접 사용 → `components/ui|common` 내부로 한정
5. **기능 회귀**: 로그인, 지역 지도 탐색, 분석 4탭 필터·차트, 룰 CRUD, DB 어드민 작업, 설정 변경 수동 시나리오.
6. **a11y 스모크**: 키보드 탭 이동, 모달 ESC·포커스 트랩, `h1` 1개/페이지.

---

## 8. 리스크 및 대응

| 리스크 | 대응 |
|---|---|
| 대규모 치환으로 의도치 않은 시각 변경 | Phase별 소규모 커밋, 기준선 스크린샷 비교 |
| 비대 파일 분할 중 상태 의존 깨짐 | 훅 추출 → 컴포넌트 분리 순서, 분할 전후 동작 동일성 확인 |
| i18n 누락(신규 문구) | 신규 컴포넌트는 문자열을 props로만 받고, 신규 키는 `ko.ts`(+en) 동시 추가 |
| Tailwind purge로 동적 클래스 소실 | variant 클래스는 완성형 문자열 맵으로 정의(문자열 조합 금지) |
| 지도/차트 SVG·HTML 문자열 내부는 Tailwind 토큰 적용 불가 | `mapTheme.ts`/`chartStyles.ts`에서 CSS 변수(`getComputedStyle`) 또는 상수로 중앙 관리 |

---

## 9. 확정된 결정 사항 (2026-10-25)

| # | 항목 | 결정 | 계획 반영 |
|---|---|---|---|
| 1 | English 사전 | **이번 범위 제외** | 신규 문구는 `ko.ts`에만 키 추가. 컴포넌트는 문자열을 props로만 받아 추후 영문화 대비 (Phase 0의 English 확인 항목 삭제) |
| 2 | 모바일 PageHeader subtitle | **현행 유지(숨김)** | Phase 2 `PageHeader`는 타이포·`h1` 보정만 수행 |
| 3 | Toast | **자체 구현** | Phase 1 `ToastProvider`/`useToast` 의존성 0 |
| 4 | Phase 6 파일 분할 | **전체 수행** | 표의 8개 대상 모두 분할 |
| 5 | Storybook | **도입** | Phase 1에 Storybook 세팅 포함 (아래 참조) |

### Storybook 도입 세부
- Phase 1 시작 시 `@storybook/react-vite` 설정 (`packages/dashboard`, devDependency, 라이트/다크/Accent 툴바 전역 데코레이터, `viewport` 390/768/1280 프리셋).
- 모든 `ui/*`, `common/*` 컴포넌트는 variant 전체를 스토리로 작성(완료 기준). 임시 `/?view=__ui` 쇼케이스는 만들지 않음.
- 스크립트: `npm run storybook`, `npm run build-storybook` (프로덕션 번들/Docker 이미지에서는 제외).
- 일정 영향: Phase 1 2일 → **3일**, 합계 약 **17~19일**.


