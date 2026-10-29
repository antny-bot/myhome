# 11. 표준 에러 코드 및 응답 규격 가이드 (Error Codes)

본 문서는 `myhome` 서비스의 백엔드 API 및 프론트엔드 클라이언트(`ApiError`) 간 일관된 통신과 디버깅을 위해 정의된 표준 에러 코드 및 오류 응답 명세서입니다.

---

## 1. 표준 에러 응답 형식 (RFC 7807 호환)

서버에서 오류 발생 시 JSON 형식으로 반환되는 공통 구조는 다음과 같습니다.

```json
{
  "error": "상세한 오류 메시지 (사용자 안내 또는 디버깅용)",
  "code": "표준_에러_코드",
  "requestId": "req_1740000000000_abc123",
  "details": {
    "field": "부가 정보 (선택)"
  }
}
```

- **`error`**: 사용자 또는 클라이언트에 표시 가능한 에러 메시지
- **`code`**: 클라이언트 분기 처리용 기계 판독 가능한 표준 식별자 (아래 표 참조)
- **`requestId`**: 로깅 및 추적을 위한 고유 요청 ID (`X-Request-Id` 헤더와 동일)
- **`details`**: 유효성 검사 실패 필드 등 추가 정보 (옵션)

---

## 2. 표준 에러 코드 목록

### 2.1 인증 및 권한 (4xx Auth)

| 에러 코드 (`code`) | HTTP 상태 | 설명 | 클라이언트 대응 |
|---|---|---|---|
| `AUTH_REQUIRED` | 401 Unauthorized | 세션 만료 또는 미로그인 상태 | 로그인 화면(`/login`)으로 리다이렉트 |
| `INVALID_CREDENTIALS` | 401 Unauthorized | 아이디/비밀번호 불일치 | 자격증명 재입력 안내 |
| `ACCOUNT_DEACTIVATED` | 403 Forbidden | 비활성화 또는 미승인된 계정 | 관리자 승인 문의 안내 |
| `FORBIDDEN` | 403 Forbidden | 관리자 권한 부족 등 권한 제한 | 권한 부족 알림 표시 |
| `PASSWORD_RESET_REQUIRED`| 403 Forbidden | 임시 비밀번호 발급 상태로 변경 필요 | 비밀번호 변경 모달 자동 노출 |
| `ORIGIN_MISMATCH` | 403 Forbidden | CSRF 방어용 Origin 헤더 불일치 | 변조 요청 차단 안내 |
| `CSRF_STATE_MISMATCH` | 400 Bad Request | OAuth 과정의 state 토큰 불일치 | 소셜 로그인 재시도 안내 |
| `RATE_LIMIT_EXCEEDED` | 429 Too Many Requests | 인증/API 요청 횟수 상한 초과 | 일정 시간 후 재시도 안내 |

### 2.2 요청 및 리소스 (4xx Client)

| 에러 코드 (`code`) | HTTP 상태 | 설명 | 클라이언트 대응 |
|---|---|---|---|
| `INVALID_REQUEST` | 400 Bad Request | 요청 파라미터 유효성 검증 실패 | 입력값 확인 알림 |
| `NOT_FOUND` | 404 Not Found | 요청한 리소스/단지/엔드포인트 부재 | 리소스 부재 안내 또는 404 화면 |
| `COLLECTOR_BUSY` | 409 Conflict | 다른 수집 작업이 이미 실행 중임 | 수집 진행 중 토스트 및 대기 안내 |
| `SQL_DISALLOWED` | 403 Forbidden | 관리자 콘솔에서 위험 쿼리 차단 | 허용된 SELECT 쿼리만 사용 안내 |

### 2.3 외부 연동 및 서버 (5xx Server)

| 에러 코드 (`code`) | HTTP 상태 | 설명 | 클라이언트 대응 |
|---|---|---|---|
| `EXTERNAL_API_ERROR` | 502 Bad Gateway | 국토부/부동산원/카카오 API 실패 | 잠시 후 재시도 안내 토스트 |
| `CIRCUIT_OPEN` | 503 Service Unavailable | 외부 API 장애로 서킷 브레이커 차단 | 외부 서비스 점검 중 안내 |
| `INTERNAL_SERVER_ERROR` | 500 Internal Server Error | 서버 내부 런타임 예외 발생 | 관리자 문의 및 재시도 안내 |

---

## 3. 프론트엔드 연동 (`ApiError`)

프론트엔드에서는 `src/api/http.ts`의 `ApiError` 클래스를 통해 백엔드 에러 응답을 정형화하여 처리합니다.

```typescript
import { ApiError } from "@/api/http";

try {
  await api.fetchComplexMetrics("11680-1234");
} catch (err) {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "AUTH_REQUIRED":
        // 로그인 페이지로 이동
        break;
      case "COLLECTOR_BUSY":
        // 수집 중 알림 표시
        break;
      default:
        // 일반 에러 토스트
        toast.error(err.message);
    }
  }
}
```
