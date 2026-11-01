# [09] 시스템 아키텍처 및 API 명세 (Architecture & APIs)

`myhome` 서비스 전체 시스템 컴포넌트, 모노레포 레이어, 데이터 흐름, REST API 엔드포인트 명세 및 Docker 배포 운영 정책.

## 1. 컴포넌트 아키텍처

```mermaid
graph TD
    User([사용자 브라우저]) -->|HTTPS| FE[React Web App (packages/dashboard)]
    FE -->|REST API /api/*| BE[Express Server (packages/dashboard/server)]
    
    subgraph Backend Services
        BE -->|Schedule Trigger| SCH[Scheduler (scheduler.ts)]
        BE -->|Rule Check| RE[Rule Engine (ruleEngine.ts)]
        SCH -->|Daily Sync KST 06:00| COL[Collector Bot (packages/collector)]
    end

    subgraph Data Layer
        BE -->|Read/Write| DB[(SQLite: data/myhome.db)]
        COL -->|Batch Upsert| DB
        BE -->|Prepared Statement LRU| LocalCache[In-Memory Cache]
    end

    subgraph External APIs
        COL -->|HTTP GET| MOLIT[국토교통부 실거래 OpenAPI]
        BE -->|HTTP GET| KAKAO[카카오 Local/지도 SDK]
        BE -->|HTTP POST| GEMINI[Google Gemini API]
        RE -->|HTTP POST| TELEGRAM[텔레그램 Bot API]
    end
```

## 2. 모노레포 레이어 구성 (npm workspaces)

- **`packages/shared`**:
  - `src/db/`: 도메인별 분할 SQLite 계층 (connection, schema, transactions, analytics, regions, geocoding, auth, rules, presets, activityLogs).
  - `src/apiClient.ts`: 국토부 API fetch, 페이지네이션, 지수 백오프, URL 마스킹.
  - `src/xmlParser.ts`: fast-xml-parser 기반 공공데이터 파서.
- **`packages/collector`**: 국토부 실거래 자동 수집기 (`runCollector()`).
- **`packages/dashboard`**: Express 백엔드 + Vite React 프론트엔드 통합 컨테이너.

## 3. 백엔드 아키텍처

- **미들웨어 파이프라인**:
  - `trust proxy`: Nginx 리버스 프록시 IP 추적.
  - `authMiddleware`: 세션 쿠키 검증 및 컨텍스트 주입.
  - `adminRequired`: 관리자 전용 API 인가(403 반환).
- **스케줄러 (`scheduler.ts`)**:
  - 룰 검사: 300초 주기 활성 규칙 검사 및 텔레그램 발송.
  - 일일 수집: 매일 1회 KST 06:00 이후 실행, `CollectorLock` 및 `lastSuccessDate` 영속화로 중복 차단.

## 4. 데이터 및 좌표 캐시 정책

- **SQLite 로컬 파일**: `data/myhome.db`
- **지연 지오코딩 (Lazy Geocoding)**:
  1. 단지 위경도 필요 시 로컬 DB `complex_coords` 우선 조회 (`Cache Hit` 0ms).
  2. 부재 시 카카오 Local API 호출 후 DB 영구 캐싱.
  3. 실패 시 실패 사유(`reason`) 기록, 불필요한 반복 외부 호출 차단.

## 5. 주요 REST API 엔드포인트 명세

### 5.1 인증 및 사용자 설정
| Method | Path | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/auth/google` | Public | Google OAuth 로그인 리디렉션 |
| `GET` | `/api/auth/google/callback` | Public | Google OAuth 콜백 처리 및 세션 발급 |
| `GET` | `/api/auth/me` | Public | 현재 로그인 사용자 세션 정보 조회 |
| `POST` | `/api/auth/logout` | User | 세션 종료 및 로그아웃 |
| `GET` | `/api/user-config` | User | 개인 API 키 (Telegram/Kakao/Gemini) 조회 |
| `POST` | `/api/user-config` | User | 개인 API 키 저장 및 갱신 |

### 5.2 감시 조건 및 알림
| Method | Path | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/rules` | User | 관심 알림 조건 목록 조회 |
| `POST` | `/api/rules` | User | 신규 관심 조건 등록 |
| `PATCH` | `/api/rules/:id` | User | 관심 조건 수정 및 활성화/비활성화 토글 |
| `DELETE`| `/api/rules/:id` | User | 관심 조건 삭제 |
| `POST` | `/api/rules/:id/run` | User | 관심 조건 즉시 수집 및 매칭 검사 실행 |
| `GET` | `/api/check-runs` | User | 수집 및 룰 매칭 이력 조회 |
| `GET` | `/api/notifications` | User | 발송된 Telegram 알림 내역 조회 |

### 5.3 실거래 수집 및 지역 탐색
| Method | Path | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/regions/search` | User | 지역명/주소 자동완성 검색 |
| `GET` | `/api/apartments/list` | User | 특정 지역(법정동) 단지 목록 조회 |
| `GET` | `/api/transactions` | User | 국토부 실거래 데이터 수집 및 조회 |
| `GET` | `/api/transactions/batch` | User | 특정 기간 일괄 실거래 조회 |

### 5.4 SQLite 분석 및 대시보드
| Method | Path | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/graph/stats` | User | 로컬 DB 전체 레코드 요약 통계 |
| `GET` | `/api/graph/db-regions` | User | DB 수집 완료 지역 목록 |
| `GET` | `/api/graph/regions-summary` | User | 수집 지역별 요약 통계 |
| `GET` | `/api/graph/complex/:name/trend` | User | 특정 단지 월별 평단가 추이 |
| `GET` | `/api/graph/complex/:name/detail` | User | 단지 상세 리포트 (평형/층별 통계, 최근 10건) |
| `GET` | `/api/graph/nearby-station` | User | 지하철역 반경 내 단지 목록 및 수집 상태 |
| `GET` | `/api/graph/collect-stats/daily` | User | 일자별 실거래 수집 통계 |
| `GET` | `/api/graph/collect-stats/monthly` | User | 등록월별 실거래 수집 통계 |
| `GET` | `/api/graph/collect-stats/region` | User | 특정 수집일/월의 지역별 수집 상세 드릴다운 |
| `CRUD`| `/api/graph/presets` | User | 대시보드 조회 필터 프리셋 관리 |
| `CRUD`| `/api/graph/insights` | User | Gemini AI 분석 인사이트 관리 |

### 5.5 시스템 관리 & 활동 로그
| Method | Path | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/system-config` | Admin | 시스템 환경설정 마스킹 조회 |
| `POST` | `/api/system-config` | Admin | 시스템 환경설정 갱신 |
| `PUT` | `/api/complexes/coords` | Admin | 단지 위경도 좌표 수동 수정 |
| `POST` | `/api/complexes/coords/reset` | Admin | 특정 단지 좌표 초기화 |
| `POST` | `/api/geocoding/reset-failures` | Admin | 지오코딩 실패 상태 초기화 및 재시도 플래그 활성화 |
| `GET` | `/api/logs` | Admin | 사용자 활동 로그 목록 및 페이징 조회 |
| `GET` | `/api/logs/stats` | Admin | 활동 유형별 통계 및 DAU/WAU/MAU 조회 |

## 6. 배포 및 운영 규격 (Docker)

### 6.1 컨테이너 규격
- **베이스 이미지**: `node:24-alpine` (`node:sqlite` 내장 모듈 지원).
- **프로세스 격리**: `USER node` 비루트 실행.
- **볼륨 마운트**: `./data:/app/data` (호스트 경로 영속화).
- **헬스체크**: `GET /api/v1/health` (30초 간격).

### 6.2 Docker Compose 운영 실행
```bash
docker-compose up -d
```
- 서비스 포트: `:4174` (단일 컨테이너로 백엔드 API + React 프론트 서빙).
- 리소스 제약: Limits (1.0 CPU, 1024MB RAM), Reservations (0.2 CPU, 256MB RAM).
- 재시작 정책: `restart: unless-stopped`.
