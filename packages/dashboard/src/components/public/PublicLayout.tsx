import React from "react";
import { Sun, Moon, Globe, Shield, FileText, Home as HomeIcon, LogIn, ExternalLink } from "lucide-react";
import { useTheme } from "../../useTheme";
import { useLocale } from "../../lib/i18n";

interface PublicLayoutProps {
  children: React.ReactNode;
  activePath: "home" | "privacy" | "terms";
  onNavigate: (route: "home" | "privacy" | "terms" | "login" | "dashboard") => void;
  isAuthenticated?: boolean;
}

export function PublicLayout({ children, activePath, onNavigate, isAuthenticated }: PublicLayoutProps) {
  const { isDark, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand */}
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="group flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
          >
            <img
              src="/logo.svg"
              alt="MyHome Logo"
              className="h-9 w-9 rounded-xl shadow-sm shadow-blue-500/20 transition-transform group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-slate-900 dark:text-white text-base">
                  MyHome
                </span>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  Real Estate
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {t.appTagline || "아파트 실거래가 분석 & 맞춤 알림"}
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${
                activePath === "home"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <HomeIcon size={16} />
              <span>{t.navHome || "홈페이지"}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("privacy")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${
                activePath === "privacy"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Shield size={16} />
              <span>{t.navPrivacy || "개인정보처리방침"}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate("terms")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 transition-colors ${
                activePath === "terms"
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <FileText size={16} />
              <span>{t.navTerms || "이용약관"}</span>
            </button>
          </nav>

          {/* Action Tools & CTA */}
          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
              className="flex items-center gap-1 rounded-lg border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              title="언어 변경 (Language)"
            >
              <Globe size={14} className="text-slate-500" />
              <span>{locale === "ko" ? "EN" : "한국어"}</span>
            </button>

            {/* Dark Mode Switch */}
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="rounded-lg border border-slate-200/80 p-2 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* CTA Button */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
              >
                {t.navDashboard || "대시보드로 이동"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate("login")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
              >
                <LogIn size={14} />
                <span>{t.navLogin || "로그인"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub Navigation Bar (390px friendly) */}
        <div className="flex md:hidden border-t border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 px-2 py-1 justify-around text-xs">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className={`py-1.5 px-3 rounded-md transition-colors ${
              activePath === "home"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {t.navHome || "홈"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("privacy")}
            className={`py-1.5 px-3 rounded-md transition-colors ${
              activePath === "privacy"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {t.navPrivacy || "개인정보"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("terms")}
            className={`py-1.5 px-3 rounded-md transition-colors ${
              activePath === "terms"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {t.navTerms || "이용약관"}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            {/* Brand in Footer */}
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="MyHome Logo" className="h-8 w-8 rounded-lg" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">MyHome</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.appTagline || "아파트 실거래가 분석 & 맞춤 알림 대시보드"}
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {t.navHome || "홈페이지"}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("privacy")}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {t.navPrivacy || "개인정보처리방침"}
              </button>
              <button
                type="button"
                onClick={() => onNavigate("terms")}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {t.navTerms || "서비스 이용약관"}
              </button>
              <a
                href="mailto:heedo.dev@gmail.com"
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {t.contactSupport || "문의"}: heedo.dev@gmail.com
              </a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
            <p>
              &copy; {new Date().getFullYear()} MyHome. {t.allRightsReserved || "All rights reserved."}
            </p>
            <p className="text-[11px] text-center sm:text-right">
              Powered by Ministry of Land, Infrastructure and Transport Open API &amp; Kakao Maps
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default PublicLayout;
