# myhome 디자인 가이드라인

UI 핵심 설계 원칙, 컴포넌트 패턴, 반응형 규칙 정의.
프론트엔드 작업 시 필독.

---

## 1. 모바일 퍼스트 원칙 (최우선)

**모바일 화면 기준 고정**

1. **가드레일**: 모든 페이지 최상위 컨테이너 `max-w-[480px] mx-auto` 기본 적용.
2. **예외 처리**: 데이터 테이블, 복잡한 차트 페이지 등 PC 모드 시 컨테이너 제한 해제(Override) 또는 PC 전용 View 분기.

---

## 2. 디자인 토큰

모든 색상, 타이포그래피, 간격 CSS 변수 사용.
하드코딩 색상값(`#fff`, `rgba(...)` 등) 토큰 없는 경우만 허용.

### 주요 색상 변수 (CSS Variables)
```
--color-semantic-background-normal-normal      배경 (흰색/다크)
--color-semantic-background-normal-alternative 대체 배경 (연회색)
--color-semantic-background-elevated-normal    카드 배경
--color-semantic-label-strong                  주요 텍스트
--color-semantic-label-neutral                 보조 텍스트
--color-semantic-label-assistive               약한 텍스트
--color-semantic-primary-normal                브랜드 블루 (#0066FF)
--color-semantic-status-positive               성공 초록
--color-semantic-status-negative               오류 빨강
--color-semantic-line-normal-normal            구분선
```

### 폰트
```
--font-display   Wanted Sans Variable (헤더, 큰 숫자)
--font-body      Pretendard JP Variable (본문)
--font-mono      SF Mono (금액, 코드)
```

---

## 3. 반응형 브레이크포인트

`useBreakpoint()` 훅(`src/useBreakpoint.ts`, 구현됨) 사용.

```typescript
const { isMobile } = useBreakpoint();
// isMobile: window.innerWidth < 768
```

**절대 `window.innerWidth` 직접 체크 금지.** 항상 `useBreakpoint()` 사용.

### 모바일 레이아웃 (< 768px)

```
┌────────────────────────┐
│  MobileTopBar (44px)   │  페이지명 + 유저 아바타
├────────────────────────┤
│                        │
│   Screen Content       │  overflow: auto
│                        │
├────────────────────────┤
│  MobileBottomTabs(56px)│  4 pinned 탭 + "전체(≡)" 탭
└────────────────────────┘
```

### 모바일 bottom nav 규칙 (필수 준수)

- **최대 5개 표시**: 앞 4개(pinned) + 마지막 "전체(≡)" 고정.
- **6번째 이상 탭**: "전체" sheet 내부 자동 숨김.
- **순서 변경**: "전체" sheet → drag handle 재정렬 → 상위 4개 탭바 표시.
- **순서 저장**: `localStorage("myhome.mobile-tab-order.{userId}")` — 자동 처리됨.
- **bottom nav 높이**: 56px 고정, 각 탭 `flex: 1` 적용.

### 중간 화면 (480px–767px) 규칙

**현황**: `isMobile` < 768px 포함하나, 전체 "단일 컬럼" 처리 시 700px 태블릿/가로 모드 공간 낭비됨.

**원칙**:
- **단일 컬럼 강제**: `isNarrow (< 480px)` 기준 결정.
- **모바일 UX 패턴 전환** (bottom sheet, 탭바 등): `isMobile (< 768px)` 기준 유지.
- **카드/리스트 그리드**: `auto-fill` / `auto-fit` + `minmax(min(Xpx, 100%), 1fr)` 패턴 활용, 뷰포트 자동 조절 (별도 분기 불필요).

**그리드 패턴 (권장)**:
```tsx
// ❌ 이렇게 하면 700px에서도 단일 컬럼
gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(180px, 1fr))'

// ✅ 480px 미만만 단일 컬럼, 그 이상은 자동 배치
gridTemplateColumns: isNarrow ? '1fr' : 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))'

// ✅ 또는 isMobile 분기가 필요한 경우: 2열 명시
gridTemplateColumns: isNarrow ? '1fr' : isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
```

**사용 기준 요약**:
| 판단 항목 | 기준 |
|---|---|
| 단일 컬럼 레이아웃 | `isNarrow (< 480px)` |
| 모바일 UX 전환 (bottom sheet, 탭바) | `isMobile (< 768px)` |
| UI 요소 숨김 (`{!isMobile && ...}`) | `isMobile (< 768px)` |
| 그리드 자동 조절 | `auto-fill` + `minmax(min(X, 100%), 1fr)` |

### 데스크톱 레이아웃 (≥ 768px)

```
┌──────────┬─────────────────────────┐
│ Sidebar  │   Screen Content        │
│ (224px)  │   (flex: 1)             │
└──────────┴─────────────────────────┘
```

---

## 4. 레이아웃 패턴

### Topbar (상단 헤더)
```typescript
<header style={{
  height: isMobile ? 48 : 64,
  padding: isMobile ? '0 12px' : '0 28px',
  display: 'flex', alignItems: 'center', gap: 8,
}}>
  {/* 모바일에서 제목 숨김 (MobileTopBar가 대신 표시) */}
  {!isMobile && <h1>페이지 제목</h1>}
</header>
```

### Main 콘텐츠 영역
```typescript
<main style={{
  flex: 1,
  padding: isMobile ? '12px 12px 24px' : '20px 24px 32px',
  overflow: 'auto',
  background: 'var(--color-semantic-background-normal-alternative)',
}}>
```

### 그리드 레이아웃
| 용도 | 데스크톱 | 중간 화면(480–767px) | 초좁음(< 480px) |
|------|---------|--------|--------|
| KPI 4열 | `repeat(4, 1fr)` | `repeat(2, 1fr)` | `repeat(2, 1fr)` |
| 2열 섹션 | `1.5fr 1fr` 또는 `1.25fr 1fr` | `repeat(2, 1fr)` | `1fr` |
| 요약 3열 | `repeat(3, 1fr)` | `repeat(2, 1fr)` | `1fr` |
| 카드 자동 | `minmax(240px, 1fr)` | `minmax(min(160px, 100%), 1fr)` | `minmax(min(160px, 100%), 1fr)` |

```typescript
// 반응형 그리드 예시
<div style={{
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr',
  gap: 16,
}}>
```

---

## 5. Bottom Sheet 패턴

모바일 Drawer/Detail Panel은 bottom sheet 전환.

```typescript
// 모바일 bottom sheet
if (isMobile) {
  return (
    <>
      {/* Dim overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998 }}
      />
      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '80dvh',
        background: 'var(--color-semantic-background-normal-normal)',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
        overflowY: 'auto',
        padding: '0 16px 32px',
        zIndex: 999,
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-semantic-line-normal-normal)' }} />
        </div>
        {/* 콘텐츠 */}
      </div>
    </>
  );
}

// 데스크톱 right panel / drawer
return (
  <div style={{ width: 380, flex: '0 0 auto', borderLeft: '1px solid ...', overflowY: 'auto', padding: '20px 20px 32px' }}>
    {/* 콘텐츠 */}
  </div>
);
```

---

## 6. 컴포넌트 규칙

### SectionCard
```typescript
<SectionCard title="제목" subtitle="부제" right={<추가_요소 />}>
  {children}
</SectionCard>
```

### 버튼 클래스
```
.wds-btn--sm            height: 32px
.wds-btn--md            height: 40px
.wds-btn--solid-primary 파란 배경
.wds-btn--outlined-primary 테두리
.wds-btn--ghost         배경 없음
.wds-btn--solid-assistive 보조 배경
```

### MaterialIcon
```typescript
<MaterialIcon name="icon_name" size={16} filled={isActive} color="var(--color-semantic-label-neutral)" />
```

### 로딩 전환
- lazy 화면, 시트, 설정 패널 `fallback={null}` 금지. 즉시 표시 스피너 기반 fallback 사용.
- 전체 화면 전환 중앙 정렬 원형 스피너 + 짧은 메시지 조합 사용.
- 섹션 내부 로딩 동일 시각 언어 유지, 크기만 축소.
- 로딩 문구 i18n 필수 경유.

---

## 7. 모바일 전용 규칙

- **높이**: `100vh` 대신 `100dvh` 사용 (모바일 주소창 고려).
- **탭 숨김**: 데스크톱 전용 UI(`거래 입력` 버튼, 테이블 뷰 토글 등) 모바일서 `{!isMobile && ...}` 숨김.
- **검색바**: 모바일서 `maxWidth` 제거, `flex: 1` 전체 폭 사용.
- **컴팩트 레이아웃**: 가로폭 내 가독성 확보 시 1열 쪼개어 공간 낭비 금지, 한 줄 2열 컴팩트 배치.

---

## 8. 수정 시 체크리스트

프론트엔드 컴포넌트 추가/수정 시:

- [ ] 새 색상/간격: 디자인 토큰 사용 (`--color-*`, `--space-*`)
- [ ] 새 레이아웃: `isMobile` 조건 포함
- [ ] 새 Drawer/Panel: bottom sheet 패턴 적용
- [ ] 새 그리드: 모바일 컬럼 수 지정
- [ ] Topbar: `isMobile` 따라 높이·padding 조정
- [ ] 모바일 전용 숨김: 필요한 버튼/UI `{!isMobile && ...}` 처리
- [ ] lazy 화면/패널: `fallback={null}` 대신 스피너 기반 로딩 상태 적용
- [ ] 초기 데이터 조회: 빈 영역 대신 스피너 또는 skeleton 중 하나 명시
- [ ] 타입 체크: `npm run typecheck`
- [ ] 360px 뷰포트 내 가로 스크롤 없음 확인
- [ ] 절대 위치 드롭다운: 버튼 정렬 방향 따라 `left: 0` / `right: 0` 확인
- [ ] 커스텀 SVG: `width="100%"` + `viewBox` 패턴 사용

---

## 9. 모바일 레이아웃 금지 패턴

### 고정 폭 SVG
```tsx
// ❌ 금지
<svg width={560} height={160}>

// ✅ 올바른 방법
<svg width="100%" viewBox="0 0 560 160" style={{ display: 'block' }}>
```

### auto-fit/fill 그리드 최소값
```tsx
// ❌ 잠재적 문제 — 모바일 내부 너비(~296px)에서 overflow 가능
gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'

// ✅ CSS min() 패턴으로 뷰포트 초과 방지
gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))'

// ✅ 또는 isMobile 분기
gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))'
```

### 절대 위치 드롭다운
```tsx
// ❌ 금지 — 버튼이 좌측 정렬일 때 드롭다운이 화면 왼쪽 밖으로 나감
position: 'absolute', right: 0, width: 240

// ✅ 버튼이 좌측 정렬인 경우: left: 0 사용
position: 'absolute', left: 0, width: 'min(240px, calc(100vw - 24px))'

// ✅ 버튼이 우측 정렬인 경우: right: 0 + 폭 제한
position: 'absolute', right: 0, width: 'min(240px, calc(100vw - 24px))'
```

### Flex row + 고정 우측 폭 + 텍스트 미절삭
```tsx
// ❌ 금지 — minWidth: 72 고정으로 왼쪽 텍스트 공간 부족
<div style={{ display: 'flex' }}>
  <span style={{ flex: 1 }}>긴 카테고리 이름 텍스트</span>
  <span style={{ minWidth: 72 }}>{fmtAmount(value)}</span>
</div>

// ✅ 올바른 방법
<div style={{ display: 'flex', minWidth: 0 }}>
  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>카테고리</span>
  <span style={{ minWidth: 72, flexShrink: 0 }}>{fmtAmount(value)}</span>
</div>
```

---

## 10. 차트 모바일 규칙 (Recharts)

| 항목 | 규칙 |
|------|------|
| `ResponsiveContainer` | 모든 차트 필수. `width="100%"` + 고정 `height` 지정 |
| `Legend` | Recharts 기본 Legend 사용 금지. 커스텀 범례(toggle 버튼 행) 카드 상/하단 별도 배치 |
| `XAxis tick` | `fontSize: 11`, `interval="preserveStartEnd"` 기본값 적용 |
| `YAxis width` | `width={52}` 이하 고정 (자동 폭 시 모바일 가변 발생) |
| 스택 바 범례 | `overflowX: 'auto', scrollbarWidth: 'none', flexWrap: 'nowrap'` 행 처리 |

커스텀 SVG 차트 반드시 `viewBox` + `width="100%"` 패턴 사용.

---

## 11. 드롭다운 / 팝오버 위치 규칙

- `position: 'absolute'` 드롭다운 항상 뷰포트 내 위치 설계
- 버튼 **좌측** 정렬 → `left: 0`
- 버튼 **우측** 정렬 (topbar right, card header right) → `right: 0`
- 드롭다운 폭: `min(240px, calc(100vw - 24px))` 패턴 뷰포트 초과 방지
- 드롭다운 최대 높이: `maxHeight: 'min(300px, 50dvh)'`, `overflowY: 'auto'`
- **select 및 option 기본 스타일 차단**: `background: var(--color-semantic-background-elevated-normal)`, `color: var(--color-semantic-label-strong)` 명시 필수 기입.

```tsx
// 좌측 정렬 버튼의 드롭다운 예시
<div style={{
  position: 'absolute', top: 'calc(100% + 8px)', left: 0,
  width: 'min(240px, calc(100vw - 24px))',
  maxHeight: 'min(300px, 50dvh)',
  overflowY: 'auto',
  background: 'var(--color-semantic-background-elevated-normal)',
  borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
  zIndex: 200,
}}>
```
