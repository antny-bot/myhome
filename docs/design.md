# myhome 프론트엔드 스타일 및 디자인 가이드라인

본 문서는 `myhome` 서비스의 디자인 토큰, 타이포그래피, 간격 규칙 및 공통 UI 컴포넌트의 시각 디자인 표준을 정의합니다.

---

## 1. 디자인 토큰 (Design Tokens)

모든 색상, 폰트, 테두리 반경 등은 하드코딩하지 않고 정의된 CSS 변수(Semantic Tokens) 또는 이에 매핑된 Tailwind Helper 클래스를 사용합니다.

### 주요 색상 토큰
| CSS 변수명 | Tailwind 클래스 | 용도 |
|---|---|---|
| `--color-semantic-background-normal-normal` | `.bg-normal` | 기본 배경 (흰색/다크그레이) |
| `--color-semantic-background-normal-alternative` | `.bg-alternative` | 대체 배경 (연회색/매우 어두운 배경) |
| `--color-semantic-background-elevated-normal` | `.bg-elevated` | 카드, 팝오버, 드롭다운 등 elevated 요소 배경 |
| `--color-semantic-label-strong` | `.text-strong` | 주요 헤더 및 강한 강조 텍스트 |
| `--color-semantic-label-neutral` | `.text-neutral` | 본문 및 일반 설명 텍스트 |
| `--color-semantic-label-assistive` | `.text-assistive` | 부연 설명, 배지, 비활성 텍스트 |
| `--color-semantic-primary-normal` | `.text-primary` / `.bg-primary` | 브랜드 테마 컬러 (#0066FF / 다크모드 시 라이트블루) |
| `--color-semantic-status-positive` | `.text-signal` | 성공, 상승, 긍정 상태 |
| `--color-semantic-status-negative` | `.text-warn` | 오류, 하락, 심각한 실패 상태 |
| `--color-semantic-status-warning` | `.text-warning` / `.bg-warning` | 보조 경고, 대기, 건너뜀(Skipped) 상태 |
| `--color-semantic-line-normal-normal` | `.border-normal` | 경계선 및 디바이더 컬러 |

### 시각화 및 차트 전용 토큰
| CSS 변수명 | 용도 (시계열 분석 매핑) |
|---|---|
| `--color-chart-primary` | 차트 메인 주선 / 평균 가격선 / 거래량 바 배경 |
| `--color-chart-max` | 최고가선 (상한선) |
| `--color-chart-min` | 최저가선 (하한선) |
| `--color-chart-median` | 중위값 가격선 |
| `--color-chart-accent` | 보조 통계 차트 / 거래 횟수 강조 바 |
| `--color-chart-floor` | 층별 분포 선 / 보조 지표선 |

### 타이포그래피 토큰
- `--font-display`: Wanted Sans Variable (숫자 강조, 카드 제목)
- `--font-body`: Pretendard JP Variable (본문 텍스트)
- `--font-mono`: SF Mono (금액 및 코드성 수치 전용)

---

## 2. 타이포그래피 및 폰트 크기 표준

가독성 확보와 일관된 계층을 위해 폰트 스타일을 다음과 같이 통일합니다.

- **페이지 대제목 (H2)**: `text-2xl font-black text-strong tracking-tight` (헤더 영역)
- **섹션/카드 제목 (H3)**: `text-lg font-bold text-strong` (카드 내부 제목)
- **리스트/서브텍스트 제목**: `text-sm font-bold text-strong` 또는 `text-xs font-bold`
- **본문 텍스트**: `text-sm text-strong`
- **일반 설명 및 서브텍스트**: `text-sm text-neutral` 또는 `text-xs text-neutral`
- **초소형 캡션 및 부연 정보**: `text-[10px] text-assistive`
- **수치, 가격 데이터**: `font-mono` 패밀리 사용 및 우측 정렬 권장
- **숫자 천 단위 콤마 표기**: 모든 수치 데이터(건수, 가격 등)는 가독성을 위해 반드시 천 단위 콤마(`.toLocaleString("ko-KR")` 또는 `lib/format.ts` 내의 `formatNumber` 유틸리티 함수)를 적용해야 합니다.
- **금액 소수점 표기**: 억 단위 금액(Price/Eok)을 표기할 때는 만원 단위(0.01억 = 100만원)까지 정확하게 전달하기 위해 소수점 2자리(`.toFixed(2)`) 표기를 표준으로 통일합니다. (단, 평수 환산이나 백분율(%) 등은 소수점 1자리 표기 유지)
- **내비게이션 그룹 타이틀**: `text-[10px] font-bold text-neutral/50 uppercase tracking-wider` (사이드바 메뉴 대분류 타이틀)




---

## 3. 간격 및 패딩 표준 (Spacing & Padding)

- **페이지 콘텐츠 간격**: 루트 컨테이너 내부의 직계 요소들은 일관되게 `space-y-6` 여백을 적용합니다.
- **카드 패딩**:
  - 표준 카드 (`SectionCard` 등): 내부 여백 `p-5`
  - 요약 카드 (`StatCard` 및 소형 칩 카드): 내부 여백 `p-4`
- **그리드 간격 (Gap)**:
  - KPI 카드 및 미니 통계 그리드: `gap-4`
  - 레이아웃 분할 및 메인 섹션 그리드: `gap-6`
- **컨트롤 패딩**:
  - 입력창 및 버튼: 세로 높이 `h-10` 또는 `h-[42px]` 기준, 가로 패딩 `px-4`, 세로 패딩 `py-2` 또는 `py-2.5`

---

## 4. 공통 컴포넌트 디자인 가이드

### SectionCard (표준 카드)
- 스타일: `rounded-xl border border-normal bg-elevated shadow-sm` (반지름 12px)
- 카드 헤더: 하단에 디바이더 `border-b border-normal px-5 py-4`가 적용되며, 타이틀은 `text-lg font-bold text-strong` 사용.

### StatCard (통계 요약 카드)
- 스타일: `rounded-xl border border-normal bg-elevated p-4 shadow-sm`
- 톤에 따른 아이콘 색상 분기:
  - `default`: `.text-neutral`
  - `good`: `.text-signal` (성공/정상)
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

