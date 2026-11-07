import React from "react";
import {
  TrendingUp,
  MapPin,
  BellRing,
  ShieldCheck,
  ArrowRight,
  Database,
  Smartphone,
  CheckCircle2,
  Lock,
  ChevronRight
} from "lucide-react";
import { PublicLayout } from "../../components/public/PublicLayout";
import { useLocale } from "../../lib/i18n";

interface HomePageProps {
  onNavigate: (route: "home" | "privacy" | "terms" | "login" | "dashboard") => void;
  isAuthenticated?: boolean;
}

export function HomePage({ onNavigate, isAuthenticated }: HomePageProps) {
  const { t, locale } = useLocale();

  const handleGoogleLogin = () => {
    window.location.href = "/api/v1/auth/google";
  };

  return (
    <PublicLayout activePath="home" onNavigate={onNavigate} isAuthenticated={isAuthenticated}>
      <div className="space-y-16 sm:space-y-24 py-4 sm:py-8">
        {/* 1. Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>국토교통부 실거래가 오픈 API 실시간 연동</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
            스마트한 아파트 실거래 데이터, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              MyHome에서 한눈에 확인하세요
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t.homeSubtitle ||
              "국토교통부 공공데이터 기반 실시간 시계열 분석, 지도 기반 시세 탐색, 조건별 즉시 알림 서비스를 제공합니다."}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <span>{t.navDashboard || "대시보드로 이동하기"}</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                    <path fill="#4285F4" d="M44.5 20H24v8.5h11.9C34.2 33.5 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l6.4-6.4C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-7.7 19.6-20 0-1.3-.1-2.7-.1-4z" />
                    <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.5 19.2 14 24 14c3.1 0 5.8 1.1 8 2.9l6.4-6.4C34.5 6.1 29.5 4 24 4c-7.8 0-14.4 4.6-17.7 10.7z" />
                    <path fill="#FBBC05" d="M24 44c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.4C29.6 35.4 27 36 24 36c-5.5 0-10.1-2.5-12-6.5l-7 5.4C8.6 41.3 15.8 44 24 44z" />
                    <path fill="#EA4335" d="M44.5 20H24v8.5h11.9c-1 2.7-2.9 4.9-5.4 6.5l6.5 5.4C41.4 36.4 44 30.9 44 24c0-1.3-.1-2.7-.5-4z" />
                  </svg>
                  <span>{t.startFreeWithGoogle || "Google 계정으로 시작하기"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate("login")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <span>이메일 로그인</span>
                </button>
              </>
            )}
          </div>
        </section>

        {/* 2. Key Highlights Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <TrendingUp size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t.feature1Title || "실시간 시계열 실거래가 분석"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.feature1Desc ||
                  "국토교통부 실거래가 오픈 API를 매일 동기화하여 단지별·면적별 신고가, 평단가 추이, 거래량 변화를 정밀한 차트로 시각화합니다."}
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-500" />
                <span>단지별 전용면적(㎡)별 시계열 차트 및 평단가 추세선</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-500" />
                <span>최고가/최저가 갭 및 월별 거래 빈도 집계</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <MapPin size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t.feature2Title || "카카오맵 기반 인터랙티브 지도 탐색"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.feature2Desc ||
                  "지도를 통해 주변 단지들의 시세 분포, 역세권 반경 내 거래가 현황 및 단지별 상세 건축물대장 정보를 직관적으로 탐색합니다."}
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>지하철역 반경(500m~1km) 내 아파트 실거래 비교</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>건축HUB 건축물대장 연동 (세대수, 주차대수, 용적률)</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <BellRing size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t.feature3Title || "스마트 관심 매물 & 맞춤 알림"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.feature3Desc ||
                  "원하는 지역, 가격대, 전용면적 조건을 설정해 두면 신규 실거래가 등록될 때 텔레그램, 디스코드 등으로 실시간 알림을 발송합니다."}
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500" />
                <span>새벽 자동 수집 엔진을 통한 무중단 감시</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500" />
                <span>신고가 갱신 및 급매 거래 발생 시 즉각 포착</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t.feature4Title || "철저한 데이터 보안 & 무광고 환경"}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.feature4Desc ||
                  "Google OAuth 기반의 안전한 2차 인증과 사용자 데이터 보호 원칙을 준수하며, 불필요한 광고나 상업적 스팸 없이 순수한 데이터만 제공합니다."}
              </p>
            </div>
            <ul className="mt-6 space-y-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-indigo-500" />
                <span>Google API 사용자 데이터 정책 100% 준수</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-indigo-500" />
                <span>2차 인증(OTP) 지원 및 강력한 세션 보안</span>
              </li>
            </ul>
          </div>
        </section>

        {/* 3. Google User Data Policy Compliance Banner */}
        <section className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-blue-950/40 dark:to-indigo-950/20 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.securityNoticeTitle || "Google 사용자 데이터 보호 원칙"}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {t.securityNoticeDesc ||
                  "MyHome은 Google API Services User Data Policy를 엄격히 준수합니다. 사용자의 인증 정보는 오직 로그인 및 맞춤 알림을 위해서만 사용되며, 제3자 제공, 판매 또는 AI 모델 학습에 일절 활용되지 않습니다."}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => onNavigate("privacy")}
                className="flex items-center gap-1.5 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors shadow-xs"
              >
                <span>개인정보처리방침 전문</span>
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("terms")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
              >
                <span>서비스 약관</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
export default HomePage;
