import { useEffect, useState } from "react";
import { AlertCircle, Home } from "lucide-react";

function readQueryErrorMessage(search: string) {
  const params = new URLSearchParams(search);
  const errSlug = params.get("error");

  if (errSlug === "no_access") {
    return "대시보드 접근 권한이 없습니다. 등록된 Google 계정으로 로그인해 주세요.";
  }
  if (errSlug === "oauth_failed") {
    return "Google 로그인에 실패했습니다. 다시 시도해 주세요.";
  }

  return null;
}

export function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryError = readQueryErrorMessage(window.location.search);
    if (queryError) {
      setError(queryError);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden bg-alternative">
      {/* 백그라운드 몽환적인 그라데이션 서클 */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-600/10" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-600/10" />

      <div className="w-full max-w-sm relative z-10">
        {/* 서비스 타이틀 */}
        <div className="mb-8 flex flex-col items-center text-center animate-fade-in">
          <div className="mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 shadow-lg shadow-blue-500/20 dark:from-blue-500 dark:to-indigo-500">
            <Home size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-strong">
            MyHome
          </h1>
          <p className="mt-2 text-sm font-medium text-neutral">
            아파트 알림 & 실거래 분석 대시보드
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="rounded-2xl border border-normal bg-normal/70 p-6 shadow-xl backdrop-blur-md">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200/50 bg-red-50/50 p-3.5 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center text-xs text-neutral leading-relaxed">
              이 서비스는 등록된 사용자 전용 대시보드입니다.<br />
              구글 OAuth 로그인을 통해 인증 후 이용할 수 있습니다.
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-normal bg-normal/80 py-3 text-sm font-semibold text-strong shadow-sm hover:bg-alternative active:scale-[0.98] transition-all"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.9C34.2 33.5 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l6.4-6.4C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-7.7 19.6-20 0-1.3-.1-2.7-.1-4z" />
                <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.5 19.2 14 24 14c3.1 0 5.8 1.1 8 2.9l6.4-6.4C34.5 6.1 29.5 4 24 4c-7.8 0-14.4 4.6-17.7 10.7z" />
                <path fill="#FBBC05" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.4C29.6 35.4 27 36 24 36c-5.5 0-10.1-2.5-12-6.5l-7 5.4C8.6 41.3 15.8 44 24 44z" />
                <path fill="#EA4335" d="M44.5 20H24v8.5h11.9c-1 2.7-2.9 4.9-5.4 6.5l6.5 5.4C41.4 36.4 44 30.9 44 24c0-1.3-.1-2.7-.5-4z" />
              </svg>
              Google 계정으로 로그인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
