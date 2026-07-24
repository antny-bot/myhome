import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, Home, Sun, Moon } from "lucide-react";
import { useTheme } from "../useTheme";
import ShaderBackground from "../components/ui/ShaderBackground";
import { loginLocal } from "../api";

const SAVE_EMAIL_KEY = "myhome_saved_email";
const REMEMBER_KEY = "myhome_remember_email";

const copy = {
  ko: {
    noAccess: "대시보드 접근 권한이 없습니다. 등록된 Google 계정으로 로그인해 주세요.",
    oauthFailed: "Google 로그인에 실패했습니다. 다시 시도해 주세요.",
    title: "MyHome",
    subtitle: "아파트 알림 & 실거래 분석 대시보드",
    description: "이 서비스는 등록된 사용자 전용 대시보드입니다.\n구글 OAuth 로그인을 통해 인증 후 이용할 수 있습니다.",
    googleLogin: "Google 계정으로 로그인",
    email: "이메일",
    password: "비밀번호",
    rememberEmail: "이메일 저장",
    login: "로그인",
    loggingIn: "로그인 중...",
    or: "또는",
    emailNotSupported: "이메일 로그인 기능은 비활성화되어 있습니다. Google 로그인을 이용해 주세요.",
    otpLabel: "2차 인증 번호 (OTP)",
    otpPlaceholder: "000000",
    otpHint: "Google OTP 앱에 표시된 6자리 번호를 입력해 주세요.",
    trustDevice: "이 기기를 30일 동안 신뢰함 (2차 인증 생략)",
    mfaButton: "인증 및 로그인",
    mfaVerifying: "인증 중...",
    goBack: "이전 화면으로 돌아가기"
  },
  en: {
    noAccess: "Access denied. Please log in with a registered Google account.",
    oauthFailed: "Google login failed. Please try again.",
    title: "MyHome",
    subtitle: "Apartment Alert & Analysis Dashboard",
    description: "This service is for registered users only.\nPlease authenticate via Google OAuth to proceed.",
    googleLogin: "Sign in with Google",
    email: "Email",
    password: "Password",
    rememberEmail: "Remember email",
    login: "Sign In",
    loggingIn: "Signing in...",
    or: "or",
    emailNotSupported: "Email login is disabled on this server. Please use Google Login.",
    otpLabel: "Two-Factor Authentication (OTP)",
    otpPlaceholder: "000000",
    otpHint: "Enter the 6-digit code shown in your Google OTP app.",
    trustDevice: "Trust this device for 30 days",
    mfaButton: "Verify and Sign In",
    mfaVerifying: "Verifying...",
    goBack: "Go back to previous screen"
  }
};

const locale = navigator.language.startsWith("ko") ? "ko" : "en";
const t = copy[locale];

function readQueryErrorMessage(search: string) {
  const params = new URLSearchParams(search);
  const errSlug = params.get("error");

  if (errSlug === "no_access") {
    return t.noAccess;
  }
  if (errSlug === "oauth_failed") {
    return t.oauthFailed;
  }

  return null;
}

export function LoginPage() {
  const [email, setEmail] = useState(() => localStorage.getItem(SAVE_EMAIL_KEY) || "");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) === "true");
  const [otpCode, setOtpCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isDark, setTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem(REMEMBER_KEY, String(rememberEmail));
    if (!rememberEmail) {
      localStorage.removeItem(SAVE_EMAIL_KEY);
    }
  }, [rememberEmail]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryError = readQueryErrorMessage(window.location.search);
    if (queryError) {
      setError(queryError);
    }
    if (params.get("oauth_mfa") === "1") {
      setIsMfaRequired(true);
    }
    if (queryError || params.get("oauth_mfa")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await loginLocal(email, password);
      if (res.ok) {
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || (locale === "ko" ? "로그인에 실패했습니다." : "Login failed. Please check your credentials."));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setError(t.emailNotSupported);
      setLoading(false);
    }, 800);
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  useEffect(() => {
    if (rememberEmail && email) {
      localStorage.setItem(SAVE_EMAIL_KEY, email);
    }
  }, [email, rememberEmail]);

  return (
    <div className="relative font-app-ui flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden">
      <ShaderBackground />
      <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/60 pointer-events-none -z-10" />

      {/* 다크모드 토글 버튼 */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-xl border border-slate-200/50 bg-white/50 p-2 text-slate-600 shadow-md backdrop-blur-md transition-all hover:bg-white/80 dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-800/80"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="w-full max-w-sm relative z-10">
        {/* 서비스 타이틀 */}
        <div className="mb-8 flex animate-fade-in-up flex-col items-center text-center">
          <div className="mb-4 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 shadow-lg shadow-blue-500/30 dark:from-blue-500 dark:to-indigo-500">
            <Home size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 drop-shadow-sm">
            {t.title}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400/80">
            {t.subtitle}
          </p>
        </div>

        {/* 로그인 카드 */}
        <div 
          className="animate-fade-in-up rounded-2xl border border-white/40 bg-white/30 p-6 shadow-2xl shadow-blue-950/10 backdrop-blur-2xl ring-1 ring-white/10 dark:border-slate-700/40 dark:bg-slate-900/30 dark:shadow-blue-950/30"
          style={{ animationDelay: "80ms" }}
        >
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700 dark:border-rose-800/30 dark:bg-rose-950/20 dark:text-rose-400 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {isMfaRequired ? (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.otpLabel}
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/50 px-3.5 py-2.5 text-center text-lg font-bold tracking-widest text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:ring-blue-400/50 dark:focus:border-blue-400/50"
                  placeholder={t.otpPlaceholder}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  {t.otpHint}
                </p>
              </div>

              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="trustDevice"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300/80 bg-white/50 text-blue-600 transition-colors focus:ring-blue-500 dark:border-slate-800/80 dark:bg-slate-950/40 dark:focus:ring-blue-400"
                />
                <label htmlFor="trustDevice" className="cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
                  {t.trustDevice}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? t.mfaVerifying : t.mfaButton}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMfaRequired(false);
                  setOtpCode("");
                  setError(null);
                }}
                className="mt-2 block w-full py-2 text-center text-xs text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              >
                {t.goBack}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.email}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/50 px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:ring-blue-400/50 dark:focus:border-blue-400/50"
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.password}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/60 bg-white/50 px-3.5 py-2.5 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:ring-blue-400/50 dark:focus:border-blue-400/50"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="rememberEmail"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300/80 bg-white/50 text-blue-600 transition-colors focus:ring-blue-500 dark:border-slate-800/80 dark:bg-slate-950/40 dark:focus:ring-blue-400"
                />
                <label htmlFor="rememberEmail" className="cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
                  {t.rememberEmail}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/30 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
              >
                {loading ? t.loggingIn : t.login}
              </button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/50 dark:border-slate-800/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white/30 px-2 text-slate-500 backdrop-blur-sm dark:bg-slate-900/30 dark:text-slate-400">{t.or}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200/60 bg-white/40 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-white/60 dark:border-slate-800/60 dark:bg-slate-950/20 dark:text-slate-200 dark:hover:bg-slate-950/50 active:scale-[0.98] shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                  <path fill="#4285F4" d="M44.5 20H24v8.5h11.9C34.2 33.5 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l6.4-6.4C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-7.7 19.6-20 0-1.3-.1-2.7-.1-4z" />
                  <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.5 19.2 14 24 14c3.1 0 5.8 1.1 8 2.9l6.4-6.4C34.5 6.1 29.5 4 24 4c-7.8 0-14.4 4.6-17.7 10.7z" />
                  <path fill="#FBBC05" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.4C29.6 35.4 27 36 24 36c-5.5 0-10.1-2.5-12-6.5l-7 5.4C8.6 41.3 15.8 44 24 44z" />
                  <path fill="#EA4335" d="M44.5 20H24v8.5h11.9c-1 2.7-2.9 4.9-5.4 6.5l6.5 5.4C41.4 36.4 44 30.9 44 24c0-1.3-.1-2.7-.5-4z" />
                </svg>
                {t.googleLogin}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
