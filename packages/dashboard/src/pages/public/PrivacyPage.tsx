import React from "react";
import { Shield, Lock, FileCheck, CheckCircle2, Mail, ExternalLink, ArrowLeft } from "lucide-react";
import { PublicLayout } from "../../components/public/PublicLayout";
import { useLocale } from "../../lib/i18n";

interface PrivacyPageProps {
  onNavigate: (route: "home" | "privacy" | "terms" | "login" | "dashboard") => void;
  isAuthenticated?: boolean;
}

export function PrivacyPage({ onNavigate, isAuthenticated }: PrivacyPageProps) {
  const { locale, t } = useLocale();

  return (
    <PublicLayout activePath="privacy" onNavigate={onNavigate} isAuthenticated={isAuthenticated}>
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
            <Shield size={14} />
            <span>Privacy Policy</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {locale === "ko" ? "개인정보처리방침" : "Privacy Policy"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t.effectiveDate || "시행일자: 2026년 1월 1일 (최종 개정: 2026년 11월 7일)"}
          </p>
        </div>

        {/* Highlight Callout: Google User Data Policy Compliance */}
        <div className="rounded-2xl border-2 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/30 p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300 text-sm sm:text-base">
            <Lock size={18} />
            <span>
              {locale === "ko"
                ? "Google API 서비스 사용자 데이터 정책 준수 (Google User Data Policy)"
                : "Google API Services User Data Policy Compliance"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {locale === "ko" ? (
              <>
                MyHome은 Google OAuth를 통해 수집된 사용자의 정보를{" "}
                <strong>Google API Services User Data Policy(제한적 사용 요구사항 포함)</strong>에 따라 엄격하게 보호하고
                처리합니다. 수집된 Google 계정 정보는 절대 외부 제3자에게 판매하거나 상업적 광고 제공 목적으로 활용하지
                않으며, <strong>인공지능(AI) 및 머신러닝(ML) 모델 학습에 일절 사용되지 않습니다.</strong>
              </>
            ) : (
              <>
                MyHome strictly adheres to the{" "}
                <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements.
                Information received from Google APIs is never sold, never used for personalized advertising, and is{" "}
                <strong>never used to train artificial intelligence (AI) or machine learning (ML) models.</strong>
              </>
            )}
          </p>
        </div>

        {/* Policy Content */}
        {locale === "ko" ? (
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제1조 (목적)
              </h2>
              <p>
                MyHome(이하 &apos;서비스&apos;라 합니다)은 이용자의 개인정보를 매우 소중하게 생각하며,
                &apos;개인정보 보호법&apos; 및 관계 법령을 준수합니다. 본 개인정보처리방침은 서비스가 수집하는
                개인정보의 항목, 이용 목적, 보관 및 파기 절차, 이용자의 권리 및 구제 방법을 안내하기 위해 작성되었습니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제2조 (수집하는 개인정보 항목 및 수집 방법)
              </h2>
              <p>서비스는 회원가입 및 원활한 대시보드 서비스 제공을 위해 최소한의 정보만을 수집합니다.</p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">1. Google OAuth 인증을 통해 수집되는 항목</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li>필수 항목: 이메일 주소(Email), 고유 사용자 식별자(Google Account ID)</li>
                  <li>선택 항목: 프로필 이름(Name), 프로필 이미지 URL</li>
                </ul>
                <p className="font-semibold text-slate-800 dark:text-slate-200 pt-2">2. 서비스 이용 과정에서 자동 생성·수집되는 정보</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li>접속 일시, 접속 IP 주소, 브라우저 종류 및 OS 정보, 서비스 이용 및 조회 기록</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제3조 (개인정보의 처리 목적)
              </h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong>회원 관리 및 본인 확인:</strong> Google OAuth 로그인을 통한 회원 식별, 비인가 접근 차단 및 계정 보안</li>
                <li><strong>서비스 제공 및 운영:</strong> 아파트 실거래가 시계열 통계 조회, 지도 기반 시세 정보 제공, 관심 단지 등록</li>
                <li><strong>알림 발송:</strong> 이용자가 설정한 조건(지역, 가격, 면적)에 따른 신규 실거래 등록 알림 발송</li>
                <li><strong>서비스 개선 및 통계:</strong> 서비스 접속 통계 및 성능 최적화</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제4조 (Google 사용자 데이터의 처리 및 제한적 사용 원칙)
              </h2>
              <p>
                서비스는 Google API를 통해 획득한 데이터(Google User Data)에 대해 다음과 같은 제한적 사용(Limited Use) 요건을 엄격히 준수합니다.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>목적 외 사용 금지</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    사용자 대시보드 인증 및 사용자 본인이 요청한 알림 기능 외의 용도로 일절 사용하지 않습니다.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>제3자 비판매 & 비전송</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    수집된 정보를 어떠한 중개인, 광고주, 제3자에게도 판매, 대여 또는 이전하지 않습니다.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>AI / LLM 학습 활용 금지</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Google 사용자 데이터를 거대 언어 모델(LLM)이나 인공지능 알고리즘 훈련에 활용하지 않습니다.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>최소 권한(Scope) 원칙</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    이메일과 프로필 식별에 필요한 기본 스코프(openid, email, profile) 외 과도한 권한을 요청하지 않습니다.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제5조 (개인정보의 보유 및 이용 기간)
              </h2>
              <p>
                서비스는 원칙적으로 개인정보의 수집 및 이용 목적이 달성되면 지체 없이 해당 정보를 파기합니다.
                회원 탈퇴를 요청하거나 등록 계정 삭제 시 이용자의 개인정보 및 관심 설정 데이터는 데이터베이스에서 즉시 영구 삭제 처리됩니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제6조 (개인정보의 제3자 제공 및 처리위탁)
              </h2>
              <p>
                서비스는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하거나 외부에 위탁하지 않습니다.
                단, 법률에 특별한 규정이 있거나 수사기관의 적법한 절차에 따른 요청이 있는 경우는 예외로 합니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제7조 (이용자의 권리와 행사 방법)
              </h2>
              <p>
                이용자는 언제든지 등록되어 있는 본인의 개인정보에 대한 열람, 정정, 삭제, 처리정지 및 회원 탈퇴를 요청할 수 있습니다.
                Google 계정 보안 설정(https://myaccount.google.com/permissions)에서 언제든지 MyHome과의 연동 권한을 직접 철회하실 수 있습니다.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                제8조 (개인정보 보호책임자 및 문의처)
              </h2>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">MyHome 개인정보 보호책임자</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">책임자 / 개발팀: Heedo</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  문의 이메일:{" "}
                  <a href="mailto:heedo.dev@gmail.com" className="text-blue-600 dark:text-blue-400 underline">
                    heedo.dev@gmail.com
                  </a>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                  개인정보 처리 및 보안과 관련한 문의사항이나 데이터 삭제 요청은 위 이메일로 접수해 주시면 지체 없이 처리해 드립니다.
                </p>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-8 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                1. Overview & Purpose
              </h2>
              <p>
                MyHome (&quot;the Service&quot;) respects your privacy and is committed to protecting your personal information.
                This Privacy Policy explains what data we collect, how it is handled, and your rights concerning your personal information.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                2. Information We Collect
              </h2>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Information provided via Google OAuth</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li>Mandatory: Email address, Unique Google User Identifier</li>
                  <li>Optional: Full name, profile image URL</li>
                </ul>
                <p className="font-semibold text-slate-800 dark:text-slate-200 pt-2">Automatically Generated Logs</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-2">
                  <li>Access timestamps, IP addresses, browser and OS user agents, audit logs</li>
                </ul>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                3. How We Use Information
              </h2>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong>Authentication & Security:</strong> Verifying identity via Google Sign-In and preventing unauthorized access.</li>
                <li><strong>Service Delivery:</strong> Providing apartment transaction time-series statistics, maps, and watchlists.</li>
                <li><strong>Notifications:</strong> Delivering real-time alerts for configured criteria.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                4. Compliance with Google API Services User Data Policy
              </h2>
              <p>
                MyHome strictly follows Google&apos;s Limited Use requirements:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-slate-600 dark:text-slate-400">
                <li>We do not transfer or disclose Google user data to third parties.</li>
                <li>We do not sell Google user data under any circumstances.</li>
                <li>We do not use Google user data for advertising purposes.</li>
                <li>We do not use Google user data to train AI or machine learning models.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                5. Data Retention and Deletion
              </h2>
              <p>
                User data is retained only as long as your account is active. Upon account deletion or user request,
                all associated personal records and watchlists are permanently erased.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-l-4 border-blue-600 pl-3">
                6. Contact & Data Protection Officer
              </h2>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-1">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Data Protection Lead: Heedo (MyHome Engineering)
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Email:{" "}
                  <a href="mailto:heedo.dev@gmail.com" className="text-blue-600 dark:text-blue-400 underline">
                    heedo.dev@gmail.com
                  </a>
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
export default PrivacyPage;
