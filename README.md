# Apartment Alert

PlayMCP `mcp-gateway`의 아파트 실거래가 및 단지 정보를 정기적으로 조회하고, 저장한 조건과 일치하는 결과를 웹 대시보드와 Telegram으로 알려주는 로컬 프로그램입니다.

## 주요 기능

- 관심 지역, 단지명, 가격 범위, 거래년월 저장
- PlayMCP를 통한 지역코드 및 월별 실거래가 조회
- 같은 거래에 대한 중복 알림 방지
- 조건별 자동 조회 주기 설정
- 웹 대시보드에서 즉시 조회
- Telegram 알림
- Kakao 나에게 보내기 연동을 위한 확장 구조

## 중요한 데이터 제약

이 프로그램은 현재 등록된 부동산 매물을 조회하는 프로그램이 아닙니다.

현재 확인 가능한 데이터:

- 행정구역 코드
- 지역별 아파트 단지 목록
- 아파트 단지 상세정보
- 월별 아파트 실거래가

확인할 수 없는 데이터:

- 현재 매도 매물
- 현재 호가
- 매물 등록 및 삭제
- 네이버부동산 등의 실시간 매물

따라서 `20억 이하` 조건은 현재 매도 희망가격이 아니라 신고된 실거래가를 기준으로 평가합니다.

## 기술 구성

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, TypeScript, Express
- MCP client: `mcporter`
- Data source: PlayMCP `mcp-gateway`
- Local storage: `data/app-state.json`
- Notification: Telegram Bot API

```text
React dashboard
    |
    v
Express API and scheduler
    |
    v
mcporter
    |
    v
PlayMCP mcp-gateway
```

정기 조회와 가격 필터링에는 LLM이 필요하지 않습니다. TypeScript 규칙 엔진이 MCP 결과를 필터링합니다. 자연어 조건 해석이나 추천 설명을 자동화하려면 별도로 LLM을 추가할 수 있습니다.

## 사전 준비

다음 프로그램이 필요합니다.

- Node.js 20 이상
- npm
- `mcporter`
- 인증된 PlayMCP `mcp-gateway` 연결

설치 여부를 확인합니다.

```powershell
node --version
npm --version
mcporter --version
```

MCP 연결 상태를 확인합니다.

```powershell
mcporter list mcp-gateway
```

아파트 관련 도구 목록이 표시되면 연결된 상태입니다. 인증이 풀렸다면 PlayMCP에서 새로운 One Time Token을 발급받아 MCP 인증을 다시 설정해야 합니다.

## 설치

프로젝트 폴더에서 의존성을 설치합니다.

```powershell
Set-Location E:\apps\myhome
npm install
```

## 실행

Frontend와 Backend를 함께 실행합니다.

```powershell
Set-Location E:\apps\myhome
npm run dev
```

실행 주소:

- 웹 대시보드: <http://127.0.0.1:5173>
- Backend API: <http://127.0.0.1:4174>
- API 상태 확인: <http://127.0.0.1:4174/api/health>

터미널에 다음과 비슷한 메시지가 표시되면 정상입니다.

```text
VITE ready
Local: http://127.0.0.1:5173/
Apartment Alert API listening on http://127.0.0.1:4174
```

프로그램을 종료하려면 실행한 터미널에서 `Ctrl+C`를 누릅니다.

## 사용 방법

1. 웹 대시보드에서 `관심 조건 만들기`를 찾습니다.
2. 조건 이름과 지역명을 입력합니다.
3. 필요한 경우 단지명 키워드를 입력합니다.
4. 거래년월을 `YYYYMM` 형식으로 입력합니다.
5. 최소·최대 실거래 가격을 억 단위로 입력합니다.
6. 조회 주기를 분 단위로 설정합니다.
7. 조건을 저장합니다.
8. 즉시 확인하려면 `지금 체크`를 누릅니다.

지역명 예시:

```text
분당구
성남시 분당구
경기도 성남시 분당구
서울특별시 강남구
```

`경기도 분당구`처럼 중간 행정구역이 생략된 입력은 프로그램이 `분당구`로 다시 조회합니다. 그래도 조회되지 않으면 공식 시·군·구 명칭을 입력하십시오.

### 지역명 자동완성 (카카오 주소 검색)

카카오 Local 주소 검색 API 키를 설정하면, 지역명을 입력하는 동안 후보가 실시간으로 떠서 범위를 좁힐 수 있습니다. 예를 들어 `경기도 수원시`를 입력하면 `경기도 수원시 영통구 ...동` 같은 하위 후보가 표시되고, 그중 하나를 선택하면 해당 지역코드(`lawd_cd`)로 실거래가를 조회합니다.

키 발급 및 설정:

1. <https://developers.kakao.com> 에서 애플리케이션을 생성합니다.
2. `앱 키`의 **REST API 키**를 복사합니다.
3. 프로젝트 루트의 `.env` 파일에 추가합니다 (서버 시작 시 자동으로 읽습니다).

```
KAKAO_REST_API_KEY=YOUR_REST_API_KEY
```

키를 설정하지 않으면 기존처럼 PlayMCP `get_region_code` 기반 단일 검색으로 동작합니다(자동완성 없음).

## Telegram 알림 설정

Telegram BotFather에서 봇을 만들고 다음 값을 준비합니다.

- Bot token
- 알림을 받을 Chat ID

프로젝트 루트의 `.env` 파일에 추가합니다 (서버 시작 시 자동으로 읽습니다).

```
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

설정 여부는 다음 API에서 확인할 수 있습니다.

```powershell
Invoke-RestMethod http://127.0.0.1:4174/api/config
```

`telegramConfigured`가 `true`이면 Telegram 설정이 적용된 상태입니다.

Telegram 설정이 없더라도 실거래가 조회와 웹 대시보드는 사용할 수 있습니다. 이 경우 알림 발송은 `skipped`로 기록됩니다.

## 조회 주기

각 관심 조건에는 `intervalMinutes`가 저장됩니다. Backend 스케줄러는 활성 조건 중 마지막 조회 이후 해당 시간이 지난 조건만 실행합니다.

스케줄러가 조건을 확인하는 기본 간격은 300초입니다. 실행 전에 변경할 수 있습니다.

```powershell
$env:CHECK_INTERVAL_SECONDS="60"
npm run dev
```

이 값은 스케줄러가 대기 중인 조건을 확인하는 주기이며, 각 조건의 실제 조회 주기는 대시보드에서 설정한 분 단위 값입니다.

## 빌드와 타입 검사

전체 TypeScript 검사와 Frontend 프로덕션 빌드:

```powershell
npm run build
```

TypeScript 검사만 실행:

```powershell
npm run typecheck
```

## 로컬 데이터

관심 조건, 조회 결과, 알림 이력은 다음 파일에 저장됩니다.

```text
data/app-state.json
```

이 파일은 개인 설정과 이력을 포함하므로 Git에서 제외됩니다. 파일이 없으면 Backend가 자동으로 생성합니다.

## 주요 API

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/health` | Backend 상태 확인 |
| `GET` | `/api/config` | Telegram 및 데이터 소스 설정 확인 |
| `GET` | `/api/rules` | 관심 조건 목록 |
| `POST` | `/api/rules` | 관심 조건 생성 |
| `PATCH` | `/api/rules/:id` | 관심 조건 수정 및 활성화 변경 |
| `POST` | `/api/rules/:id/run` | 관심 조건 즉시 조회 |
| `GET` | `/api/check-runs` | 최근 조회 결과 |
| `GET` | `/api/notifications` | 알림 이력 |

## MCP 직접 확인

지역코드 조회:

```powershell
mcporter call mcp-gateway.AptInfo-get_region_code region_name='분당구' --output json
```

분당구 월별 실거래가 조회:

```powershell
mcporter call mcp-gateway.AptInfo-get_apt_price lawd_cd=41135 deal_ymd=202606 --output json
```

단지 목록 조회:

```powershell
mcporter call mcp-gateway.AptInfo-get_apt_list sgg_code=41135 page=1 size=50 --output json
```

## 문제 해결

### `spawn EINVAL`

최신 코드에서는 Windows에서 `mcporter`의 JavaScript CLI를 Node로 직접 실행합니다. 계속 발생하면 다음을 확인합니다.

```powershell
mcporter list mcp-gateway
Get-Command mcporter
npm run build
```

### `Could not find region code`

지역명을 공식 명칭 또는 짧은 시·군·구 명칭으로 다시 입력합니다.

```text
분당구
경기도 성남시 분당구
강남구
서울특별시 강남구
```

### API 요청이 500으로 실패

개발 서버 터미널의 Backend 오류를 확인합니다. MCP 연결을 별도로 검사합니다.

```powershell
mcporter list mcp-gateway
mcporter call mcp-gateway.AptInfo-get_region_code region_name='분당구' --output json
```

### Telegram 알림이 오지 않음

1. Bot token과 Chat ID를 같은 PowerShell 세션에 설정했는지 확인합니다.
2. 봇과 대화를 먼저 시작했는지 확인합니다.
3. `/api/config`의 `telegramConfigured` 값을 확인합니다.
4. 대시보드 알림 이력에서 `sent`, `skipped`, `failed` 상태를 확인합니다.

### 화면의 API 요청이 404

Frontend와 Backend를 함께 실행했는지 확인합니다.

```powershell
npm run dev
```

Vite는 `/api` 요청을 `http://127.0.0.1:4174`로 전달합니다. Backend만 종료된 경우 웹 화면은 열려도 API 요청은 실패합니다.

## 현재 구현 범위

- Telegram: 사용 가능
- Kakao 나에게 보내기: 2차 구현 예정
- 자연어 LLM 검색: 미포함
- 실시간 매물 검색: 데이터 소스에서 미제공
- 사용자 계정 및 원격 서버 배포: 미포함

설계와 구현 계획은 다음 문서에 있습니다.

- `docs/superpowers/specs/2026-06-06-apartment-alert-design.md`
- `docs/superpowers/plans/2026-06-06-apartment-alert.md`
