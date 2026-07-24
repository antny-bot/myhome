# [05] myhome 프론트엔드 스타일, 디자인 및 화면 구성 가이드라인

본 문서는 `myhome` 서비스의 프론트엔드 스타일, 디자인 토큰, 타이포그래피, 화면 구성 레이아웃 규격, 반응형 규칙, 다국어 및 차트 컴포넌트 시각 디자인 표준을 정의합니다. 모든 프론트엔드 UI 개발 및 수정 시 반드시 본 표준을 준수해야 합니다.

---

## 1. 반응형 레이아웃 및 브레이크포인트 (md: 768px)

모바일 환경을 최우선으로 설계(Mobile-First)하며, 단일 브레이크포인트 **`md:` (768px)**를 기준으로 모바일과 데스크톱 레이아웃 분기를 수행합니다. 

- **브레이크포인트 검증**: `useBreakpoint()` 훅의 반환값을 사용하며, 절대로 `window.innerWidth`를 직접 체크하지 않습니다.
  - `isMobile`: `window.innerWidth < 768px` (모바일/데스크톱 레이아웃 스위칭 기준)
  
### 레이아웃 구성 요약
- **데스크톱 (>= 768px)**:
  - **좌측 접이식 사이드바 (Sidebar)**: `w-56`(기본) 또는 `w-16`(축소) 상태를 가집니다. 축소 상태는 `localStorage`(`myhome_sidebar_collapsed`)에 영구 저장됩니다. 사이드바는 전체 네비게이션과 설정/테마/로그아웃 팝업 레이어의 단일 소스입니다.
  - **콘텐츠 뷰포트**: 글로벌 상단 헤더가 배제되어 콘텐츠 공간이 극대화됩니다. (`px-6 py-5 max-w-screen-xl mx-auto w-full`)
- **모바일 (< 768px)**:
  - **상단 툴바 (TopBar)**: 로고와 테마 토글, 로그아웃 숏컷이 노출됩니다. (`h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b sticky top-0`)
  - **하단 탭바 (BottomNav)**: 최대 5개의 핀 고정 메뉴와 우측 끝에 "전체" 메뉴 버튼을 포함합니다.
  - **전체 메뉴 드로어 (AllMenuDrawer)**: "전체" 클릭 시 하단에서 슬라이드업되는 풀 바텀시트 메뉴입니다. 사용자는 별표(★)를 터치하여 대시보드 진입 시의 기본 시작 페이지를 `localStorage`에 지정할 수 있습니다.

---

## 2. 디자인 토큰 (Design Tokens)

모든 색상, 폰트, 테두리 반경 등은 하드코딩하지 않고 정의된 CSS 변수(Semantic Tokens) 또는 이에 매핑된 Tailwind Helper 클래스를 사용합니다.

### 주요 색상 토큰
| CSS 변수명 | Tailwind 클래스 | 용도 |
|---|---|---|
| `--color-semantic-background-normal-normal` | `.bg-normal` | 기본 배경 (라이트: 흰색 / 다크: `#0f172a` slate-900) |
| `--color-semantic-background-normal-alternative` | `.bg-alternative` | 레이아웃/대체 배경 (라이트: 연회색 / 다크: `#020617` slate-950) |
| `--color-semantic-background-elevated-normal` | `.bg-elevated` | 카드, 팝오버, 드롭다운 배경 (라이트: 흰색 / 다크: `#1e293b` slate-800) |
| `--color-semantic-label-strong` | `.text-strong` | 주요 헤더 및 강한 강조 텍스트 (라이트: `#1f2933` / 다크: `#f8fafc`) |
| `--color-semantic-label-neutral` | `.text-neutral` | 본문 및 일반 설명 텍스트 (라이트: `#64748b` / 다크: `#cbd5e1`) |
| `--color-semantic-label-assistive` | `.text-assistive` | 부연 설명, 배지, 비활성 텍스트 (라이트: `#94a3b8` / 다크: `#64748b`) |
| `--color-semantic-primary-normal` | `.text-primary` / `.bg-primary` | 브랜드 테마 컬러 (동적 Accent Color 바인딩) |
| `--color-semantic-status-positive` | `.text-signal` | 성공, 상승, 긍정 상태 |
| `--color-semantic-status-negative` | `.text-warn` | 오류, 하락, 심각한 실패 상태 |
| `--color-semantic-status-warning` | `.text-warning` / `.bg-warning` | 보조 경고, 대기, 건너뜀(Skipped) 상태 |
| `--color-semantic-line-normal-normal` | `.border-normal` | 경계선 및 디바이더 컬러 (라이트: `#d7dee8` / 다크: `#334155` slate-700) |

### 동적 환경설정 데이터셋
- **테마 주조색 (`html[data-accent="blue|violet|green"]`)**: WDS Blue, Violet, Green을 지원하며 로컬스토리지에 의해 실시간 갱신됩니다.
- **서체종류 (`html[data-font-family="noto-sans-kr|noto-serif-kr"]`)**: Noto Sans KR(Pretendard)과 Noto Serif KR 서체 전환을 지원합니다.
- **글자 크기 (`--app-font-size`)**: 기본 `16px`에서 `12px~22px`로 실시간 슬라이딩 크기 조절이 가능합니다.

---

## 3. 타이포그래피 및 폰트 크기 표준

글자 크기 일괄 제어 유틸리티(`.font-app-ui`)와 시맨틱 타이포 클래스를 활용하여 가독성과 텍스트 위계를 보장합니다.

| 용도 | CSS 클래스 (Tailwind) | 용도 및 의미 |
|---|---|---|
| Page title | `.text-app-title font-bold` | 페이지의 최상위 대제목 |
| Subtitle | `.text-app-body-sm text-slate-500` | 페이지의 부제 및 조작 설명글 |
| Card title | `.text-app-body font-semibold` | 개별 카드 컴포넌트의 내부 제목 |
| Body text | `.text-app-body` | 일반 본문 텍스트 |
| Labels / Table headers | `.text-app-label` | 입력 폼 레이블, 테이블의 컬럼 헤더 |
| Metadata / Badges | `.text-app-caption` | 소형 태그, 서브 정보 및 메타데이터 |
| Metric Value | `.text-app-metric font-mono` | 차트 KPI 및 대형 통계 금액 수치 |

- **숫자 천 단위 콤마 표기**: 모든 수치 데이터는 가독성을 위해 반드시 천 단위 콤마(`.toLocaleString("ko-KR")` 등)를 적용합니다.
- **금액 소수점 표기**: 억 단위 금액(Price/Eok)을 표기할 때는 만원 단위(0.01억 = 100만원)를 반영하기 위해 소수점 2자리(`.toFixed(2)`) 표기를 표준으로 삼습니다.

---

## 4. 간격 및 패딩 표준 (Spacing & Padding)

- **페이지 콘텐츠 간격**: 루트 컨테이너 내부의 직계 요소들은 일관되게 `space-y-6` 여백을 적용합니다.
- **카드 패딩**:
  - 표준 카드 (`SectionCard` 등): 내부 여백 `p-5`
  - 요약 카드 (`StatCard` 및 소형 칩 카드): 내부 여백 `p-4`
- **그리드 간격 (Gap)**:
  - KPI 카드 및 미니 통계 그리드: `gap-4`
  - 레이아웃 분할 및 메인 섹션 그리드: `gap-6`

---

## 5. 공통 컴포넌트 디자인 및 헤더 규격

### 페이지 헤더 (`PageHeader`)
모든 페이지 수준의 대제목 렌더링 시 아드혹 H1/H2 태그를 사용하거나 카드형 내부에 타이틀을 밀어 넣는 행위는 금지되며, 반드시 **`PageHeader` 공통 컴포넌트**를 사용해야 합니다.

`PageHeader`는 페이지 메인 정체성을 상징하는 Lucide 아이콘, 대제목, 설명글 및 우측의 필터/액션 슬롯을 반응형으로 일관되게 정렬합니다.

```tsx
import { PageHeader } from "../components/PageHeader";
import { BarChart3 } from "lucide-react";

<PageHeader
  title="실거래 분석"
  subtitle="로컬 SQLite 실거래 적재 데이터를 다차원 시계열 차트로 분석합니다."
  icon={BarChart3}
  actions={<MyFilterComponent />}
/>
```

- **반응형 폰트 리사이징**: 헤더의 글자 크기는 모바일 환경에서 자동으로 `.text-app-title` 스케일로 축소 조정되어 불필요한 줄바꿈과 뷰포트 낭비를 유발하지 않습니다.

### SectionCard (표준 카드)
스타일 `rounded-xl border border-normal bg-elevated shadow-sm`을 지니며, 헤더 하단에는 디바이더 `border-b border-normal px-5 py-4`를 부여합니다.

### StatCard (통계 요약 카드)
스타일 `rounded-xl border border-normal bg-elevated p-4 shadow-sm`을 따르며 상태 톤에 맞춰 아이콘 컬러를 분기합니다.
- `positive`: `.text-signal` (성공/정상)
- `warn`: `.text-warn` (오류/점검/경고)

### 입력창 및 셀렉트 박스 (Inputs & Selects)
- 기본 스타일: `w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong outline-none transition-all`
- 포커스 상태: `focus:border-primary focus:ring-1 focus:ring-primary`
- 비활성 상태: `disabled:opacity-50 disabled:cursor-not-allowed`

### 버튼 (Buttons)
- **주요 실행 버튼 (Solid Primary)**:
  - `rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition-all shadow-sm shadow-blue-500/20 hover:opacity-90 disabled:opacity-50`
- **보조 버튼 (Outlined / Alternative)**:
  - `rounded-lg border border-normal bg-normal px-4 py-2 text-sm font-bold text-strong hover:bg-alternative transition-colors`

### 로딩 인디케이터 (Spinner)
- 섹션 및 페이지 전체 로딩 시 중앙에 정렬된 표준 회전 스피너를 보여줍니다.
- 스타일: `animate-spin rounded-full h-8 w-8 border-b-2 border-primary`

---

## 6. 반응형 2-mode 탭 스트립 디자인

다중 탭 구조를 가지는 페이지(`GraphDashboard`, `Settings` 등)는 가독성과 공간 사용 효율화를 위해 768px 분기에 따라 완전히 상이한 2가지 스타일 모드로 렌더링해야 합니다.

- **데스크톱 (>= 768px - Underline 탭)**:
  - 밑줄 형태의 탭 링크 구조를 갖습니다 (`border-b-2 -mb-px`). 
  - 활성 상태: `border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold`
- **모바일 (< 768px - Scrollable Pill 탭)**:
  - 가로 슬라이드가 가능하고 둥근 캡슐 형태의 알약 버튼 탭 스트립을 구성합니다.
  - 컨테이너에 `overflow-x-auto scrollbar-none snap-x snap-mandatory flex flex-nowrap`을 선언하여 가로 스크롤을 활성화하고 스크롤바를 숨겨야 합니다.
  - 활성 상태: `bg-primary-600 text-white dark:bg-primary-500 rounded-full`

---

## 7. 모바일 레이아웃 준수 사항 및 금지 패턴

- **고정 폭 SVG 사용 금지**: 모든 SVG 차트/시각물은 `ResponsiveContainer` 혹은 `viewBox`와 `width="100%"`를 선언해 모바일 가로폭을 초과하지 않도록 해야 합니다.
- **텍스트 두 줄 개행 및 줄바꿈 방지**: 클릭 탭이나 액션 단추 내부 텍스트에는 `whitespace-nowrap`을 적용하고 모바일 가로 공간 부족 시 부모에 스크롤을 적용해 접히지 않도록 합니다.
- **Flex 레이아웃 내부 텍스트 절삭 (Truncate)**: 긴 아파트 단지명이나 수치가 공간 부족으로 잘려 나가지 않도록, 유연한 엘리먼트에는 `min-w-0`과 `truncate` 속성을 함께 부여해야 합니다.
  ```tsx
  <div style={{ display: 'flex', minWidth: 0 }}>
    <span style={{ flex: 1, overflow: 'hidden', textEllipsis: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>아파트명</span>
    <span style={{ minWidth: 72, flexShrink: 0 }}>15.5억</span>
  </div>
  ```
- **수치 데이터 자릿수 열정렬 (Tabular Nums)**: 날짜, 가격, 평형, 건수 등 숫자로만 이루어지거나 열 방향으로 나열되는 데이터는 정렬 가독성을 높이기 위해 반드시 `font-variant-numeric: tabular-nums` 또는 Tailwind `tabular-nums` 클래스를 지정하고, 텍스트가 아닌 수치는 기본적으로 우측 정렬(`text-right`)해야 합니다.
- **절대 위치 드롭다운 뷰포트 초과 방지**: 버튼의 화면 내 정렬 방향에 따라 드롭다운의 시작 위치를 좌우로 맞추고 가로폭 한계를 지정합니다.
  - 버튼 좌측 정렬: `left: 0`
  - 버튼 우측 정렬: `right: 0`
  - 드롭다운 폭: `width: 'min(240px, calc(100vw - 24px))'`

---

## 8. 다국어 (i18n) 대응 의무화

사용자에게 노출되는 모든 고정 문자열(헤더 타이틀, 설명, 버튼 텍스트, 에러 메시지, 플레이스홀더 등)은 하드코딩해서는 안 되며, `packages/dashboard/src/locales/ko.ts` 파일에 등록된 다국어 사전을 참조하여 `t.key` 형태로 렌더링해야 합니다.

---

## 9. Recharts 차트 설계 및 Box Plot 동적 Y축 스케일링 정책

차트는 시각적 정밀도가 요구되므로 아래 스타일을 반드시 준수합니다.

### 차트 스타일 기본 표준
- **디자인 토큰 연동 의무화**: 차트 선(`stroke`), 바/면(`fill`), 범례 불릿 배경 등에 테일윈드 아드혹 컬러나 HEX 색상 값을 직접 하드코딩해서는 안 되며, CSS 변수 토큰(`var(--color-chart-*)`)을 직접 바인딩해야 합니다.
- **반응형 컨테이너**: `ResponsiveContainer`로 래핑하여 `width="100%"`와 고정 `height` 지정.
- **그리드**: `CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />` (다크모드에서도 자연스러운 어두운 선)
- **축 (XAxis, YAxis)**:
  - 폰트 스타일: `stroke="#64748b" fontSize={11} tickLine={false}`
  - YAxis width: 숫자가 잘리지 않도록 `width={52}` 고정 부여. (수치 축이 아닌 텍스트 라벨 축인 경우에는 데이터 길이에 맞게 적정 width를 수동 조정함)
- **툴팁**: 커스텀 툴팁 리액트 컴포넌트를 사용하며, 배경은 elevated normal, 테두리는 normal 디바이더 컬러를 적용하여 통합 UI 톤앤매너를 유지합니다. 툴팁 내 수치 레이블의 색상도 해당 차트 선의 시맨틱 토큰 컬러와 완전히 통일시킵니다.
- **범례 (Legend)**: Recharts의 기본 범례를 사용하지 않고, 카드 상단 또는 하단에 별도 HTML 기반 커스텀 범례 요소를 정렬하여 일률적으로 통제합니다.

### Box Plot 동적 Y축 스케일링 정책
분석 대시보드 내의 Box Plot 차트 구현 시, 사용자가 UI 범례 토글을 통해 차트의 Whisker(최소/최대) 혹은 Box(Q1/Q3) 레이어를 숨겼을 때 Y축의 가격 스케일이 이에 맞춰 동적으로 재조정(Zoom-in)되어야 합니다.

1. **단일 `<Bar>` 기반 Box Plot**:
   - Recharts의 `<Bar>` 컴포넌트 `shape` 프롭에 커스텀 SVG 드로잉 컴포넌트(`BoxPlotShape`)를 함수 래퍼 형태로 전달하여 단일 막대 영역 내에서 Whisker, Box, Median, Mean을 일괄 렌더링합니다.
   
2. **동적 Y축 도메인 보장 (투명 가이드 Line)**:
   - Box Plot은 단순히 `dataKey="mean"` (혹은 `avg`) 하나만 등록할 경우, Recharts의 Y축 자동 도메인 연산 엔진이 Box와 Whisker의 경계값(`q1`, `q3`, `min`, `max`)을 감지하지 못해 차트가 잘려 나갑니다.
   - 따라서, Y축 가격 도메인 바인딩을 위해 화면에 그려지지 않는 투명 가이드 `<Line>` 컴포넌트를 조건부로 추가 배치하여 Y축의 스케일 조정을 위임합니다.

3. **토글 연계 조건부 렌더링 규격**:
   - 사용자가 범례 필터에서 레이어를 토글할 때마다 투명 가이드 Line의 데이터를 다음과 같이 스위칭하여 Y축이 최적의 높이로 조절(밀착)되도록 유도합니다.
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
