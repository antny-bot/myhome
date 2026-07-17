# myhome 프론트엔드 화면 구성 가이드라인

본 문서는 `myhome` 서비스의 프론트엔드 화면 구성, 레이아웃 규격, 반응형 규칙 및 페이지 구조 표준을 정의합니다. 모든 대시보드 페이지 개발 및 수정 시 반드시 본 표준을 준수해야 합니다.

---

## 1. 모바일 퍼스트 레이아웃 및 브레이크포인트

모든 페이지는 모바일 환경(390px)을 기본으로 설계하며, 화면 크기에 따라 데스크톱 레이아웃으로 유연하게 확장되도록 구현합니다.

- **브레이크포인트**: `useBreakpoint()` 훅의 반환값을 사용하며, 절대로 `window.innerWidth`를 직접 체크하지 않습니다.
  - `isMobile`: `window.innerWidth < 768px` (모바일/태블릿 UX 패턴 전환 기준)
  - `isNarrow`: `window.innerWidth < 480px` (단일 컬럼 레이아웃 강제 기준)

### 레이아웃 구성 요약
- **데스크톱 (>= 768px)**:
  - 좌측 고정 사이드바 (`w-64 border-r border-normal bg-elevated`)
  - 글로벌 상단 헤더 없음 (콘텐츠 뷰포트 극대화를 위해 제거됨)
  - 메인 콘텐츠 영역 (`p-8 max-w-6xl mx-auto w-full overflow-auto`)
- **모바일 (< 768px)**:
  - 상단 툴바 (`h-14 px-4 bg-elevated border-b`, 햄버거 메뉴 포함)
  - 하단 탭바 네비게이션 (`h-14 bg-elevated border-t fixed bottom-0 left-0 right-0 z-40`)
  - 메인 콘텐츠 영역 (`p-4 pb-24 overflow-auto`)

---

## 2. 공통 페이지 구조 및 헤더 규격

모든 대시보드 페이지의 루트 요소는 `space-y-6 flex flex-col min-h-0` 클래스를 지닌 컨테이너 구조로 통일하여 정돈된 상하단 여백을 제공합니다.

### 표준 헤더 마크업
모든 페이지는 데스크톱 뷰포트에서 최상단에 대표 Lucide 아이콘이 포함된 H2 타이틀과 설명글로 이루어진 플랫 헤더 구조를 가져야 합니다. (카드형 헤더 래핑 금지, Breadcrumb 경로 표시는 완전히 배제함)
또한, **모바일 뷰포트(`isMobile`이 true)**에서는 세로 공간을 극대화하고 반복 노출되는 불필요한 스크롤을 방지하기 위해 **설명글은 생략하되, 메인 정체성이 드러나는 대제목은 콤팩트 크기(`text-xl`)로 축소하여 노출합니다 (`<h2 className="text-xl md:text-2xl ...">...</h2>`)**.

```tsx
import { LucideIcon } from "lucide-react";

<header className="flex flex-col gap-1">
  {/* 1. 대제목 (H2) - 필수 Lucide 아이콘 동반 */}
  <h2 className="text-2xl font-black text-strong tracking-tight mt-1 flex items-center gap-2">
    <Icon className="text-primary h-6 w-6" />
    {t.pageTitle}
  </h2>
  
  {/* 2. 설명글 */}
  <p className="text-sm text-neutral">{t.pageSubtitle}</p>
</header>
```

---

## 3. 모바일 레이아웃 준수 사항 및 금지 패턴

### 고정 폭 SVG 사용 금지
모바일 가로폭을 초과하여 화면 깨짐이 발생하지 않도록, 모든 SVG 또는 시각 요소는 반응형 컨테이너 내에서 `viewBox`와 `width="100%"`를 사용해야 합니다.
```tsx
// ❌ 금지
<svg width={560} height={160}>

// ✅ 올바른 방법
<svg width="100%" viewBox="0 0 560 160" style={{ display: 'block' }}>
```

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
