import React, { useState } from "react";
import { History, Pencil, Play, RefreshCw, Trash2 } from "lucide-react";
import { deleteRule, logActivity, patchRule, runRule } from "../../api.js";
import { classNames, formatDate } from "../../lib/format.js";
import { useLocale } from "../../lib/i18n.js";
import type { ComparisonCriteria, WatchRule } from "../../types.js";

interface RuleListProps {
  rules: WatchRule[];
  onChanged: () => void;
  onEdit: (rule: WatchRule) => void;
}

export function RuleList({ rules, onChanged, onEdit }: RuleListProps) {
  const { t, locale } = useLocale();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const comparisonLabels: Record<ComparisonCriteria, string> = {
    none: t.comparisonCriteriaNone,
    parking: t.comparisonCriteriaParking,
    large_complex: t.comparisonCriteriaLargeComplex,
    transit: t.comparisonCriteriaTransit,
    newer: t.comparisonCriteriaNewer,
    livability: t.comparisonCriteriaLivability,
  };

  async function run(id: string) {
    setBusyId(id);
    setError("");
    try {
      await runRule(id);
      const rule = rules.find((r) => r.id === id);
      void logActivity("rule_test", `알림 규칙 즉시 실행 테스트: ${rule?.name || id}`, { ruleId: id });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "체크 실행에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    try {
      const rule = rules.find((r) => r.id === id);
      await deleteRule(id);
      void logActivity("rule_delete", `알림 규칙 삭제: ${rule?.name || id}`, { ruleId: id });
      onChanged();
    } catch {
      setError("삭제에 실패했습니다.");
    }
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-normal bg-elevated p-10 text-center text-sm text-neutral">
        {t.noRules}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 font-medium">
          {error}
        </p>
      )}
      {rules.map((rule) => {
        const keywordLen = rule.apartmentKeywords?.length ?? 0;
        return (
          <article
            key={rule.id}
            className="rounded-xl border border-normal bg-elevated p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-strong truncate">{rule.name}</h3>
                  {!rule.enabled && (
                    <span className="bg-alternative text-neutral px-1.5 py-0.5 rounded text-[10px] font-bold border border-normal">
                      {t.ruleSuspended}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral">
                  <span className="font-semibold text-strong bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {rule.regionName}
                  </span>
                  {rule.apartmentKeywords && keywordLen > 0 ? (
                    <span className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-bold border border-primary/10">
                      {keywordLen === 1
                        ? rule.apartmentKeywords[0]
                        : locale === "ko"
                          ? `${rule.apartmentKeywords[0]} 외 ${keywordLen - 1}곳`
                          : `${rule.apartmentKeywords[0]} & ${keywordLen - 1} others`}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-primary/5 text-primary px-1.5 py-0.5 rounded font-bold border border-primary/10">
                      {t.ruleAllComplexes}
                    </span>
                  )}

                  <span className="text-[10px] bg-blue-500/5 text-blue-500 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold border border-blue-500/10">
                    {locale === "ko"
                      ? `${rule.minPriceEok ?? 0}억~${rule.maxPriceEok ? rule.maxPriceEok + "억" : t.ruleUnlimited}`
                      : `${rule.minPriceEok ?? 0} Eok ~ ${rule.maxPriceEok ? rule.maxPriceEok + " Eok" : t.ruleUnlimited}`}
                  </span>

                  {(rule.minArea !== undefined || rule.maxArea !== undefined) && (
                    <span className="text-[10px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
                      {rule.minArea ?? 0}㎡ ~ {rule.maxArea ? rule.maxArea + "㎡" : t.ruleUnlimited}
                      <span className="text-[9px] font-normal ml-1">
                        ({rule.minArea ? Math.round(rule.minArea / 3.3) : 0}평~
                        {rule.maxArea ? Math.round(rule.maxArea / 3.3) : "무제한"})
                      </span>
                    </span>
                  )}

                  <span className="text-[10px] text-neutral bg-alternative/60 px-1.5 py-0.5 rounded border border-normal/50 font-medium">
                    {t.ruleRecentTrack}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral">
                  <span className="bg-alternative border border-normal px-1.5 py-0.5 rounded leading-none">
                    {comparisonLabels[rule.comparisonCriteria]}
                  </span>
                  <span>
                    {locale === "ko" ? `${rule.alertTime || "09:00"} 알림` : `Alert at ${rule.alertTime || "09:00"}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <History className="h-3 w-3" /> {formatDate(rule.lastCheckedAt)} {t.ruleLastChecked}
                  </span>
                </div>
              </div>
              <div className="w-full sm:w-auto flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-normal/40 shrink-0">
                <button
                  className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-neutral hover:bg-alternative hover:text-strong rounded-lg transition-colors"
                  title={t.ruleEdit}
                  onClick={() => onEdit(rule)}
                >
                  <Pencil className="h-4.5 w-4.5" />
                </button>
                <button
                  className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-neutral hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                  title={t.ruleDelete}
                  onClick={() => remove(rule.id)}
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
                <div className="h-6 w-px bg-line/20 mx-1 hidden sm:block" />
                <button
                  className={classNames(
                    "px-3.5 py-2 text-xs font-bold rounded-lg transition-all border",
                    rule.enabled
                      ? "bg-elevated border-normal text-strong hover:bg-alternative"
                      : "bg-primary border-primary text-white hover:opacity-90 active:scale-95"
                  )}
                  onClick={async () => {
                    const nextEnabled = !rule.enabled;
                    await patchRule(rule.id, { enabled: nextEnabled });
                    void logActivity(
                      "rule_update",
                      `알림 규칙 상태 변경 (${nextEnabled ? "활성화" : "일시정지"}): ${rule.name}`,
                      { ruleId: rule.id, enabled: nextEnabled }
                    );
                    onChanged();
                  }}
                >
                  {rule.enabled ? t.rulePause : t.ruleResume}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 bg-strong px-4 py-2 text-xs font-bold text-normal rounded-lg disabled:opacity-60 hover:opacity-90 transition-all active:scale-95"
                  disabled={busyId === rule.id || !rule.enabled}
                  onClick={() => void run(rule.id)}
                >
                  {busyId === rule.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {busyId === rule.id ? t.ruleRunProgress : t.ruleRunNow}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
