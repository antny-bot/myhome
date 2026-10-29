import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRule, getApartments, logActivity, patchRule, searchRegions } from "../../api.js";
import { useLocale } from "../../lib/i18n.js";
import type { ComplexSearchResult, RegionSearchResult, RuleInput, WatchRule } from "../../types.js";
import { initialForm } from "./types.js";

interface UseRuleFormProps {
  editingRule?: WatchRule;
  initData?: { regionName: string; regionCode?: string; apartmentKeywords: string[] } | null;
  clearInitData?: () => void;
  onSave: () => void;
  isAdmin?: boolean;
  currentRulesCount?: number;
}

export function useRuleForm({
  editingRule,
  initData,
  clearInitData,
  onSave,
  isAdmin = false,
  currentRulesCount = 0,
}: UseRuleFormProps) {
  const { t } = useLocale();
  const [step, setStep] = useState(1);
  const [isTelegramGuideOpen, setIsTelegramGuideOpen] = useState(false);
  const [form, setForm] = useState<RuleInput>(() => ({
    ...initialForm,
    name: t.ruleInitialName,
  }));

  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [lawdCode, setLawdCode] = useState("");
  const [resolvedRegionName, setResolvedRegionName] = useState("");
  const [error, setError] = useState("");
  const [complexQuery, setComplexQuery] = useState("");
  const [showComplexDropdown, setShowComplexDropdown] = useState(false);
  const [activeAptIndex, setActiveAptIndex] = useState(-1);
  const [complexSearchResults, setComplexSearchResults] = useState<ComplexSearchResult[]>([]);
  const [searchingComplexes, setSearchingComplexes] = useState(false);

  const filteredApts = useMemo(() => {
    const names = complexSearchResults.map((item) => item.name);
    const q = complexQuery.trim().toLowerCase();
    if (!q) return names;
    return names.filter((name) => name.toLowerCase().includes(q));
  }, [complexSearchResults, complexQuery]);

  useEffect(() => {
    if (editingRule) {
      setForm({
        name: editingRule.name,
        regionName: editingRule.regionName,
        regionCode: editingRule.regionCode,
        apartmentKeywords: editingRule.apartmentKeywords ?? [],
        minPriceEok: editingRule.minPriceEok,
        maxPriceEok: editingRule.maxPriceEok,
        minArea: editingRule.minArea,
        maxArea: editingRule.maxArea,
        comparisonCriteria: editingRule.comparisonCriteria,
        intervalMinutes: editingRule.intervalMinutes ?? 1440,
        alertTime: editingRule.alertTime ?? "09:00",
        channels: editingRule.channels,
        enabled: editingRule.enabled,
      });
      setLawdCode(editingRule.regionCode ?? "");
      setResolvedRegionName(editingRule.regionName);
      setStep(1);
    } else if (initData) {
      setForm({
        ...initialForm,
        name: `${initData.regionName.split(" ").pop() ?? ""} 알림 규칙`,
        regionName: initData.regionName,
        regionCode: initData.regionCode,
        apartmentKeywords: initData.apartmentKeywords,
      });
      setLawdCode(initData.regionCode ?? "");
      setResolvedRegionName(initData.regionName);
      setStep(2);
      clearInitData?.();
    } else {
      if (!resolvedRegionName) {
        setForm({
          ...initialForm,
          name: t.ruleInitialName,
        });
        setLawdCode("");
        setResolvedRegionName("");
        setStep(1);
      }
    }
  }, [editingRule, initData]);

  useEffect(() => {
    if (!lawdCode) {
      setComplexSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchingComplexes(true);
    setComplexSearchResults([]);

    (async () => {
      try {
        const apiResult = await getApartments(lawdCode);
        if (!cancelled) {
          setComplexSearchResults(
            apiResult.apartments.map((name) => ({
              id: `${lawdCode}|${name}`,
              name,
              lawdCode,
              regionName: resolvedRegionName,
            }))
          );
        }
      } catch (err) {
        console.error("[Rules] 단지 목록 로드 실패:", err);
        if (!cancelled) setComplexSearchResults([]);
      } finally {
        if (!cancelled) setSearchingComplexes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lawdCode, resolvedRegionName]);

  function selectRegion(item: RegionSearchResult) {
    setLawdCode(item.lawdCode);
    setResolvedRegionName(item.displayName);
    setForm((prev) => ({ ...prev, regionName: item.displayName, regionCode: item.lawdCode }));
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
        setLawdCode(bestMatch.lawdCode);
        setResolvedRegionName(bestMatch.displayName);
        setForm((prev) => ({ ...prev, regionName: bestMatch.displayName, regionCode: bestMatch.lawdCode }));
        setStep(2);
      } else {
        setError("검색된 지역이 없습니다. 정확한 구/군 이름을 입력해 주세요.");
        setLawdCode("");
      }
    } catch {
      setError("지역 검색에 실패했습니다.");
      setLawdCode("");
    } finally {
      setSearching(false);
    }
  }

  const toggleApt = (name: string) => {
    const current = form.apartmentKeywords ?? [];
    if (current.includes(name)) {
      setForm({ ...form, apartmentKeywords: current.filter((n) => n !== name) });
    } else {
      setForm({ ...form, apartmentKeywords: [...current, name] });
    }
  };

  const handleAddCustomApt = () => {
    const customName = complexQuery.trim();
    if (!customName) return;

    const current = form.apartmentKeywords ?? [];
    if (!current.includes(customName)) {
      setForm((prev) => ({
        ...prev,
        apartmentKeywords: [...current, customName],
      }));
    }
    setComplexQuery("");
    setShowComplexDropdown(false);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const isLimitExceeded = !isAdmin && !editingRule && currentRulesCount >= 5;
    if (isLimitExceeded) {
      setError("일반 사용자는 알림 규칙을 최대 5개까지만 등록할 수 있습니다.");
      return;
    }

    setSaving(true);
    try {
      if (editingRule) {
        await patchRule(editingRule.id, form);
        void logActivity("rule_update", `알림 규칙 수정: ${form.name}`, { ruleId: editingRule.id, form });
      } else {
        const newRule = await createRule(form);
        void logActivity("rule_create", `알림 규칙 생성: ${form.name}`, { ruleId: newRule.id, form });
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return {
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
  };
}
