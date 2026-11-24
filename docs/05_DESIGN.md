# [05] 프론트엔드 스타일 및 UI 가이드라인 (Design Guide)

프론트엔드 디자인 토큰, 타이포그래피, 반응형 레이아웃(md: 768px), 컴포넌트 표준, Recharts 및 지도 테마 명세.

## 1. 반응형 레이아웃 분기 (md: 768px)

- **원칙**: 모바일 퍼스트 (Mobile-First, 390px 기준 검증).
- **분기 판정**: `useBreakpoint()` 훅 사용. `window.innerWidth` 직접 참조 금지.
  - `isMobile`: `< 768px`
- **데스크톱 (>= 768px)**:
  - 좌측 사이드바: `w-56`(기본) 또는 `w-16`(축소). 상태 영속화(`myhome_sidebar_collapsed`).
  - 콘텐츠 뷰포트: 상단 헤더 배제, `px-6 py-5 max-w-screen-xl mx-auto w-full`.
- **모바일 (< 768px)**:
  - 상단 툴바: `h-14 bg-elevated/80 backdrop-blur border-b border-normal sticky top-0 z-30`.
  - 하단 탭바 (`BottomNav`): 최대 5개 핀 메뉴 + "전체" 드로어 버튼.
  - 전체 메뉴 (`AllMenuDrawer`): 바텀시트 메뉴, 시작 페이지 설정(★) 지원.

## 2. 디자인 토큰 (Design Tokens)

시맨틱 CSS 변수 및 매핑 클래스 사용. 색상 직접 하드코딩 금지.

| CSS 변수명 | Tailwind 클래스 | 용도 | 라이트 | 다크 |
|---|---|---|---|---|
| `--color-semantic-background-normal-normal` | `.bg-normal` | 기본 배경 | `#ffffff` | `#0f172a` (slate-900) |
| `--color-semantic-background-normal-alternative` | `.bg-alternative` | 대체 배경 | `#f8fafc` | `#020617` (slate-950) |
| `--color-semantic-background-elevated-normal` | `.bg-elevated` | 카드/팝업 배경 | `#ffffff` | `#1e293b` (slate-800) |
| `--color-semantic-label-strong` | `.text-strong` | 주요 헤더/강조 | `#1f2933` | `#f8fafc` |
| `--color-semantic-label-neutral` | `.text-neutral` | 일반 본문 | `#64748b` | `#cbd5e1` |
| `--color-semantic-label-assistive` | `.text-assistive` | 부연설명/배지 | `#94a3b8` | `#64748b` |
| `--color-semantic-primary-normal` | `.text-primary` / `.bg-primary` | 브랜드 액센트 | 동적 액센트 컬러 바인딩 | 동적 바인딩 |
| `--color-semantic-status-positive` | `.text-signal` | 성공/상승 | `#10b981` | `#34d399` |
| `--color-semantic-status-negative` | `.text-warn` | 오류/하락 | `#ef4444` | `#f87171` |
| `--color-semantic-status-warning` | `.text-warning` / `.bg-warning` | 경고/대기 | `#f59e0b` | `#fbbf24` |
| `--color-semantic-line-normal-normal` | `.border-normal` | 디바이더/경계 | `#d7dee8` | `#334155` (slate-700) |

- **액센트 컬러**: `html[data-accent="blue|violet|green"]`
- **서체**: `html[data-font-family="noto-sans-kr|noto-serif-kr"]`
- **폰트 크기 슬라이더**: `--app-font-size` (12px ~ 22px, 기본 16px)

## 3. 타이포그래피 표준

| 용도 | Tailwind 클래스 | 규격 |
|---|---|---|
| Page title | `.text-app-title font-bold` | 최상위 대제목 |
| Subtitle | `.text-app-body-sm text-slate-500` | 부제 및 설명 |
| Card title | `.text-app-body font-semibold` | 카드 내부 제목 |
| Body text | `.text-app-body` | 일반 본문 |
| Labels / Table headers | `.text-app-label` | 폼 레이블, 테이블 헤더 |
| Metadata / Badges | `.text-app-caption` | 태그, 메타데이터 |
| Metric Value | `.text-app-metric font-mono` | KPI 금액/수치 |

- **숫자 콤마 표기**: `.toLocaleString("ko-KR")` 강제.
- **억 단위 소수점**: 100만원 단위 보존 위해 소수점 2자리(`.toFixed(2)`) 표준.

## 4. 공통 컴포넌트 표준

- **`PageHeader`**: H1/H2 직접 태그 금지. 아이콘, 타이틀, 설명, 우측 액션 슬롯 통합.
- **`SectionCard`**: `rounded-2xl border border-normal bg-elevated shadow-xs`. 헤더 디바이더 `border-b border-normal/50 px-4 py-3.5 sm:px-5`.
- **`StatCard`**: `rounded-2xl border border-normal bg-elevated p-3.5 sm:p-4 shadow-xs`. 레이블 `text-xs text-neutral` → 수치 `text-2xl font-bold tabular-nums tracking-tight`. 양수 `.text-signal`, 음수/경고 `.text-warn`.
- **`ChartFrame`**: 모든 차트 섹션의 표준 프레임. `title`/`subtitle`/`headerRight`(필터·단위 슬롯)/`legend`(범례 토글 전용 줄바꿈 슬롯)/`footer` 슬롯을 제공하고 로딩·빈 상태를 내부에서 처리한다. 본문 높이는 모바일 `h-[240px]` / 태블릿 `h-[280px]` / 데스크톱 `h-[320px]`(`useChartResponsive()`의 `chartHeightClassName`).
- **`ChartLegendToggles`**: 범례 토글 필(pill) 단일 컴포넌트. 비활성 시리즈는 `opacity-45`만 낮춰 레이아웃 점프를 막는다. 박스플롯 계열은 `boxPlotLegendItems(t)`를 공유한다.
- **`ChartTooltip` / `ChartStatTooltip`**: 툴팁 단일 규격(금액·건수는 `tabular-nums`). 통계형(최고/최저/사분위)은 `ChartStatTooltip`의 `rows`를 사용한다.
- **`Inputs & Selects`**: `w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50`. 필터 바 컨트롤은 `h-9`로 통일한다.
- **`Buttons`**:
  - Primary: `rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50`
  - Secondary: `rounded-lg border border-normal bg-normal px-4 py-2 text-sm font-bold text-strong hover:bg-alternative`
- **`ResponsiveTabs`**:
  - 데스크톱 (>= 768px): Underline 탭 (`border-b-2 -mb-px`, 활성 `border-primary text-primary font-bold`).
  - 모바일 (< 768px): 가로 스크롤 Pill 탭 (`overflow-x-auto scrollbar-none snap-x`, 활성 `bg-primary text-white rounded-full`).

## 4-1. Z-Index 레이어 계층

새 오버레이를 추가할 때는 아래 계층을 따른다(임의의 `z-[99]` 사용 금지).

| 레이어 | z-index | 대상 |
|---|---|---|
| 지도·차트 내부 오버레이 | `z-10` | 검색창, 지도 컨트롤, 차트 위 배지 |
| 모바일 바텀시트 백드롭 | `z-20` | 대시보드 바텀시트 열림 시 딤 |
| Sticky 헤더·사이드바·바텀시트/탭바 | `z-30` | `SidebarNav`, `TopHeaderBar`, `MobileBottomNav`, 대시보드 바텀시트 |
| Portal 팝오버·드롭다운 | `z-40` | 사이드바 프로필 메뉴, 필터 드롭다운 |
| 모달·드로어 | `z-50` 백드롭 / `z-[55]` 본문 | `AllMenuDrawer`, `RegionManagerModal` |

- sticky/`overflow`/`transform` 부모 안에서 잘리는 오버레이는 `createPortal(..., document.body)` + `fixed` 좌표로 렌더링한다(사이드바 프로필 팝오버가 기준 구현).


## 5. 모바일 레이아웃 제약 사항

- **고정 폭 SVG 금지**: `ResponsiveContainer` 또는 `viewBox` + `width="100%"` 강제.
- **개행 방지**: 탭/버튼 텍스트 `whitespace-nowrap`, 오버플로우 부모에 스크롤 부여.
- **텍스트 Truncate**: Flex 아이템 축소 시 `min-w-0` + `truncate` 동시 선언.
- **숫자 정렬**: `tabular-nums` 클래스 및 우측 정렬(`text-right`) 강제.
- **드롭다운 폭 상한**: `width: min(240px, calc(100vw - 24px))` 선언으로 뷰포트 초과 방지.
- **i18n 강제**: 하드코딩 텍스트 금지. `packages/dashboard/src/locales/ko.ts` 및 `t.key` 참조.

## 6. Recharts 및 Box Plot 스케일링 정책

- **CSS 토큰 바인딩**: 선/면 컬러에 `var(--color-chart-*)` 직접 참조 (HEX 하드코딩 금지).
- **그리드/축 규격**:
  - Grid: `strokeDasharray="3 3"` + `var(--color-semantic-line-normal-normal)` (`chartGridProps`)
  - XAxis/YAxis: `tickLine={false} axisLine={false}` + `fontSize={11}`
  - 축 폭은 고정값 대신 `useChartResponsive()`를 사용: Y축 `42/46/52px`, 보조 Y축 `34/37/40px` (모바일/태블릿/데스크톱)
  - X축은 `interval="preserveStartEnd"` + 반응형 `minTickGap`(`28/20/12`)으로 390px 화면에서도 라벨이 겹치지 않게 한다.
- **Box Plot 동적 Y축 스케일링**:
  - `<Bar>`의 `shape={<BoxPlotShape />}`로 Whisker/Box/Median 일괄 렌더링.
  - Recharts Y축 자동 도메인 지원을 위해 투명 가이드 `<Line>` 조건부 배치:
```tsx
{!hideWhisker ? (
  <>
    <Line yAxisId="left" dataKey="max" stroke="none" dot={false} activeDot={false} legendType="none" />
    <Line yAxisId="left" dataKey="min" stroke="none" dot={false} activeDot={false} legendType="none" />
  </>
) : !hideBox ? (
  <>
    <Line yAxisId="left" dataKey="q3" stroke="none" dot={false} activeDot={false} legendType="none" />
    <Line yAxisId="left" dataKey="q1" stroke="none" dot={false} activeDot={false} legendType="none" />
  </>
) : (
  <Line yAxisId="left" dataKey="mean" stroke="none" dot={false} activeDot={false} legendType="none" />
)}
```

## 7. 지도 마커 테마 표준 (`mapTheme.ts`)

### 단지 마커 4단계 가격대 컬러
| 가격대 | 테마 컬러 | Tailwind 클래스 | 지시선 HEX |
|---|---|---|---|
| **15억 이상** | Premium Indigo | `bg-indigo-600 border-indigo-500` | `#4f46e5` |
| **10억 ~ 15억** | Coral Rose | `bg-rose-500 border-rose-400` | `#f43f5e` |
| **5억 ~ 10억** | Sky Blue | `bg-blue-600 border-blue-500` | `#2563eb` |
| **5억 미만** | Emerald Green | `bg-emerald-600 border-emerald-500` | `#059669` |
| **미등록** | Neutral Slate | `bg-slate-600 border-slate-500` | `#64748b` |

- **선택 마커**: `bg-amber-500 border-amber-300 ring-[3px] ring-white dark:ring-slate-900 shadow-xl scale-108 text-slate-950`
- **지하철역 마커**: `bg-slate-900 dark:bg-slate-800 text-white border-2 border-indigo-400` + 애니메이션 핑.
- **반경 원**: 500m (`#4f46e5`, opacity 0.08, dashed), 1000m (`#059669`, opacity 0.05, dashed).

## 8. Bento Grid 레이아웃 (`BentoGrid.tsx`)

- **그리드 컬럼**: 모바일 `grid-cols-1` → md 6열 → lg 12열 (`gap-4`).
- **셀 지정**: `BentoItem`의 `md`(1~6), `lg`(1~12), `rows`(1~3). 정적 매핑 클래스 사용 (동적 문자열 조합 금지).
- **적용 현황**:
  - 홈 대시보드: 지도(lg 8열×2행) + KPI 2x2(4열×2행), 하단 이력 2종(6열씩).
  - 단지 분석 탭: 월별 트렌드(8열) + 층별 분포(4열).

## 9. PWA (Progressive Web App) 및 단독 실행 (Standalone) 규격

- **원칙**: 모바일 및 데스크톱 환경에서 브라우저 주소창 없이 네이티브 앱처럼 단독 실행(Standalone) 지원.
- **Web App Manifest (`manifest.webmanifest`)**:
  - `display`: `standalone`
  - `display_override`: `["window-controls-overlay", "standalone", "minimal-ui"]`
  - `theme_color`: `#0f172a`
  - `background_color`: `#0f172a`
  - `icons`: 192x192, 512x512 일반(any) 및 마스크 가능(maskable, safe zone 80% 패딩) 아이콘 제공.
  - `shortcuts`: 단지 지도(`/?view=map`), 시세 통계(`/?view=analytics`), 알림 규칙(`/?view=alerts`).
- **Service Worker (`vite-plugin-pwa`)**:
  - `registerType: "autoUpdate"`: 최신 버전 자동 반영 및 캐시 갱신.
  - 프리캐싱: HTML, JS, CSS, SVG, PNG, 폰트 자산 사전 캐싱.
  - 런타임 캐싱: 구글 폰트(`CacheFirst`, 1년), API 엔드포인트(`NetworkFirst`, 10분).
  - 서버 캐시 제어: `sw.js` 및 `manifest.webmanifest`는 `Cache-Control: no-cache` 보장.
- **모바일 뷰포트 & 안전 영역 (Safe Area)**:
  - `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`
  - 노치/다이내믹 아일랜드 및 하단 제스처 바 대응: `.safe-top`, `.safe-bottom`, `.safe-x` CSS 유틸리티 제공.
- **설치 UX**:
  - `usePWA()` 훅: 단독 실행 상태(`isStandalone`), 설치 가능 여부(`isInstallable`), iOS 사파리 감지(`isIOS`).
  - `PWAInstallBanner`: 첫 방문 사용자를 위한 세련된 카드형 설치 유도 배너 (7일간 닫기 기억).
  - iOS 가이드 모달: 사파리 공유 버튼 → "홈 화면에 추가" 3단계 직관적 안내.
  - `PWAInstallButton`: 사이드바 프로필 메뉴 및 전체 메뉴 드로어 내 상시 설치 및 실행 상태 배지 제공.

