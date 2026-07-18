# myhome 프론트엔드 스타일 및 디자인 가이드라인

본 문서는 `myhome` 서비스의 디자인 토큰, 타이포그래피, 간격 규칙 및 공통 UI 컴포넌트의 시각 디자인 표준을 정의합니다.

---

## 1. 디자인 토큰 (Design Tokens)

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
- **서체종류 (`html[data-font-family="noto-sans-kr|noto-serif-kr"]`)**: Noto Sans KR(혹은 Pretendard)과 Noto Serif KR 서체 전환을 지원합니다.
- **글자 크기 (`--app-font-size`)**: 기본 `16px`에서 `12px~22px`로 실시간 슬라이딩 크기 조절이 가능합니다.

---

## 2. 타이포그래피 및 폰트 크기 표준

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

## 3. 간격 및 패딩 표준 (Spacing & Padding)

- **페이지 콘텐츠 간격**: 루트 컨테이너 내부의 직계 요소들은 일관되게 `space-y-6` 여백을 적용합니다.
- **카드 패딩**:
  - 표준 카드 (`SectionCard` 등): 내부 여백 `p-5`
  - 요약 카드 (`StatCard` 및 소형 칩 카드): 내부 여백 `p-4`
- **그리드 간격 (Gap)**:
  - KPI 카드 및 미니 통계 그리드: `gap-4`
  - 레이아웃 분할 및 메인 섹션 그리드: `gap-6`

---

## 4. 공통 컴포넌트 디자인 가이드

- **`SectionCard` (표준 카드)**: 스타일 `rounded-xl border border-normal bg-elevated shadow-sm`을 지니며, 헤더 하단에는 디바이더 `border-b border-normal px-5 py-4`를 부여합니다.
- **`StatCard` (통계 요약 카드)**: 스타일 `rounded-xl border border-normal bg-elevated p-4 shadow-sm`을 따르며 상태 톤에 맞춰 아이콘 컬러를 분기합니다.
- **입력창 및 버튼**: 기본 세로 높이 `h-10`을 기준으로 둥근 모서리 `rounded-lg`와 `focus:ring-primary`를 통해 통일된 포커스 링을 유지합니다.

---

## 5. Recharts 차트 스타일 표준

- **디자인 토큰 연동 의무화**: 차트 선(`stroke`), 바/면(`fill`), 범례 불릿 배경 등에 HEX 색상 값을 하드코딩해서는 안 되며, CSS 변수 토큰(`var(--color-chart-*)`)을 직접 바인딩해야 합니다.
- **디바이스 대응**: `ResponsiveContainer`로 래핑하여 `width="100%"`와 고정 `height`를 지정합니다.
- **축 및 그리드**: 폰트 스타일 `stroke="#64748b" fontSize={11} tickLine={false}`를 부여하고 Y축에는 수치 잘림 방지를 위해 `width={52}` 고정을 적용합니다.
xt-signal` (성공/정상)
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

## 5. Recharts 차트 스타일 표준

차트는 시각적 정밀도가 요구되므로 아래 스타일을 반드시 준수합니다.

- **디자인 토큰 연동 의무화**: 차트 선(`stroke`), 바/면(`fill`), 범례 불릿 배경 등에 테일윈드 아드혹 컬러나 HEX 색상 값을 직접 하드코딩해서는 안 되며, CSS 변수 토큰(`var(--color-chart-*)`)을 직접 바인딩해야 합니다.
- **반응형 컨테이너**: `ResponsiveContainer`로 래핑하여 `width="100%"`와 고정 `height` 지정.
- **그리드**: `CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />` (다크모드에서도 자연스러운 어두운 선)
- **축 (XAxis, YAxis)**:
  - 폰트 스타일: `stroke="#64748b" fontSize={11} tickLine={false}`
  - YAxis width: 숫자가 잘리지 않도록 `width={52}` 고정 부여. (수치 축이 아닌 텍스트 라벨 축인 경우에는 데이터 길이에 맞게 적정 width를 수동 조정함)
- **툴팁**: 커스텀 툴팁 리액트 컴포넌트를 사용하며, 배경은 elevated normal, 테두리는 normal 디바이더 컬러를 적용하여 통합 UI 톤앤매너를 유지합니다. 툴팁 내 수치 레이블의 색상도 해당 차트 선의 시맨틱 토큰 컬러와 완전히 통일시킵니다.
- **범례 (Legend)**: Recharts의 기본 범례를 사용하지 않고, 카드 상단 또는 하단에 별도 HTML 기반 커스텀 범례 요소를 정렬하여 일률적으로 통제합니다.

