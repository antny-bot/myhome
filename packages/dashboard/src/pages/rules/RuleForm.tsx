import React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  History,
  MapPin,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { RegionSearchInput } from "../../components/RegionSearchInput.js";
import { SectionCard } from "../../components/SectionCard.js";
import { TelegramGuideModal } from "../../components/TelegramGuideModal.js";
import { classNames } from "../../lib/format.js";
import { useLocale } from "../../lib/i18n.js";
import type { ComparisonCriteria, WatchRule } from "../../types.js";
import { RuleFormStepComplex } from "./RuleFormStepComplex.js";
import { ALERT_TIME_OPTIONS } from "./types.js";
import { useRuleForm } from "./useRuleForm.js";

interface RuleFormProps {
  editingRule?: WatchRule;
  initData?: { regionName: string; regionCode?: string; apartmentKeywords: string[] } | null;
  clearInitData?: () => void;
  onSave: () => void;
  onCancel: () => void;
  isAdmin?: boolean;
  currentRulesCount?: number;
}

export function RuleForm(props: RuleFormProps) {
  const { editingRule, onCancel, isAdmin = false, currentRulesCount = 0 } = props;
  const { t, locale } = useLocale();

  const {
    step,
    setStep,
    form,
    setForm,
    saving,
    searching,
    lawdCode,
    resolvedRegionName,
    error,
    complexQuery,
    setComplexQuery,
    showComplexDropdown,
    setShowComplexDropdown,
    activeAptIndex,
    setActiveAptIndex,
    searchingComplexes,
    filteredApts,
    selectRegion,
    handleSearch,
    toggleApt,
    handleAddCustomApt,
    submit,
    isTelegramGuideOpen,
    setIsTelegramGuideOpen,
  } = useRuleForm(props);

  const comparisonLabels: Record<ComparisonCriteria, string> = {
    none: t.comparisonCriteriaNone,
    parking: t.comparisonCriteriaParking,
    large_complex: t.comparisonCriteriaLargeComplex,
    transit: t.comparisonCriteriaTransit,
    newer: t.comparisonCriteriaNewer,
    livability: t.comparisonCriteriaLivability,
  };

  return (
    <SectionCard
      title={editingRule ? t.ruleFormEdit : t.ruleFormCreate}
      right={
        editingRule && (
          <button onClick={onCancel} className="text-neutral hover:text-strong transition-colors">
            <X className="h-5 w-5" />
          </button>
        )
      }
    >
      <div className="space-y-6">
        {!isAdmin && !editingRule && (
          <div className="mx-2 sm:mx-6 bg-primary/5 border border-primary/10 rounded-xl p-3 text-[11px] text-primary font-bold flex justify-between items-center animate-in fade-in duration-300">
            <span>💡 일반 사용자는 알림 규칙을 최대 5개까지 생성할 수 있습니다.</span>
            <span className="bg-primary/15 px-2.5 py-0.5 rounded-full text-xs">
              {currentRulesCount} / 5개
            </span>
          </div>
        )}

        {/* Step Wizard Stepper */}
        <div className="mb-6 flex items-center justify-between px-2 sm:px-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-1.5 z-10">
                <div
                  className={classNames(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300",
                    step === s
                      ? "bg-primary text-white ring-4 ring-primary/20 scale-105"
                      : step > s
                        ? "bg-emerald-500 text-white"
                        : "bg-alternative border border-normal text-neutral"
                  )}
                >
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
                <span
                  className={classNames(
                    "text-[10px] font-bold tracking-tight mt-1",
                    step === s ? "text-primary" : "text-neutral"
                  )}
                >
                  {s === 1 ? t.regionSearch : s === 2 ? t.aptSelect : t.buttonNext}
                </span>
              </div>
              {s < 3 && (
                <div
                  className={classNames(
                    "h-[2px] flex-1 -mt-6 mx-2 transition-all duration-300",
                    step > s ? "bg-emerald-500" : "bg-normal"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-semibold text-strong">{t.ruleName}</span>
                <input
                  className="h-8 w-full rounded-lg border border-normal bg-normal px-2.5 text-xs text-strong focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder={t.ruleNamePlaceholder}
                />
              </label>
              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-semibold text-strong">{t.regionSearch}</span>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <RegionSearchInput
                      value={form.regionName}
                      onChange={(value) => setForm({ ...form, regionName: value })}
                      onSelect={selectRegion}
                      className="h-8 w-full rounded-lg border border-normal bg-normal px-2.5 text-xs text-strong focus:border-primary outline-none"
                    />
                    {resolvedRegionName && lawdCode && (
                      <p className="flex items-center gap-1 text-[10px] text-primary font-semibold mt-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {resolvedRegionName}
                        <span className="text-assistive font-normal">({lawdCode})</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || !form.regionName.trim()}
                    className="h-8 rounded-lg bg-primary px-3 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                  >
                    {searching ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    {t.searchButton}
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          </div>
        )}

        {step === 2 && (
          <RuleFormStepComplex
            form={form}
            complexQuery={complexQuery}
            setComplexQuery={setComplexQuery}
            showComplexDropdown={showComplexDropdown}
            setShowComplexDropdown={setShowComplexDropdown}
            activeAptIndex={activeAptIndex}
            setActiveAptIndex={setActiveAptIndex}
            searchingComplexes={searchingComplexes}
            filteredApts={filteredApts}
            toggleApt={toggleApt}
            handleAddCustomApt={handleAddCustomApt}
            setStep={setStep}
          />
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-strong">{t.priceRangeLabel}</span>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong focus:border-primary outline-none"
                    type="number"
                    step="0.1"
                    value={form.minPriceEok ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, minPriceEok: event.target.value ? Number(event.target.value) : undefined })
                    }
                    placeholder={t.priceMinPlaceholder}
                  />
                  <span className="text-neutral">~</span>
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong focus:border-primary outline-none"
                    type="number"
                    step="0.1"
                    value={form.maxPriceEok ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, maxPriceEok: event.target.value ? Number(event.target.value) : undefined })
                    }
                    placeholder={t.priceMaxPlaceholder}
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-strong">{t.areaRangeLabel}</span>
                  <span className="text-[10px] text-neutral font-medium">
                    {form.minArea ? `${Math.round(form.minArea / 3.3)}평` : "0평"} ~{" "}
                    {form.maxArea ? `${Math.round(form.maxArea / 3.3)}평` : "무제한"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong focus:border-primary outline-none"
                    type="number"
                    step="1"
                    value={form.minArea ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, minArea: event.target.value ? Number(event.target.value) : undefined })
                    }
                    placeholder={t.areaMinPlaceholder}
                  />
                  <span className="text-neutral">~</span>
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong focus:border-primary outline-none"
                    type="number"
                    step="1"
                    value={form.maxArea ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, maxArea: event.target.value ? Number(event.target.value) : undefined })
                    }
                    placeholder={t.areaMaxPlaceholder}
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-strong">{t.comparisonCriteria}</span>
                <select
                  className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong focus:border-primary outline-none appearance-none"
                  value={form.comparisonCriteria}
                  onChange={(event) =>
                    setForm({ ...form, comparisonCriteria: event.target.value as ComparisonCriteria })
                  }
                >
                  {Object.entries(comparisonLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-strong">{t.checkInterval}</span>
                <select
                  className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong focus:border-primary outline-none appearance-none"
                  value={form.alertTime || "09:00"}
                  onChange={(event) => setForm({ ...form, alertTime: event.target.value })}
                >
                  {ALERT_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {locale === "ko" ? opt.label : opt.labelEn}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-1.5 sm:col-span-2 flex items-end">
                <p className="text-xs text-neutral leading-relaxed flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 shrink-0" />
                  {t.checkIntervalNote}
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-strong">{t.alertChannels}</span>
                  <button
                    type="button"
                    onClick={() => setIsTelegramGuideOpen(true)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    <HelpCircle size={13} />
                    <span>설정 가이드</span>
                  </button>
                </div>
                <div className="flex gap-4 p-3 rounded-lg border border-normal/30 bg-alternative/50">
                  <label className="flex items-center gap-2 text-sm text-neutral cursor-pointer select-none">
                    <input type="checkbox" checked readOnly disabled className="h-4 w-4 rounded text-primary" />
                    {t.channelTelegram}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-normal text-primary focus:ring-primary"
                      checked={form.channels.includes("kakao")}
                      onChange={(event) => {
                        setForm({
                          ...form,
                          channels: event.target.checked ? ["telegram", "kakao"] : ["telegram"],
                        });
                      }}
                    />
                    {t.channelKakao}
                  </label>
                </div>
                <p className="text-[10px] text-neutral/80 mt-1">
                  *{" "}
                  {locale === "ko"
                    ? "텔레그램 봇 토큰 및 대화방 ID 설정은 좌측 메뉴 [환경 설정]에서 개인별로 등록할 수 있습니다."
                    : "Telegram Bot Token and Chat ID can be configured personally in the [Settings] menu."}
                </p>
              </div>
            </div>

            {error && <p className="text-xs text-warn font-bold mt-2">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-lg border border-normal px-4 py-2.5 text-sm font-bold text-strong hover:bg-alternative transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> {t.buttonPrev}
              </button>
              <form onSubmit={submit} className="flex-[2]">
                <button
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95 disabled:bg-slate-400 disabled:shadow-none"
                  disabled={saving || (!isAdmin && !editingRule && currentRulesCount >= 5)}
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {saving ? t.buttonSaveProgress : editingRule ? t.buttonSaveComplete : t.buttonSave}
                </button>
              </form>
            </div>
            {!isAdmin && !editingRule && currentRulesCount >= 5 && (
              <p className="text-[10px] text-warn font-semibold text-center mt-2">
                ⚠️ 최대 5개의 규칙만 등록 가능하여 신규 추가가 제한됩니다. (현재: {currentRulesCount}/5개)
              </p>
            )}
          </div>
        )}
        <TelegramGuideModal
          isOpen={isTelegramGuideOpen}
          onClose={() => setIsTelegramGuideOpen(false)}
          locale={locale}
        />
      </div>
    </SectionCard>
  );
}
