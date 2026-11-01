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
  - 상단 툴바: `h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b sticky top-0`.
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
- **`SectionCard`**: `rounded-xl border border-normal bg-elevated shadow-sm`. 헤더 디바이더 `border-b border-normal px-5 py-4`.
- **`StatCard`**: `rounded-xl border border-normal bg-elevated p-4 shadow-sm`. 양수 `.text-signal`, 음수/경고 `.text-warn`.
- **`Inputs & Selects`**: `w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50`.
- **`Buttons`**:
  - Primary: `rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50`
  - Secondary: `rounded-lg border border-normal bg-normal px-4 py-2 text-sm font-bold text-strong hover:bg-alternative`
- **`ResponsiveTabs`**:
  - 데스크톱 (>= 768px): Underline 탭 (`border-b-2 -mb-px`, 활성 `border-primary text-primary font-bold`).
  - 모바일 (< 768px): 가로 스크롤 Pill 탭 (`overflow-x-auto scrollbar-none snap-x`, 활성 `bg-primary text-white rounded-full`).

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
  - Grid: `strokeDasharray="3 3" stroke="#1e293b"`
  - XAxis/YAxis: `stroke="#64748b" fontSize={11} tickLine={false}`
  - YAxis width: `width={52}` 고정 (수치 절삭 방지).
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
