# myhome 프론트엔드 화면 구성 가이드라인

본 문서는 `myhome` 서비스의 프론트엔드 화면 구성, 레이아웃 규격, 반응형 규칙 및 페이지 구조 표준을 정의합니다. 모든 대시보드 페이지 개발 및 수정 시 반드시 본 표준을 준수해야 합니다.

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

## 2. 공통 페이지 구조 및 헤더 규격 (`PageHeader`)

모든 페이지 수준의 대제목 렌더링 시 아드혹 H1/H2 태그를 사용하거나 카드형 내부에 타이틀을 밀어 넣는 행위는 금지되며, 반드시 **`PageHeader` 공통 컴포넌트**를 사용해야 합니다.

### PageHeader 표준 인터페이스
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

---

## 3. 반응형 2-mode 탭 스트립 디자인

다중 탭 구조를 가지는 페이지(`GraphDashboard`, `Settings` 등)는 가독성과 공간 사용 효율화를 위해 768px 분기에 따라 완전히 상이한 2가지 스타일 모드로 렌더링해야 합니다.

- **데스크톱 (>= 768px - Underline 탭)**:
  - 밑줄 형태의 탭 링크 구조를 갖습니다 (`border-b-2 -mb-px`). 
  - 활성 상태: `border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400 font-semibold`
- **모바일 (< 768px - Scrollable Pill 탭)**:
  - 가로 슬라이드가 가능하고 둥근 캡슐 형태의 알약 버튼 탭 스트립을 구성합니다.
  - 컨테이너에 `overflow-x-auto scrollbar-none snap-x snap-mandatory flex flex-nowrap`을 선언하여 가로 스크롤을 활성화하고 스크롤바를 숨겨야 합니다.
  - 활성 상태: `bg-primary-600 text-white dark:bg-primary-500 rounded-full`

---

## 4. 모바일 레이아웃 준수 사항 및 금지 패턴

- **고정 폭 SVG 사용 금지**: 모든 SVG 차트/시각물은 `ResponsiveContainer` 혹은 `viewBox`와 `width="100%"`를 선언해 모바일 가로폭을 초과하지 않도록 해야 합니다.
- **텍스트 두 줄 개행 및 줄바꿈 방지**: 클릭 탭이나 액션 단추 내부 텍스트에는 `whitespace-nowrap`을 적용하고 모바일 가로 공간 부족 시 부모에 스크롤을 적용해 접히지 않도록 합니다.
- **Flex 레이아웃 엘리먼트 절삭**: 아파트 이름 등이 길어져 그리드가 깨질 때, 유연한 엘리먼트에 `min-w-0`과 `truncate`를 선언해 말줄임표 처리합니다.
- **수치 데이터 자릿수 정렬**: 날짜, 평수, 가격 등 숫자는 `tabular-nums` 클래스를 지정하고 우측 정렬(`text-right`)을 원칙으로 삼습니다.

### 절대 위치 드롭다운 뷰포트 초과 방지
버튼의 화면 내 정렬 방향에 따라 드롭다운의 시작 위치를 좌우로 맞추고 가로폭 한계를 지정합니다.
- 버튼 좌측 정렬: `left: 0`
- 버튼 우측 정렬: `right: 0`
- 드롭다운 폭: `width: 'min(240px, calc(100vw - 24px))'`

### Flex 레이아웃 내부 텍스트 절삭(Truncate)
긴 아파트 단지명이나 수치가 공간 부족으로 잘려 나가지 않도록, 유연한 엘리먼트에는 `min-w-0`과 `truncate` 속성을 함께 부여해야 합니다.
```tsx
<div style={{ display: 'flex', minWidth: 0 }}>
  <span style={{ flex: 1, overflow: 'hidden', textEllipsis: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>아파트명</span>
  <span style={{ minWidth: 72, flexShrink: 0 }}>15.5억</span>
</div>
```

### 수치 데이터 자릿수 열정렬 (Tabular Nums)
- 날짜, 가격, 평형, 건수 등 숫자로만 이루어지거나 열 방향으로 나열되는 데이터는 정렬 가독성을 높이기 위해 반드시 `font-variant-numeric: tabular-nums` 또는 Tailwind `tabular-nums` 클래스를 지정하고, 텍스트가 아닌 수치는 기본적으로 우측 정렬(`text-right`)해야 합니다.

### 버튼 및 탭의 두 줄 개행 방지 (Clickable Text Wrap)
- 모바일 가로폭 축소 시 텍스트 탭바나 버튼 안의 글자가 두 줄로 접히면서 UI 깨짐이 유발되지 않도록 클릭 가능한 요소에는 `whitespace-nowrap`을 적용하고, 필요한 경우 모바일용 탭바 부모 컨테이너에 `overflow-x-auto` 가로 스크롤을 구현하여 뷰포트를 이탈하지 않도록 조치합니다.

---

## 4. 다국어 (i18n) 대응 의무화

사용자에게 노출되는 모든 고정 문자열(헤더 타이틀, 설명, 버튼 텍스트, 에러 메시지, 플레이스홀더 등)은 하드코딩해서는 안 되며, `packages/dashboard/src/locales/ko.ts` 파일에 등록된 다국어 사전을 참조하여 `t.key` 형태로 렌더링해야 합니다.
