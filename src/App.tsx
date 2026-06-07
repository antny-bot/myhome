import {
  Bell,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  History,
  LayoutDashboard,
  Menu,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRule, deleteRule, getApartments, loadDashboard, patchRule, runRule, searchRegions } from "./api";
import type { CheckRun, ComparisonCriteria, DashboardState, RuleInput, WatchRule } from "./types";
import { useBreakpoint } from "./useBreakpoint";

const sourceNotice = "PlayMCP 실거래가/단지정보 기반입니다. 현재 매물, 호가, 매물 등록/삭제 알림이 아닙니다.";
const defaultMonth = new Date().toISOString().slice(0, 7).replace("-", "");

const initialForm: RuleInput = {
  name: "관심 지역 실거래가 체크",
  regionName: "",
  apartmentKeywords: [],
  dealMonth: defaultMonth,
  startMonth: defaultMonth,
  endMonth: defaultMonth,
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

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function SectionCard({
  title,
  subtitle,
  right,
  children,
  className
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames("rounded-xl border border-normal bg-elevated shadow-sm overflow-hidden", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-normal px-5 py-4">
          <div>
            {title && <h2 className="text-lg font-bold text-strong leading-none">{title}</h2>}
            {subtitle && <p className="mt-1.5 text-sm text-neutral">{subtitle}</p>}
          </div>
          {right && <div>{right}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "default"
}: {
  icon: any;
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  return (
    <div className="rounded-xl border border-normal bg-elevated p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral">{label}</span>
        <Icon
          className={classNames(
            "h-5 w-5",
            tone === "good" && "text-signal",
            tone === "warn" && "text-warn",
            tone === "default" && "text-neutral"
          )}
        />
      </div>
      <div className="mt-2 text-2xl font-bold text-strong">{value}</div>
    </div>
  );
}

function ConstraintBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className={classNames("rounded-xl border border-amber-200/50 bg-amber-500/10 text-amber-900 dark:text-amber-200", compact ? "p-3" : "p-4")}>
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-bold">데이터 제약사항</p>
          <p className="mt-1 text-sm leading-relaxed">{sourceNotice}</p>
        </div>
      </div>
    </div>
  );
}

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
  const [isRange, setIsRange] = useState(false);
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
        dealMonth: editingRule.dealMonth ?? defaultMonth,
        startMonth: editingRule.startMonth ?? defaultMonth,
        endMonth: editingRule.endMonth ?? defaultMonth,
        minPriceEok: editingRule.minPriceEok,
        maxPriceEok: editingRule.maxPriceEok,
        comparisonCriteria: editingRule.comparisonCriteria,
        intervalMinutes: editingRule.intervalMinutes,
        channels: editingRule.channels,
        enabled: editingRule.enabled
      });
      setIsRange(!!(editingRule.startMonth && editingRule.endMonth));
      setLawdCode(editingRule.regionCode ?? "");
      setStep(1);
    } else {
      setForm(initialForm);
      setIsRange(false);
      setLawdCode("");
      setStep(1);
    }
  }, [editingRule]);

  useEffect(() => {
    const targetMonth = isRange ? form.startMonth : form.dealMonth;
    if (lawdCode && targetMonth && targetMonth.length === 6) {
      void fetchApts(lawdCode, targetMonth);
    } else {
      setAptList([]);
    }
  }, [lawdCode, form.dealMonth, form.startMonth, isRange]);

  const fetchApts = async (code: string, month: string) => {
    if (!code || !month) return;
    setLoadingApts(true);
    try {
      const list = await getApartments(code, month);
      setAptList(list);
    } catch (err) {
      console.error("Failed to fetch apartments:", err);
      setAptList([]);
    } finally {
      setLoadingApts(false);
    }
  };

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
      const data = {
        ...form,
        dealMonth: isRange ? undefined : form.dealMonth,
        startMonth: isRange ? form.startMonth : undefined,
        endMonth: isRange ? form.endMonth : undefined
      };

      if (editingRule) {
        await patchRule(editingRule.id, data);
      } else {
        await createRule(data);
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
            <ConstraintBanner compact />
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
              <div className="space-y-1.5">
                <span className="text-sm font-semibold text-strong">지역명 검색</span>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
                    value={form.regionName}
                    onChange={(event) => setForm({ ...form, regionName: event.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
                    placeholder="예: 서울 강남구"
                  />
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-strong">기준 년월</span>
                  <label className="flex items-center gap-1.5 text-xs text-neutral cursor-pointer select-none">
                    <input type="checkbox" checked={isRange} onChange={(e) => setIsRange(e.target.checked)} />
                    기간 조회
                  </label>
                </div>
                {isRange ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
                      value={form.startMonth}
                      onChange={(event) => setForm({ ...form, startMonth: event.target.value })}
                      placeholder="시작 YYYYMM"
                    />
                    <span className="text-neutral text-xs">~</span>
                    <input
                      className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
                      value={form.endMonth}
                      onChange={(event) => setForm({ ...form, endMonth: event.target.value })}
                      placeholder="종료 YYYYMM"
                    />
                  </div>
                ) : (
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
                    value={form.dealMonth}
                    onChange={(event) => setForm({ ...form, dealMonth: event.target.value })}
                    placeholder="YYYYMM"
                  />
                )}
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
                {rule.startMonth ? `${rule.startMonth}~${rule.endMonth}` : rule.dealMonth}
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

function RecentRuns({ runs }: { runs: CheckRun[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <SectionCard title="최근 체크 결과" subtitle="최근 5건의 자동/수동 실행 이력">
      <div className="space-y-4">
        {runs.slice(0, 5).map((run) => (
          <div key={run.id} className="group flex flex-col gap-2 p-3 rounded-xl border border-normal/50 bg-normal/30 hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-strong group-hover:text-primary transition-colors truncate">{run.ruleName}</p>
                <p className="mt-1 text-xs text-neutral leading-relaxed">{run.summary}</p>
              </div>
              <span
                className={classNames(
                  "shrink-0 px-2 py-0.5 rounded text-[10px] font-bold",
                  run.matched ? "bg-emerald-500/10 text-emerald-500" : "bg-neutral/10 text-neutral"
                )}
              >
                {run.matched ? `${run.matches.length}건 매칭` : "없음"}
              </span>
            </div>
            
            {run.matched && (
              <div className="mt-1">
                <button 
                  onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                  className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  {expandedId === run.id ? "상세 내역 닫기" : "매칭 상세 내역 보기"}
                </button>
                
                {expandedId === run.id && (
                  <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    {run.matches.map((m, idx) => (
                      <div key={idx} className="bg-elevated p-2 rounded-lg border border-normal text-[11px] flex justify-between items-center">
                        <div>
                          <span className="font-bold text-strong">{m.apartmentName}</span>
                          <span className="ml-2 text-neutral">{m.floor ? `${m.floor}층` : ""} | {m.areaM2 ? `${m.areaM2}㎡` : ""}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{m.priceEok.toFixed(2)}억</p>
                          <p className="text-[10px] text-assistive">{m.dealDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-1 flex items-center justify-between text-[10px] text-assistive pt-2 border-t border-normal/20">
               <span>{formatDate(run.createdAt)}</span>
               <span className="bg-alternative px-1.5 py-0.5 rounded">ID: {run.id.slice(0, 6)}</span>
            </div>
          </div>
        ))}
        {runs.length === 0 && (
           <p className="text-center py-6 text-sm text-neutral">체크 실행 이력이 없습니다.</p>
        )}
      </div>
    </SectionCard>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { isMobile } = useBreakpoint();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavItem = ({ icon: Icon, label, active = false }: { icon: any; label: string; active?: boolean }) => (
    <a
      href="#"
      className={classNames(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active ? "bg-primary text-white font-bold shadow-md shadow-primary/20" : "text-neutral hover:bg-alternative hover:text-strong"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[15px]">{label}</span>
    </a>
  );

  return (
    <div className="min-h-screen bg-alternative flex text-strong font-body">
      {!isMobile && (
        <aside className="w-64 border-r border-normal bg-elevated sticky top-0 h-screen flex flex-col p-5">
          <div className="px-4 py-6">
            <h1 className="text-xl font-black text-primary tracking-tight">MY HOME</h1>
            <p className="text-[10px] text-neutral font-bold tracking-widest uppercase mt-1">Apartment Alert</p>
          </div>
          <nav className="mt-4 space-y-2 flex-1">
            <NavItem icon={LayoutDashboard} label="대시보드" active />
            <NavItem icon={Bell} label="알림 규칙" />
            <NavItem icon={History} label="이력 조회" />
            <NavItem icon={Settings} label="환경 설정" />
          </nav>
          <div className="pt-6 border-t border-normal/50">
            <div className="bg-alternative rounded-xl p-4">
              <p className="text-xs text-neutral font-medium">데이터 제약</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral/70">실거래가/단지정보 기준이며 호가 정보는 포함되지 않습니다.</p>
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className={classNames(
            "bg-elevated border-b border-normal sticky top-0 z-40 flex items-center justify-between",
            isMobile ? "h-14 px-4" : "h-16 px-8"
          )}
        >
          {isMobile ? (
            <>
              <button onClick={() => setSidebarOpen(true)} className="p-1 text-strong">
                <Menu className="h-6 w-6" />
              </button>
              <h2 className="text-base font-black tracking-tight text-strong">MY HOME</h2>
              <div className="w-8" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold bg-alternative border border-normal text-strong px-2 py-0.5 rounded">V0.1.0</span>
                <span className="text-xs text-neutral">아파트 실거래 자동 알림 서비스</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="p-2 text-neutral hover:bg-alternative rounded-lg transition-colors">
                   <RefreshCw className="h-5 w-5" />
                </button>
                <div className="h-8 w-8 rounded-full bg-alternative border border-normal shadow-sm" />
              </div>
            </>
          )}
        </header>

        <main className={classNames("flex-1 overflow-auto", isMobile ? "p-4 pb-24" : "p-8 max-w-6xl mx-auto w-full")}>
          {children}
        </main>

        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 bg-elevated border-t border-normal h-14 flex items-center px-2 z-40">
            <a href="#" className="flex-1 flex flex-col items-center justify-center text-primary">
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-[10px] font-bold mt-1">대시보드</span>
            </a>
            <a href="#" className="flex-1 flex flex-col items-center justify-center text-neutral">
              <Bell className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-1">규칙</span>
            </a>
            <a href="#" className="flex-1 flex flex-col items-center justify-center text-neutral">
              <History className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-1">이력</span>
            </a>
            <a href="#" className="flex-1 flex flex-col items-center justify-center text-neutral">
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-medium mt-1">설정</span>
            </a>
          </nav>
        )}
      </div>
    </div>
  );
}

function App() {
  const [state, setState] = useState<DashboardState | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingRule, setEditingRule] = useState<WatchRule | undefined>();
  const { isMobile } = useBreakpoint();

  async function refresh() {
    setError("");
    try {
      setState(await loadDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "대시보드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(() => {
    const rules = state?.rules ?? [];
    const runs = state?.checkRuns ?? [];
    const notifications = state?.notifications ?? [];
    return {
      activeRules: rules.filter((rule) => rule.enabled).length,
      matches: runs.reduce((sum, run) => sum + run.matches.length, 0),
      sent: notifications.filter((item) => item.status === "sent").length
    };
  }, [state]);

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-strong tracking-tight">대시보드 요약</h2>
          <p className="text-sm text-neutral">관심 지역의 실거래 및 알림 발송 현황을 확인하세요.</p>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Bell} label="활성 조건" value={`${stats.activeRules}개`} tone="good" />
          <StatCard icon={CheckCircle2} label="누적 매칭" value={`${stats.matches}건`} />
          <StatCard icon={Send} label="발송 알림" value={`${stats.sent}건`} tone={state?.config.telegramConfigured ? "good" : "warn"} />
          <StatCard icon={Database} label="상태" value={state?.config.telegramConfigured ? "정상" : "점검"} />
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.8fr] gap-6">
          <div className="space-y-6">
            <RuleForm
              editingRule={editingRule}
              onSave={() => {
                setEditingRule(undefined);
                void refresh();
              }}
              onCancel={() => setEditingRule(undefined)}
            />

            <div>
              <div className="mb-4 flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-strong tracking-tight text-strong">관심 조건 목록</h2>
                <span className="text-xs font-bold text-neutral bg-elevated border border-normal px-2 py-0.5 rounded-full">
                  {state?.rules.length ?? 0}개
                </span>
              </div>
              <RuleList
                rules={state?.rules ?? []}
                onChanged={() => void refresh()}
                onEdit={(rule) => {
                  setEditingRule(rule);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          </div>

          <aside className="space-y-6">
            <RecentRuns runs={state?.checkRuns ?? []} />

            <SectionCard title="알림 발송 이력">
               <div className="space-y-4">
                  {(state?.notifications ?? []).slice(0, 4).map((item) => (
                    <div key={item.id} className="flex gap-3">
                       <div className={classNames(
                         "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                         item.status === 'sent' ? "bg-primary/10 text-primary" : "bg-alternative text-neutral"
                       )}>
                         <Send className="h-4 w-4" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-xs font-bold text-strong">{item.channel} 알림 {item.status === 'sent' ? '성공' : '제외'}</p>
                          <p className="mt-0.5 text-[11px] text-neutral truncate">{item.message}</p>
                          <p className="mt-1 text-[10px] text-assistive">{formatDate(item.createdAt)}</p>
                       </div>
                    </div>
                  ))}
                  {(state?.notifications ?? []).length === 0 && (
                    <p className="text-center py-6 text-sm text-neutral">알림 발송 이력이 없습니다.</p>
                  )}
               </div>
            </SectionCard>

            <div className="rounded-xl border border-normal bg-elevated p-5">
               <h3 className="text-sm font-bold text-strong flex items-center gap-2">
                 <Database className="h-4 w-4 text-primary" />
                 시스템 상태
               </h3>
               <div className="mt-4 grid grid-cols-2 gap-y-4 gap-x-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral uppercase">데이터 소스</p>
                    <p className="text-xs font-bold text-strong">PlayMCP</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral uppercase">텔레그램</p>
                    <p className={classNames("text-xs font-bold", state?.config.telegramConfigured ? "text-emerald-500" : "text-warn")}>
                       {state?.config.telegramConfigured ? "활성" : "점검 필요"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral uppercase">카카오</p>
                    <p className="text-xs font-bold text-neutral">준비 중</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-neutral uppercase">현재 버전</p>
                    <p className="text-xs font-bold text-strong">V0.1.0</p>
                  </div>
               </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

export default App;
