import React, { useState } from "react";
import { Info, GitCommit, Calendar, Tag, Copy, Check, ExternalLink, ShieldCheck, FileText, Home, Smartphone, Globe } from "lucide-react";
import { SectionCard } from "./SectionCard";
import { APP_VERSION, COMMIT_HASH, BUILD_TIME, formatBuildDate, getFullVersionString } from "../version";
import { useLocale } from "../lib/i18n";
import { classNames } from "../lib/format";

export function SettingsAboutSection() {
  const { t } = useLocale();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      });
    }
  };

  const isStandalone = typeof window !== "undefined" && (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Hero Service Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-normal bg-elevated p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/logo.svg"
              alt="MyHome Logo"
              className="h-14 w-14 rounded-2xl shadow-md border border-normal shrink-0"
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-strong tracking-tight">MY HOME</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  v{APP_VERSION}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-surface-2 text-neutral border border-normal">
                  <GitCommit size={12} />
                  {COMMIT_HASH}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-neutral leading-relaxed max-w-xl">
                {t.aboutDescription || "국토교통부 실거래가 공개시스템 데이터를 기반으로 실거래 통계 집계, 시계열 추이 분석 및 조건별 알림을 제공하는 스마트 부동산 대시보드입니다."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Version and Build Information */}
      <SectionCard
        title={t.aboutTitle || "버전 및 빌드 정보"}
        right={
          <button
            type="button"
            onClick={() => handleCopy(getFullVersionString(), "full")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-normal bg-alternative hover:bg-surface-2 text-neutral hover:text-strong transition-colors"
          >
            {copiedKey === "full" ? (
              <>
                <Check size={13} className="text-emerald-500" />
                <span className="text-emerald-500">{t.aboutCopied || "복사됨"}</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>{t.aboutCopy || "버전 정보 복사"}</span>
              </>
            )}
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* App Version */}
          <div className="p-4 rounded-xl border border-normal bg-alternative/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral mb-2">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Tag size={14} />
                {t.aboutVersion || "애플리케이션 버전"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-strong font-mono">v{APP_VERSION}</span>
              <button
                type="button"
                onClick={() => handleCopy(`v${APP_VERSION}`, "version")}
                className="text-neutral hover:text-strong p-1 rounded hover:bg-alternative transition-colors"
                title={t.aboutCopy || "복사"}
              >
                {copiedKey === "version" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Git Commit */}
          <div className="p-4 rounded-xl border border-normal bg-alternative/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral mb-2">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <GitCommit size={14} />
                {t.aboutCommit || "커밋 해시"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-strong font-mono truncate mr-2" title={COMMIT_HASH}>
                {COMMIT_HASH}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(COMMIT_HASH, "commit")}
                className="text-neutral hover:text-strong p-1 rounded hover:bg-alternative transition-colors shrink-0"
                title={t.aboutCopy || "복사"}
              >
                {copiedKey === "commit" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Build Date */}
          <div className="p-4 rounded-xl border border-normal bg-alternative/30 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-neutral mb-2">
              <span className="text-xs font-medium flex items-center gap-1.5">
                <Calendar size={14} />
                {t.aboutBuildDate || "빌드 일시"}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold text-strong font-mono">
                {formatBuildDate(BUILD_TIME)}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(formatBuildDate(BUILD_TIME), "buildTime")}
                className="text-neutral hover:text-strong p-1 rounded hover:bg-alternative transition-colors"
                title={t.aboutCopy || "복사"}
              >
                {copiedKey === "buildTime" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Environment and Runtime Details */}
      <SectionCard title={t.aboutEnvironment || "실행 환경"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-normal bg-alternative/20 flex items-center gap-3.5">
            <div className={classNames(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              isStandalone ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-sky-500/10 text-sky-600 dark:text-sky-400"
            )}>
              {isStandalone ? <Smartphone size={20} /> : <Globe size={20} />}
            </div>
            <div>
              <p className="text-xs text-neutral">{t.aboutPwaMode || "앱 실행 형태"}</p>
              <p className="text-sm font-bold text-strong mt-0.5">
                {isStandalone
                  ? (t.aboutPwaStandalone || "독립 실행형 앱 (PWA)")
                  : (t.aboutPwaBrowser || "웹 브라우저")}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-normal bg-alternative/20 flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Info size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-neutral">{t.aboutSystemInfo || "데이터 소스"}</p>
              <p className="text-sm font-bold text-strong mt-0.5 truncate">
                {t.sourceNote || "국토교통부 실거래가 공개시스템"}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Quick Links & Legal */}
      <SectionCard title={t.aboutLinks || "바로가기"}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/"
            className="flex items-center justify-between p-3.5 rounded-xl border border-normal bg-alternative/20 hover:bg-alternative/60 hover:border-primary/40 transition-colors text-strong font-medium text-xs group"
          >
            <span className="flex items-center gap-2">
              <Home size={15} className="text-neutral group-hover:text-primary transition-colors" />
              <span>{t.aboutHomepage || "홈페이지 (소개)"}</span>
            </span>
            <ExternalLink size={13} className="text-neutral/60 group-hover:text-primary transition-colors" />
          </a>

          <a
            href="/privacy"
            className="flex items-center justify-between p-3.5 rounded-xl border border-normal bg-alternative/20 hover:bg-alternative/60 hover:border-primary/40 transition-colors text-strong font-medium text-xs group"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-neutral group-hover:text-primary transition-colors" />
              <span>{t.aboutPrivacy || "개인정보처리방침"}</span>
            </span>
            <ExternalLink size={13} className="text-neutral/60 group-hover:text-primary transition-colors" />
          </a>

          <a
            href="/terms"
            className="flex items-center justify-between p-3.5 rounded-xl border border-normal bg-alternative/20 hover:bg-alternative/60 hover:border-primary/40 transition-colors text-strong font-medium text-xs group"
          >
            <span className="flex items-center gap-2">
              <FileText size={15} className="text-neutral group-hover:text-primary transition-colors" />
              <span>{t.aboutTerms || "이용약관"}</span>
            </span>
            <ExternalLink size={13} className="text-neutral/60 group-hover:text-primary transition-colors" />
          </a>
        </div>

        <div className="mt-4 pt-4 border-t border-normal text-center text-xs text-neutral">
          <p>© 2025-2026 MyHome. All rights reserved.</p>
        </div>
      </SectionCard>
    </div>
  );
}
