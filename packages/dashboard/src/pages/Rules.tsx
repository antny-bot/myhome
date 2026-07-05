import { Check, ChevronLeft, ChevronRight, History, Pencil, Play, RefreshCw, Search, Send, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRule, deleteRule, getApartments, patchRule, runRule, searchRegions } from "../api";

import { RegionSearchInput } from "../components/RegionSearchInput";
import { SectionCard } from "../components/SectionCard";
import { classNames, formatDate } from "../lib/format";
import type { ComparisonCriteria, DashboardState, RegionSearchResult, RuleInput, WatchRule } from "../types";

const initialForm: RuleInput = {
  name: "관심 지역 실거래가 체크",
  regionName: "",
  apartmentKeywords: [],
  minPriceEok: undefined,
  maxPriceEok: 15,
  comparisonCriteria: "none",
  intervalMinutes: 720,
  channels: ["telegram"],
  enabled: true
};

const comparisonLabels: Record<ComparisonCriteria, string> = {
  none: "가격 조건만",
  parking: "주차 우선",
  large_complex: "대단지 우선",
  transit: "교통 우선",
  newer: "신축/연식 우선",
  livability: "생활편의성 우선"
};

function RuleForm({
  editingRule,
  onSave,
  onCancel
}: {
  editingRule?: WatchRule;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RuleInput>(initialForm);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingApts, setLoadingApts] = useState(false);
  const [aptList, setAptList] = useState<string[]>([]);
  const [lawdCode, setLawdCode] = useState("");
  const [error, setError] = useState("");
  const [aptSearchQuery, setAptSearchQuery] = useState("");

  const filteredApts = useMemo(() => {
    const q = aptSearchQuery.trim().toLowerCase();
    if (!q) return aptList;
    return aptList.filter(name => name.toLowerCase().includes(q));
  }, [aptList, aptSearchQuery]);

  useEffect(() => {
    if (editingRule) {
      setForm({
        name: editingRule.name,
        regionName: editingRule.regionName,
        apartmentKeywords: editingRule.apartmentKeywords ?? [],
        minPriceEok: editingRule.minPriceEok,
        maxPriceEok: editingRule.maxPriceEok,
        comparisonCriteria: editingRule.comparisonCriteria,
        intervalMinutes: editingRule.intervalMinutes,
        channels: editingRule.channels,
        enabled: editingRule.enabled
      });
      setLawdCode(editingRule.regionCode ?? "");
      setStep(1);
    } else {
      setForm(initialForm);
      setLawdCode("");
      setStep(1);
    }
  }, [editingRule]);

  useEffect(() => {
    if (!lawdCode) {
      setAptList([]);
      return;
    }
    void fetchApts(lawdCode);
  }, [lawdCode]);

  const fetchApts = async (code: string) => {
    setLoadingApts(true);
    try {
      const list = await getApartments(code);
      setAptList(list);
    } catch (err) {
      console.error("Failed to fetch apartments:", err);
      setAptList([]);
    } finally {
      setLoadingApts(false);
    }
  };

  function selectRegion(item: RegionSearchResult) {
    setForm(prev => ({ ...prev, regionName: item.displayName }));
    setLawdCode(item.lawdCode);
    setError("");
    setStep(2);
  }

  async function handleSearch() {
    if (!form.regionName.trim()) return;
    setSearching(true);
    setError("");
    try {
      const results = await searchRegions(form.regionName);
      if (results.length > 0) {
        const bestMatch = results[0];
        setForm(prev => ({ ...prev, regionName: bestMatch.displayName }));
        setLawdCode(bestMatch.lawdCode);
        setStep(2);
      } else {
        setError("검색된 지역이 없습니다. 정확한 구/군 이름을 입력해 주세요.");
        setLawdCode("");
      }
    } catch (err) {
      setError("지역 검색에 실패했습니다.");
      setLawdCode("");
    } finally {
      setSearching(false);
    }
  }

  const toggleApt = (name: string) => {
    const current = form.apartmentKeywords ?? [];
    if (current.includes(name)) {
      setForm({ ...form, apartmentKeywords: current.filter(n => n !== name) });
    } else {
      setForm({ ...form, apartmentKeywords: [...current, name] });
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingRule) {
        await patchRule(editingRule.id, form);
      } else {
        await createRule(form);
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionCard
      title={editingRule ? "관심 조건 수정" : "관심 조건 만들기"}
      subtitle={`Step ${step} / 3`}
      right={
        editingRule && (
          <button onClick={onCancel} className="text-neutral hover:text-strong transition-colors">
            <X className="h-5 w-5" />
          </button>
        )
      }
    >
      <div className="space-y-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-semibold text-strong">조건 이름</span>
                <input
                  className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="예: 우리 집 주변 급매 체크"
                />
              </label>
              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-sm font-semibold text-strong">지역명 검색</span>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <RegionSearchInput
                      value={form.regionName}
                      onChange={(value) => setForm({ ...form, regionName: value })}
                      onSelect={selectRegion}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || !form.regionName.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm shadow-blue-500/20"
                  >
                    {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    검색
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-strong">{form.regionName} 아파트 단지 선택</h3>
                <p className="text-xs text-neutral mt-0.5">원하는 단지를 모두 선택해 주세요 (미선택 시 전체 조회)</p>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {aptList.length}개 발견
              </span>
            </div>

            <div className="relative">
              <input
                className="w-full rounded-lg border border-normal bg-normal px-10 py-2.5 text-sm text-strong focus:border-primary outline-none"
                value={aptSearchQuery}
                onChange={(e) => setAptSearchQuery(e.target.value)}
                placeholder="단지명으로 필터링..."
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral" />
              {loadingApts && <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral" />}
            </div>

            <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border border-normal/30 rounded-lg">
              {filteredApts.length > 0 ? (
                filteredApts.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleApt(name)}
                    className={classNames(
                      "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left border",
                      form.apartmentKeywords?.includes(name)
                        ? "bg-primary/5 border-primary text-primary shadow-sm"
                        : "bg-normal border-normal text-neutral hover:bg-alternative"
                    )}
                  >
                    <span className="truncate">{name}</span>
                    {form.apartmentKeywords?.includes(name) && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))
              ) : (
                <div className="col-span-full py-10 text-center">
                  <p className="text-sm text-neutral">{loadingApts ? "불러오는 중..." : "결과가 없습니다."}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-lg border border-normal px-4 py-2.5 text-sm font-bold text-strong hover:bg-alternative transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> 이전
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-[2] rounded-lg bg-strong px-4 py-2.5 text-sm font-bold text-normal hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                다음 단계 <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-strong">가격 범위 (억)</span>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong focus:border-primary outline-none"
                    type="number"
                    step="0.1"
                    value={form.minPriceEok ?? ""}
                    onChange={(event) =>
                      setForm({ ...form, minPriceEok: event.target.value ? Number(event.target.value) : undefined })
                    }
                    placeholder="최소"
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
                    placeholder="최대"
                  />
                </div>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-strong">비교 기준</span>
                <select
                  className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong focus:border-primary outline-none appearance-none"
                  value={form.comparisonCriteria}
                  onChange={(event) => setForm({ ...form, comparisonCriteria: event.target.value as ComparisonCriteria })}
                >
                  {Object.entries(comparisonLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-strong">체크 주기(분)</span>
                <input
                  className="w-full rounded-lg border border-normal bg-normal px-4 py-2 text-sm text-strong focus:border-primary outline-none"
                  type="number"
                  min={10}
                  value={form.intervalMinutes}
                  onChange={(event) => setForm({ ...form, intervalMinutes: Number(event.target.value) })}
                />
              </label>

              <div className="space-y-1.5 sm:col-span-2 flex items-end">
                <p className="text-xs text-neutral leading-relaxed flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 shrink-0" />
                  최근 거래(이번 달 + 지난 달)를 자동으로 추적합니다. 별도로 기준 월을 입력할 필요 없습니다.
                </p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                 <span className="text-sm font-semibold text-strong">알림 채널</span>
                 <div className="flex gap-4 p-3 rounded-lg border border-normal/30 bg-alternative/50">
                    <label className="flex items-center gap-2 text-sm text-neutral cursor-pointer select-none">
                      <input type="checkbox" checked readOnly disabled className="h-4 w-4 rounded text-primary" />
                      텔레그램 (기본)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-normal text-primary focus:ring-primary"
                        checked={form.channels.includes("kakao")}
                        onChange={(event) => {
                          setForm({
                            ...form,
                            channels: event.target.checked ? ["telegram", "kakao"] : ["telegram"]
                          });
                        }}
                      />
                      카카오 나에게 보내기 (예약)
                    </label>
                 </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-lg border border-normal px-4 py-2.5 text-sm font-bold text-strong hover:bg-alternative transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> 이전
              </button>
              <form onSubmit={submit} className="flex-[2]">
                <button
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95"
                  disabled={saving}
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {saving ? "저장 중" : editingRule ? "수정 완료" : "조건 저장 및 활성화"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function RuleList({
  rules,
  onChanged,
  onEdit
}: {
  rules: WatchRule[];
  onChanged: () => void;
  onEdit: (rule: WatchRule) => void;
}) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function run(id: string) {
    setBusyId(id);
    setError("");
    try {
      await runRule(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "체크 실행에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  }

  async function remove(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await deleteRule(id);
      onChanged();
    } catch (err) {
      setError("삭제에 실패했습니다.");
    }
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-normal bg-elevated p-10 text-center text-sm text-neutral">
        저장된 관심 조건이 없습니다. 신규 조건을 추가해 보세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg bg-red-50/10 border border-red-500/20 px-4 py-3 text-sm text-red-500 font-medium">{error}</p>}
      {rules.map((rule) => (
        <article key={rule.id} className="rounded-xl border border-normal bg-elevated p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-strong truncate">{rule.name}</h3>
                {!rule.enabled && <span className="bg-alternative text-neutral px-1.5 py-0.5 rounded text-[10px] font-bold border border-normal">중단됨</span>}
              </div>
              <p className="mt-1 text-sm text-neutral leading-relaxed">
                <span className="font-medium text-strong">{rule.regionName}</span>
                {rule.apartmentKeywords && rule.apartmentKeywords.length > 0 ? (
                  <span className="ml-1 text-[11px] bg-primary/5 text-primary px-1.5 py-0.5 rounded">
                    {rule.apartmentKeywords.length === 1 ? rule.apartmentKeywords[0] : `${rule.apartmentKeywords[0]} 외 ${rule.apartmentKeywords.length - 1}곳`}
                  </span>
                ) : <span className="ml-1 text-xs">전체 단지</span>}
                <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                <span className="text-xs">최근 2개월 자동 추적</span>
                <span className="mx-1.5 text-slate-300 dark:text-slate-700">|</span>
                <span className="text-primary font-medium">{rule.minPriceEok ?? 0}억~{rule.maxPriceEok ?? "무제한"}억</span>
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral">
                <span className="bg-alternative border border-normal px-1.5 py-0.5 rounded leading-none">{comparisonLabels[rule.comparisonCriteria]}</span>
                <span>{rule.intervalMinutes}분 주기</span>
                <span className="flex items-center gap-1">
                   <History className="h-3 w-3" /> {formatDate(rule.lastCheckedAt)} 체크
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:self-center">
              <button
                className="p-2.5 text-neutral hover:bg-alternative hover:text-strong rounded-lg transition-colors"
                title="수정"
                onClick={() => onEdit(rule)}
              >
                <Pencil className="h-4.5 w-4.5" />
              </button>
              <button
                className="p-2.5 text-neutral hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                title="삭제"
                onClick={() => remove(rule.id)}
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
              <div className="h-6 w-px bg-line/20 mx-1 hidden sm:block" />
              <button
                className={classNames(
                  "px-3.5 py-2 text-xs font-bold rounded-lg transition-all border",
                  rule.enabled ? "bg-elevated border-normal text-strong hover:bg-alternative" : "bg-primary border-primary text-white hover:opacity-90 active:scale-95"
                )}
                onClick={async () => {
                  await patchRule(rule.id, { enabled: !rule.enabled });
                  onChanged();
                }}
              >
                {rule.enabled ? "일시정지" : "활성화"}
              </button>
              <button
                className="inline-flex items-center gap-1.5 bg-strong px-4 py-2 text-xs font-bold text-normal rounded-lg disabled:opacity-60 hover:opacity-90 transition-all active:scale-95"
                disabled={busyId === rule.id || !rule.enabled}
                onClick={() => void run(rule.id)}
              >
                {busyId === rule.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {busyId === rule.id ? "진행 중" : "지금 실행"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function RulesPage({ state, onChanged }: { state: DashboardState | undefined; onChanged: () => void }) {
  const [editingRule, setEditingRule] = useState<WatchRule | undefined>();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-strong tracking-tight">알림 규칙</h2>
        <p className="text-sm text-neutral">관심 지역의 실거래를 자동으로 추적할 조건을 만들고 관리하세요.</p>
      </header>

      <RuleForm
        editingRule={editingRule}
        onSave={() => {
          setEditingRule(undefined);
          onChanged();
        }}
        onCancel={() => setEditingRule(undefined)}
      />

      <div>
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-strong tracking-tight">관심 조건 목록</h2>
          <span className="text-xs font-bold text-neutral bg-elevated border border-normal px-2 py-0.5 rounded-full">
            {state?.rules.length ?? 0}개
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
    </div>
  );
}
