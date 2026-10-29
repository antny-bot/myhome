export const Config = {
  // 기존 키
  get KAKAO_REST_API_KEY() { return process.env.KAKAO_REST_API_KEY; },
  get JUSO_CONFM_KEY() { return process.env.JUSO_CONFM_KEY; },
  get DATA_GO_KR_API_KEY() { return process.env.DATA_GO_KR_API_KEY; },
  get BLD_RGST_API_KEY() { return process.env.BLD_RGST_API_KEY; },
  get KAKAO_JAVASCRIPT_KEY() { return process.env.KAKAO_JAVASCRIPT_KEY; },
  get KAKAO_NATIVE_APP_KEY() { return process.env.KAKAO_NATIVE_APP_KEY; },
  get GEMINI_API_KEY() { return process.env.GEMINI_API_KEY; },
  get GOOGLE_CLIENT_ID() { return process.env.GOOGLE_CLIENT_ID; },
  get GOOGLE_CLIENT_SECRET() { return process.env.GOOGLE_CLIENT_SECRET; },
  get GOOGLE_REDIRECT_URI() { return process.env.GOOGLE_REDIRECT_URI; },
  // 새로 추가된 키
  get ALLOWED_EMAILS() { return process.env.ALLOWED_EMAILS; },
  get ADMIN_EMAILS() { return process.env.ADMIN_EMAILS; },
  get ENABLE_BOOTSTRAP_ADMIN() { return process.env.ENABLE_BOOTSTRAP_ADMIN; },
  get ALLOWED_ORIGINS() { return process.env.ALLOWED_ORIGINS; },
  // 서버 설정
  get PORT() { return process.env.PORT; },
  get HOST() { return process.env.HOST; },
  get TELEGRAM_BOT_TOKEN() { return process.env.TELEGRAM_BOT_TOKEN; },
  get TELEGRAM_CHAT_ID() { return process.env.TELEGRAM_CHAT_ID; },
  // 데이터 및 서비스 설정
  get GRAPH_DB_ENABLED() { return process.env.GRAPH_DB_ENABLED; },
  get CHECK_INTERVAL_SECONDS() { return process.env.CHECK_INTERVAL_SECONDS; },
};

/**
 * 서버 시작 시 환경변수를 검증합니다.
 * - 치명적 누락(인증 불가 상태): process.exit(1) 로 종료
 * - 선택적 누락(기능 일부 비활성화): console.warn 경고
 */
export function validateRequiredConfig() {
  const warnings: string[] = [];
  const errors: string[] = [];

  // ── 인증 설정 검사 ─────────────────────────────────────────────
  const hasGoogleOAuth = Boolean(Config.GOOGLE_CLIENT_ID && Config.GOOGLE_REDIRECT_URI);
  const hasBootstrapAdmin = Config.ENABLE_BOOTSTRAP_ADMIN === "true";

  if (!hasGoogleOAuth && !hasBootstrapAdmin) {
    errors.push(
      "인증 설정 없음: GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI 가 설정되지 않았고, ENABLE_BOOTSTRAP_ADMIN=true 도 지정되지 않았습니다. " +
      "서버에 접근할 수 없습니다. .env 파일을 확인하세요."
    );
  } else if (hasBootstrapAdmin && !hasGoogleOAuth) {
    warnings.push(
      "⚠️  [보안 경고] ENABLE_BOOTSTRAP_ADMIN=true 활성화 상태입니다. " +
      "Google OAuth 없이 관리자 세션이 자동 부여됩니다. 프로덕션 환경에서는 반드시 GOOGLE_CLIENT_ID를 설정하세요."
    );
  }

  // ── 텔레그램 설정 검사 ──────────────────────────────────────────
  if (!Config.TELEGRAM_BOT_TOKEN) {
    warnings.push("TELEGRAM_BOT_TOKEN 미설정: 텔레그램 알림 기능이 비활성화됩니다.");
  }

  // ── 카카오 API 설정 검사 ────────────────────────────────────────
  if (!Config.KAKAO_REST_API_KEY) {
    warnings.push("KAKAO_REST_API_KEY 미설정: 카카오 메시지 전송 및 좌표 조회 기능이 제한됩니다.");
  }

  // ── 국토부 API 설정 검사 ────────────────────────────────────────
  if (!Config.DATA_GO_KR_API_KEY) {
    warnings.push("DATA_GO_KR_API_KEY 미설정: 공공데이터포털 실거래 데이터 직접 조회가 불가합니다.");
  }

  // ── 결과 출력 및 조치 ──────────────────────────────────────────
  if (warnings.length > 0) {
    console.warn("\n환경변수 확인 필요 (선택 기능 비활성화):");
    warnings.forEach((w) => console.warn(`  ${w}`));
    console.warn("");
  }

  if (errors.length > 0) {
    console.error("\n❌ 치명적 환경변수 누락 (서버 기동 불가):");
    errors.forEach((e) => console.error(`  - ${e}`));
    console.error("\n.env 파일을 올바르게 설정한 후 다시 실행해주세요.\n");
    process.exit(1);
  }
}
