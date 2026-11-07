import React from "react";
import { FileText, ArrowLeft, AlertTriangle, ShieldCheck } from "lucide-react";
import { PublicLayout } from "../../components/public/PublicLayout";
import { useLocale } from "../../lib/i18n";

interface TermsPageProps {
  onNavigate: (route: "home" | "privacy" | "terms" | "login" | "dashboard") => void;
  isAuthenticated?: boolean;
}

export function TermsPage({ onNavigate, isAuthenticated }: TermsPageProps) {
  const { locale, t } = useLocale();

  return (
    <PublicLayout activePath="terms" onNavigate={onNavigate} isAuthenticated={isAuthenticated}>
      <div className="max-w-4xl mx-auto space-y-8 py-4 sm:py-8">
        {/* Back Link */}
        <div>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={14} />
            <span>{t.backToHome || "홈으로 돌아가기"}</span>
          </button>
        </div>

        {/* Title Header */}
        <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-100 dark:bg-blue-950/70 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <FileText size={14} />
            <span>Terms of Service</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {locale === "ko" ? "서비스 이용약관" : "Terms of Service"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t.effectiveDate || "시행일자: 2026년 1월 1일 (최종 개정: 2026년 11월 7일)"}
          </p>
        </div>

        {/* Disclaimer Notice */}
        <div className="rounded-2xl border border-amber-300/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 text-sm">
            <AlertTriangle size={18} />
            <span>
              {locale === "ko" ? "공공데이터 활용 및 투자 참고 목적의 면책 고지" : "Public Data & Investment Disclaimer"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/80 leading-relaxed">
            {locale === "ko"
              ? "MyHome에서 제공하는 아파트 실거래가, 통계 차트 및 알림 정보는 국토교통부 공공데이터포털의 공개 데이터를 바탕으로 가공된 정보입니다. 본 데이터는 부동산 매매 및 시장 파악을 위한 참고용 자료일 뿐이며, 어떠한 형태의 투자 권유나 법적 보증이 아닙니다. 실제 거래 및 투자 결정에 따른 책임은 이용자 본인에게 있습니다."
              : "All apartment transaction figures, graphs, and alert messages provided by MyHome are processed based on official open data from the Korea Ministry of Land, Infrastructure and Transport. This information is intended strictly for market research and reference purposes and does not constitute financial or legal advice."}
          </p>
        </div>

        {/* Terms Content */}
        {locale === "ko" ? (
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제1조 (목적)
              </h2>
              <p>
                본 약관은 MyHome(이하 &apos;서비스&apos;)이 제공하는 아파트 실거래가 분석 대시보드 및 관련 제반 서비스의
                이용과 관련하여 서비스와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제2조 (용어의 정의)
              </h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>
                  <strong>&apos;서비스&apos;:</strong> 국토교통부 실거래가 데이터 수집, 시계열 통계 차트, 지도 기반 단지 정보 탐색, 맞춤 알림 발송 등 MyHome이 제공하는 모든 기능.
                </li>
                <li>
                  <strong>&apos;회원&apos;:</strong> Google OAuth 계정 연동을 통해 본 약관에 동의하고 서비스를 이용하는 자.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제3조 (약관의 명시와 개정)
              </h2>
              <p>
                서비스는 본 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 홈페이지 하단 및 설정 화면에 게시합니다.
                약관을 개정할 경우 개정 사유와 적용 일자를 명시하여 사전 공지합니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제4조 (회원가입 및 Google 로그인 연동)
              </h2>
              <p>
                이용자는 Google 계정을 연동하여 회원으로 등록할 수 있습니다. Google 계정 정보가 타인에게 유출되지 않도록
                보호해야 하며, 계정 관리 소홀로 인해 발생하는 책임은 회원 본인에게 있습니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제5조 (서비스의 제공 및 변경)
              </h2>
              <p>서비스는 다음과 같은 업무를 수행합니다.</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                <li>국토교통부 아파트 매매 실거래가 정보의 정기적 수집 및 시계열 분석</li>
                <li>카카오맵을 연동한 단지별 위치 및 거래 가격 시각화</li>
                <li>사용자가 지정한 지역, 단지, 가격 조건에 대한 실시간 알림 전송</li>
                <li>기타 부동산 데이터 집계 및 검색 서비스</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제6조 (데이터의 출처 및 면책사항)
              </h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>
                  본 서비스가 제공하는 데이터는 국토교통부 실거래가 오픈 API 및 건축HUB 건축물대장 오픈 API를 기초로 집계됩니다.
                </li>
                <li>
                  공공기관의 데이터 갱신 시점, 계약 취소 건의 반영 지연, 네트워크 장애 등으로 인해 실제 계약 현황과 일부 오차가 발생할 수 있습니다.
                </li>
                <li>
                  서비스가 제공하는 수치와 차트는 투자 판단을 돕기 위한 참고자료이며, 매매 계약이나 금융 결정을 최종 확정하기 전에 국토교통부 실거래가 공개시스템 및 부동산등기부등본을 통해 직접 확인하시기 바랍니다.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제7조 (지식재산권 및 저작권)
              </h2>
              <p>
                서비스가 자체 제작한 UI 디자인, 차트 시각화 구성, 소스코드 및 상표권은 MyHome에 귀속됩니다.
                단, 공공데이터 자체에 대한 권리는 관계 법령에 따릅니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제8조 (준거법 및 관할법원)
              </h2>
              <p>
                본 약관의 해석 및 서비스 이용에 관한 분쟁은 대한민국 법률을 준거법으로 하며, 관할 법원은 민사소송법에 따릅니다.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                1. Purpose
              </h2>
              <p>
                These Terms of Service govern your access to and use of the MyHome apartment transaction analytics platform.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                2. User Account and Google OAuth
              </h2>
              <p>
                Access to the dashboard requires authentication via Google Sign-In. You are responsible for safeguarding your credentials.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                3. Disclaimer on Real Estate Data
              </h2>
              <p>
                Information provided is aggregated from open government APIs. It does not constitute formal real estate valuation or investment advice.
                MyHome assumes no liability for trading decisions made based on this service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                4. Governing Law
              </h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of the Republic of Korea.
              </p>
            </section>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
export default TermsPage;
