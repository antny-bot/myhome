import React, { useState } from "react";
import { Bell, ChevronRight, ShieldAlert } from "lucide-react";
import { PageHeader } from "../../components/PageHeader.js";
import { TelegramGuideModal } from "../../components/TelegramGuideModal.js";
import { useLocale } from "../../lib/i18n.js";
import type { DashboardState, WatchRule } from "../../types.js";
import { RuleForm } from "./RuleForm.js";
import { RuleList } from "./RuleList.js";

interface RulesPageProps {
  state: DashboardState | undefined;
  onChanged: () => void;
  initData?: { regionName: string; regionCode?: string; apartmentKeywords: string[] } | null;
  clearInitData?: () => void;
  onNavigate?: (view: any) => void;
  isAdmin?: boolean;
}

export function RulesPage({
  state,
  onChanged,
  initData,
  clearInitData,
  onNavigate,
  isAdmin = false,
}: RulesPageProps) {
  const { t, locale } = useLocale();
  const [editingRule, setEditingRule] = useState<WatchRule | undefined>();
  const [isTelegramGuideOpen, setIsTelegramGuideOpen] = useState(false);

  const telegramNotConfigured = state && !state.config.telegramConfigured;

  return (
    <div className="space-y-6">
      <PageHeader title={t.rulesTitle} subtitle={t.rulesSubtitle} icon={Bell} />

      {telegramNotConfigured ? (
        <div className="rounded-xl border border-warn bg-warn/5 p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-warn/10 text-warn rounded-xl shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1.5">
              <h3 className="text-sm font-bold text-strong">📬 텔레그램 알림 채널 미설정</h3>
              <p className="text-xs text-neutral leading-relaxed">
                실거래가 감시 조건 충족 시 실시간 알림을 수신하기 위한 텔레그램 연동이 설정되지 않았습니다.
                <br />
                알림 규칙을 등록하고 실행하기 전에 텔레그램 봇 토큰 및 대화방 ID를 먼저 입력해야 알림을 정상적으로
                수신하실 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pl-0 sm:pl-12 pt-2">
            <button
              onClick={() => onNavigate?.("settings")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/10"
            >
              <span>환경 설정으로 이동하여 등록하기</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsTelegramGuideOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-normal bg-normal hover:bg-alternative text-strong text-xs font-bold rounded-lg transition-colors"
            >
              <span>설정 방법 가이드 보기</span>
            </button>
          </div>
          <TelegramGuideModal
            isOpen={isTelegramGuideOpen}
            onClose={() => setIsTelegramGuideOpen(false)}
            locale={locale}
          />
        </div>
      ) : (
        <>
          <RuleForm
            editingRule={editingRule}
            initData={initData}
            clearInitData={clearInitData}
            onSave={() => {
              setEditingRule(undefined);
              onChanged();
            }}
            onCancel={() => setEditingRule(undefined)}
            isAdmin={isAdmin}
            currentRulesCount={state?.rules.length ?? 0}
          />

          <div>
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-strong tracking-tight">{t.ruleListTitle}</h2>
              <span className="text-xs font-bold text-neutral bg-elevated border border-normal px-2 py-0.5 rounded-full">
                {state?.rules.length ?? 0}
                {t.unitCount}
              </span>
            </div>
            <RuleList
              rules={state?.rules ?? []}
              onChanged={onChanged}
              onEdit={(rule) => {
                setEditingRule(rule);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export { RuleForm } from "./RuleForm.js";
export { RuleList } from "./RuleList.js";
export * from "./types.js";
