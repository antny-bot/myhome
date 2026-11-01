# [11] 표준 에러 코드 및 응답 규격 가이드 (Error Codes)

백엔드 API 및 프론트엔드 클라이언트(`ApiError`) 간 RFC 7807 호환 표준 에러 코드 규격.

## 1. 표준 에러 응답 포맷 (JSON)

```json
{
  "error": "사용자 노출 또는 디버깅용 메시지",
  "code": "표준_에러_코드",
  "requestId": "req_1740000000000_abc123",
  "details": {
    "field": "부가 정보 (선택)"
  }
}
```

- `error`: 에러 메시지
- `code`: 클라이언트 분기용 식별자
- `requestId`: 추적용 고유 요청 ID (`X-Request-Id` 헤더 동일)
- `details`: 유효성 검사 실패 필드 등 부가 정보

## 2. 표준 에러 코드 목록

### 2.1 인증 및 권한 (4xx Auth)
| 에러 코드 (`code`) | HTTP 상태 | 설명 | 클라이언트 대응 |
|---|---|---|---|
| `AUTH_REQUIRED` | 401 Unauthorized | 세션 만료 또는 미로그인 | 로그인(`/login`) 리다이렉트 |
| `INVALID_CREDENTIALS` | 401 Unauthorized | 자격증명 불일치 | 재입력 안내 |
| `ACCOUNT_DEACTIVATED` | 403 Forbidden | 비활성화 계정 | 관리자 승인 문의 안내 |
| `FORBIDDEN` | 403 Forbidden | 관리자 권한 부족 | 권한 부족 알림 |
| `PASSWORD_RESET_REQUIRED`| 403 Forbidden | 임시 비밀번호 변경 필요 | 비밀번호 변경 모달 노출 |
| `ORIGIN_MISMATCH` | 403 Forbidden | Origin 헤더 불일치 (CSRF 차단) | 위변조 요청 차단 안내 |
| `CSRF_STATE_MISMATCH` | 400 Bad Request | OAuth state 토큰 불일치 | 소셜 로그인 재시도 안내 |
| `RATE_LIMIT_EXCEEDED` | 429 Too Many Requests | API 요청 횟수 초과 | 대기 후 재시도 안내 |

### 2.2 클라이언트 요청 (4xx Client)
| 에러 코드 (`code`) | HTTP 상태 | 설명 | 클라이언트 대응 |
|---|---|---|---|
| `INVALID_REQUEST` | 400 Bad Request | 파라미터 유효성 검증 실패 | 입력값 확인 안내 |
| `NOT_FOUND` | 404 Not Found | 리소스/단지/엔드포인트 부재 | 404 안내 |
| `COLLECTOR_BUSY` | 409 Conflict | 수집 작업 이미 실행 중 | 수집 진행 중 대기 토스트 |
| `SQL_DISALLOWED` | 403 Forbidden | 관리자 콘솔 위험 쿼리 차단 | 허용 SELECT 쿼리 안내 |

### 2.3 서버 및 외부 연동 (5xx Server)
| 에러 코드 (`code`) | HTTP 상태 | 설명 | 클라이언트 대응 |
|---|---|---|---|
| `EXTERNAL_API_ERROR` | 502 Bad Gateway | 외부 OpenAPI (국토부/카카오 등) 실패 | 재시도 안내 토스트 |
| `CIRCUIT_OPEN` | 503 Service Unavailable | 외부 API 장애로 서킷 브레이커 차단 | 외부 서비스 점검 중 안내 |
| `INTERNAL_SERVER_ERROR` | 500 Internal Server Error | 서버 내부 런타임 예외 | 관리자 문의 안내 |

## 3. 프론트엔드 연동 (`ApiError`)

```typescript
import { ApiError } from "@/api/http";

try {
  await fetchTransactions();
} catch (err) {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "AUTH_REQUIRED":
        redirectToLogin();
        break;
      case "COLLECTOR_BUSY":
        showToast("수집 작업이 진행 중입니다.", "warn");
        break;
      default:
        showToast(err.message, "error");
    }
  }
}
```
