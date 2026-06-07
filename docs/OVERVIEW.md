# myhome 프로젝트 개요

> **아파트 알림 서비스 (Apartment Alert)** — MCP를 통한 매물 정보 조회 및 알림 자동화 서비스 (v0.1.0)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | Node.js (Express), TypeScript, `server/` |
| 프론트엔드 | React (v19) + TypeScript + Vite + Tailwind CSS, `src/` |
| 런타임 | `tsx` (Server), `Vite` (Web) |
| 빌드 | `npm run build` (tsc + vite build) |
| 실행 | `npm run dev` (Backend/Frontend 동시 실행) |
| 외부 연동 | MCP (Model Context Protocol) via `mcporter`, Telegram Bot API |

## 디렉토리 구조

```
server/
  index.ts           ← 서버 엔트리 포인트 및 스케줄러 실행
  routes.ts          ← REST API 라우팅 (rules, check-runs, notifications 등)
  mcpClient.ts       ← mcporter를 이용한 MCP 서버(AptInfo) 연동
  ruleEngine.ts      ← 매물 매칭 및 중복 방지 로직
  scheduler.ts       ← 주기적 매물 확인 스케줄러
  notifications.ts   ← Telegram/Kakao 알림 어댑터
  storage.ts         ← JSON 파일(`data/app-state.json`) 기반 데이터 저장소
  types.ts           ← 백엔드 도메인 타입 정의

src/
  main.tsx           ← 프론트엔드 엔트리 포인트
  App.tsx            ← 대시보드 메인 UI 및 화면 구성
  api.ts             ← 백엔드 API 연동 클라이언트
  types.ts           ← 프론트엔드 공통 타입 정의
  styles.css         ← Tailwind CSS 및 전역 스타일

docs/
  OVERVIEW.md        ← 이 파일 (프로젝트 구조 파악용)
  DESIGN.md          ← UI/UX 디자인 가이드라인 (현재 업데이트 필요)
  superpowers/       ← 기능 설계 및 구현 계획
    plans/           ← 구현 단계별 상세 계획
    specs/           ← 기술 설계 명세서

data/
  app-state.json     ← 애플리케이션 상태(규칙, 이력 등) 저장 파일
```

## 핵심 구현 패턴

**백엔드 (Express)**:
- `mcporter` CLI를 사용하여 MCP 서버와 통신하며 국토교통부 아파트 실거래가 정보를 가져옵니다.
- `scheduler`가 설정된 주기에 따라 `ruleEngine`을 가동하여 매칭되는 매물을 찾습니다.
- 매칭된 매물은 `notifications`를 통해 Telegram 등으로 전송됩니다.

**프론트엔드 (React)**:
- Vite 프록시 설정을 통해 `/api` 요청을 백엔드로 전달합니다.
- Tailwind CSS를 사용한 유틸리티 중심의 반응형 대시보드를 제공합니다.
- 사용자는 화면에서 알림 규칙(지역, 가격 범위 등)을 관리하고 실행 이력을 확인할 수 있습니다.

**데이터 관리**:
- 별도의 DB 없이 `data/app-state.json` 파일에 모든 상태를 저장하는 경량 아키텍처를 사용합니다.

## 작업 유형별 필독 파일

| 작업 유형 | 필독 파일 |
|-----------|-----------|
| 서버 API/로직 수정 | `server/` 내 관련 파일, `docs/superpowers/specs/` |
| MCP 연동/데이터 조회 | `server/mcpClient.ts`, `docs/superpowers/plans/` |
| 대시보드 UI/UX 수정 | `src/App.tsx`, `docs/DESIGN.md` |
| 신규 기능 추가 계획 | `docs/superpowers/plans/` |

## 개발 현황 요약

- **Phase 1: Project Scaffold** 완료 ✓
- **Phase 2-5: Backend & Engine** 구현 중
- **Phase 6: Frontend Dashboard** 예정
- 상세 로드맵: `docs/superpowers/plans/2026-06-06-apartment-alert.md`
