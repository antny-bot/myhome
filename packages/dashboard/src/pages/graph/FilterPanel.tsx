import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { RegionSearchInput } from "../../components/RegionSearchInput";

import { GraphFilter, GraphPreset } from "@myhome/shared";
import {
  loadPresets,
  savePreset,
  deletePreset,
  loadPresetsOverview,
  savePresetOverview,
  deletePresetOverview,
  loadPresetsAnalysis,
  savePresetAnalysis,
  deletePresetAnalysis,
  searchComplexNames as searchComplexNamesApi,
  fetchComplexesByRegion
} from "../../api";
import { Play, Save, RotateCcw, X, ChevronDown, ChevronUp } from "lucide-react";
import { useBreakpoint } from "../../useBreakpoint";
import type { RegionSearchResult } from "../../types";

interface FilterPanelProps {
  filter: GraphFilter;
  regionName: string;
  onFilterChange: (filter: GraphFilter, regionName: string) => void;
  onApply: () => void;
  /** true이면 단지명·평형 필터 UI 숨김 (종합 현황 모드) */
  hideComplexSearch?: boolean;
  locale?: "ko" | "en";
}

const filterCopy = {
  ko: {
    filterTitleOverview: "지역·기간 필터",
    filterTitleAnalysis: "실거래 분석 필터",
    filterSubtitleOverview: "기간과 지역을 설정해 거시 통계 데이터를 탐색합니다.",
    filterSubtitleAnalysis: "기간, 지역, 단지명, 평형 조건을 설정해 데이터를 탐색합니다.",
    regionLabel: "지역",
    regionPlaceholder: "지역명 검색 (예: 서초구)",
    complexLabel: "아파트 단지명",
    complexPlaceholderWithCode: "단지명 검색 또는 선택",
    complexPlaceholderNoCode: "단지명 키워드 (예: 자이)",
    loadingComplex: "(로딩 중...)",
    areaLabel: "전용 면적",
    areaViewPyung: "평 단위 보기",
    areaViewM2: "㎡ 단위 보기",
    areaMinPlaceholderPyung: "최소 평",
    areaMinPlaceholderM2: "최소 ㎡",
    areaMaxPlaceholderPyung: "최대 평",
    areaMaxPlaceholderM2: "최대 ㎡",
    dateLabel: "조회 기간",
    periodQuickSelect: "분석 기간 퀵 선택",
    period1Year: "최근 1년",
    period2Year: "최근 2년",
    period3Year: "최근 3년",
    buttonReset: "초기화",
    buttonApply: "분석 실행",
    presetSelectOverview: "종합 프리셋",
    presetSelectAnalysis: "단지 프리셋",
    presetSaveBtn: "프리셋 저장",
    presetModalTitle: "💾 조회 조건 프리셋 저장",
    presetModalDesc: "현재 설정된 필터 조건에 이름을 붙여 저장합니다.",
    presetNameLabel: "프리셋 이름",
    presetNamePlaceholder: "예: 강남구 84타입 최근 거래",
    presetErrNoName: "프리셋 이름을 입력해 주세요.",
    presetErrNoRegion: "지역을 먼저 검색해 주세요.",
    presetErrNoComplex: "단지명을 입력해 주세요.",
    buttonCancel: "취소",
    buttonSave: "저장하기",
    deleteConfirm: "이 프리셋을 삭제하시겠습니까?",
    allRegions: "전체 지역",
  },
  en: {
    filterTitleOverview: "Region & Period Filter",
    filterTitleAnalysis: "Transaction Analysis Filter",
    filterSubtitleOverview: "Set region and period to explore macro stats.",
    filterSubtitleAnalysis: "Set region, period, complex, and size to explore data.",
    regionLabel: "Region",
    regionPlaceholder: "Search region (e.g. Seocho-gu)",
    complexLabel: "Apartment Complex",
    complexPlaceholderWithCode: "Search or select complex",
    complexPlaceholderNoCode: "Complex keyword (e.g. Xi)",
    loadingComplex: "(Loading...)",
    areaLabel: "Exclusive Area",
    areaViewPyung: "View in Pyeong",
    areaViewM2: "View in ㎡",
    areaMinPlaceholderPyung: "Min Pyeong",
    areaMinPlaceholderM2: "Min ㎡",
    areaMaxPlaceholderPyung: "Max Pyeong",
    areaMaxPlaceholderM2: "Max ㎡",
    dateLabel: "Inquiry Period",
    periodQuickSelect: "Quick Selection",
    period1Year: "Last 1 Year",
    period2Year: "Last 2 Years",
    period3Year: "Last 3 Years",
    buttonReset: "Reset",
    buttonApply: "Run Analysis",
    presetSelectOverview: "Overview Presets",
    presetSelectAnalysis: "Complex Presets",
    presetSaveBtn: "Save Preset",
    presetModalTitle: "💾 Save Filter Preset",
    presetModalDesc: "Save the current filter criteria as a preset.",
    presetNameLabel: "Preset Name",
    presetNamePlaceholder: "e.g., Gangnam 84 Type Recent",
    presetErrNoName: "Please enter a preset name.",
    presetErrNoRegion: "Please search and select a region first.",
    presetErrNoComplex: "Please enter a complex name.",
    buttonCancel: "Cancel",
    buttonSave: "Save",
    deleteConfirm: "Are you sure you want to delete this preset?",
    allRegions: "All Regions",
  }
};

export default function FilterPanel({
  filter,
  regionName,
  onFilterChange,
  onApply,
  hideComplexSearch = false,
  locale = "ko",
}: FilterPanelProps) {
  const { isMobile } = useBreakpoint();
  const t = filterCopy[locale];

  // 로컬 필터 상태
  const [regionText, setRegionText] = useState(regionName || "");
  const [startDate, setStartDate] = useState(filter.startDate || "");
  const [endDate, setEndDate] = useState(filter.endDate || "");
  const [complexName, setComplexName] = useState(filter.complexName || "");
  const [minArea, setMinArea] = useState(filter.minArea !== undefined ? String(filter.minArea) : "");
  const [maxArea, setMaxArea] = useState(filter.maxArea !== undefined ? String(filter.maxArea) : "");
  const [selectedRegions, setSelectedRegions] = useState<Array<{ lawdCode: string; regionName: string }>>(() => {
    if (filter.lawdCodes && filter.lawdCodes.length > 0) {
      return filter.lawdCodes.map((code) => ({ lawdCode: code, regionName: '' }));
    }
    if (filter.lawdCode) {
      return [{ lawdCode: filter.lawdCode, regionName: regionName || '' }];
    }
    return [];
  });

  // 전역 단지 검색 자동완성
  const [globalSuggestions, setGlobalSuggestions] = useState<Array<{ name: string; lawdCode: string; regionName: string }>>([]);
  const [apartments, setApartments] = useState<string[]>([]);
  const [searchingComplexes, setSearchingComplexes] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const complexInputRef = useRef<HTMLInputElement>(null);

  // 기간 선택: "최근 1년", "최근 2년", "최근 3년"
  const [period, setPeriod] = useState<string>(
    filter.startDate && filter.endDate ? 'custom' : 'none'
  );

  // 기간 옵션 적용 (즉시 적용 + 부모에 반영)
  const applyPeriodOption = (years: number) => {
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = String(now.getMonth() + 1).padStart(2, '0');
    const end = `${endYear}-${endMonth}`;

    const startYear = endYear - years;
    const startMonth = String(now.getMonth() + 1).padStart(2, '0');
    const start = `${startYear}-${startMonth}`;

    setStartDate(start);
    setEndDate(end);
    setPeriod(`${years}year`);

    // 부모 필터 즉시 업데이트
    onFilterChange(
      {
        lawdCode: filter.lawdCode,
        regionName: regionName,
        complexName: complexName || undefined,
        startDate: start,
        endDate: end,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
      },
      regionName
    );
    onApply();
  };

  // preset에서 시작/종료 년월이 변경되면 로컬 상태 동기화
  useEffect(() => {
    if (filter.startDate && filter.endDate) {
      if (startDate !== filter.startDate || endDate !== filter.endDate) {
        setStartDate(filter.startDate);
        setEndDate(filter.endDate);
        setPeriod('custom');
      }
    }
  }, [filter.startDate, filter.endDate]);

  // 법드코드 확정 시 해당 지역 아파트 목록 미리 로드 (제한 없이 전체 로드)
  useEffect(() => {
    if (!filter.lawdCode) {
      setApartments([]);
      return;
    }
    let cancelled = false;
    setSearchingComplexes(true);
    setApartments([]);

    (async () => {
      try {
        const result = await fetchComplexesByRegion(filter.lawdCode);
        if (cancelled) return;
        if (result && result.length > 0) {
          setApartments(result);
        }
      } catch (err) {
        console.error("Failed to load complex list for region", err);
        if (!cancelled) setApartments([]);
      } finally {
        if (!cancelled) setSearchingComplexes(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter.lawdCode]);

  // 로컬 필터링 및 글로벌 제안 결과 통합 계산
  const filteredSuggestions = React.useMemo(() => {
    const q = complexName.trim().toLowerCase();
    if (filter.lawdCode) {
      if (!q) {
        return apartments.map((name) => ({ name, lawdCode: filter.lawdCode!, regionName: regionName }));
      }
      return apartments
        .filter((name) => name.toLowerCase().includes(q))
        .map((name) => ({ name, lawdCode: filter.lawdCode!, regionName: regionName }));
    } else {
      return globalSuggestions;
    }
  }, [apartments, complexName, filter.lawdCode, regionName, globalSuggestions]);

  // 단지 검색 디바운스 (지역 코드가 없을 때만 글로벌 검색 동작)
  useEffect(() => {
    if (filter.lawdCode) {
      setGlobalSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = complexName.trim();
    if (!query) {
      setGlobalSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchComplexNamesApi(query);
        setGlobalSuggestions(results);
        const isCurrentFocused = document.activeElement === complexInputRef.current;
        setShowSuggestions(results.length > 0 && isCurrentFocused);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Failed to search complex names", err);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [complexName, filter.lawdCode]);

  useEffect(() => {
    setRegionText(regionName || "");
  }, [regionName]);

  useEffect(() => {
    setComplexName(filter.complexName || "");
  }, [filter.complexName]);

  // 평형 <-> ㎡ 단위 토글을 위한 상태
  const [usePyung, setUsePyung] = useState(false);

  // 프리셋 관련 상태
  const [presets, setPresets] = useState<GraphPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 모바일 접기/펼치기
  const [expanded, setExpanded] = useState(!isMobile);

  // 프리셋 로드
  const fetchPresets = async () => {
    try {
      const data = hideComplexSearch
        ? await loadPresetsOverview()
        : await loadPresetsAnalysis();
      setPresets(data as any);
    } catch (err) {
      console.error("Failed to load presets", err);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        e.preventDefault();
        const selected = filteredSuggestions[activeIndex];
        selectSuggestion(selected);
      } else if (filteredSuggestions.length === 1) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[0]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const selectSuggestion = (item: { name: string; lawdCode: string; regionName: string }) => {
    setComplexName(item.name);
    setShowSuggestions(false);
    setRegionText(item.regionName);
    onFilterChange(
      {
        lawdCode: item.lawdCode,
        regionName: item.regionName,
        complexName: item.name,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
      },
      item.regionName
    );
    setTimeout(() => onApply(), 50);
  };

  const handleApply = () => {
    onFilterChange(
      {
        lawdCode: filter.lawdCode,
        complexName: complexName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
      },
      regionName
    );
    onApply();
  };

  const handleReset = () => {
    setRegionText("");
    setStartDate("");
    setEndDate("");
    setComplexName("");
    setMinArea("");
    setMaxArea("");
    setPeriod('none');
    setSelectedPresetId("");
    onFilterChange({}, "");
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      setErrorMsg(t.presetErrNoName);
      return;
    }
    try {
      if (hideComplexSearch) {
        // 종합 현황 프리셋 저장
        const currentFilter: GraphFilter = {
          lawdCode: filter.lawdCode,
          regionName: regionName,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        await savePresetOverview(newPresetName, currentFilter);
      } else {
        // 단지 분석 프리셋 저장
        if (!regionText) {
          setErrorMsg(t.presetErrNoRegion);
          return;
        }
        if (!complexName) {
          setErrorMsg(t.presetErrNoComplex);
          return;
        }
        const areaVal = minArea ? Number(minArea) : undefined;
        await savePresetAnalysis({
          name: newPresetName,
          regionName: regionText,
          buildingName: complexName,
          areaM2: areaVal
        });
      }
      setNewPresetName("");
      setShowPresetModal(false);
      setErrorMsg("");
      fetchPresets();
    } catch (err: any) {
      setErrorMsg(err.message || "프리셋 저장 실패");
    }
  };

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t.deleteConfirm)) return;
    try {
      if (hideComplexSearch) {
        await deletePresetOverview(id);
      } else {
        await deletePresetAnalysis(id);
      }
      if (selectedPresetId === id) setSelectedPresetId("");
      fetchPresets();
    } catch (err) {
      console.error("Failed to delete preset", err);
    }
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);

    if (hideComplexSearch) {
      const f = (preset as GraphPreset).filter;
      setRegionText(f.regionName || "");
      setStartDate(f.startDate || "");
      setEndDate(f.endDate || "");
      onFilterChange(f, f.regionName || preset.name);
    } else {
      const p = preset as any;
      setRegionText(p.regionName || "");
      setComplexName(p.buildingName || "");
      setMinArea(p.areaM2 ? String(p.areaM2) : "");
      setMaxArea(p.areaM2 ? String(p.areaM2) : "");

      onFilterChange(
        {
          lawdCode: filter.lawdCode,
          regionName: p.regionName,
          complexName: p.buildingName,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minArea: p.areaM2 || undefined,
          maxArea: p.areaM2 || undefined,
        },
        p.regionName || preset.name
      );
    }
  };

  // 평형 변환 도우미
  const toPyung = (m2Str: string) => {
    if (!m2Str) return "";
    return String(Math.round(Number(m2Str) / 3.3057));
  };

  const fromPyung = (pyungStr: string) => {
    if (!pyungStr) return "";
    return String(Math.round(Number(pyungStr) * 3.3057));
  };

  const handleAreaChange = (val: string, type: "min" | "max") => {
    if (usePyung) {
      const m2Val = fromPyung(val);
      if (type === "min") setMinArea(m2Val);
      else setMaxArea(m2Val);
    } else {
      if (type === "min") setMinArea(val);
      else setMaxArea(val);
    }
  };

  // 기간 배지 클릭 핸들러
  const handlePeriodBadgeClick = (years: number) => {
    applyPeriodOption(years);
  };

  // 필터 요약 문자열 생성
  const getFilterSummaryText = () => {
    const regionTextStr = selectedRegions.map((r) => r.regionName).join(', ') || t.allRegions;
    const periodText = startDate && endDate ? `${startDate} ~ ${endDate}` : "";
    const complexText = !hideComplexSearch && complexName ? ` · ${complexName}` : "";
    const areaText = !hideComplexSearch && (minArea || maxArea) ? ` · ${usePyung ? toPyung(minArea) : minArea}~${usePyung ? toPyung(maxArea) : maxArea}${usePyung ? '평' : '㎡'}` : "";
    
    return `${regionTextStr}${complexText}${areaText}${periodText ? ` · ${periodText}` : ""}`;
  };

  return (
    <div className="bg-elevated border border-normal rounded-xl p-3 md:p-4 mb-4 shadow-sm text-strong">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4 mb-2 md:mb-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-xs md:text-sm font-bold text-strong whitespace-nowrap">
            {hideComplexSearch ? t.filterTitleOverview : t.filterTitleAnalysis}
          </h2>
          {/* 접혔을 때의 요약 텍스트 또는 데스크톱에서 가볍게 보여줄 서브 텍스트 */}
          {(!expanded && isMobile) ? (
            <span className="text-[11px] text-neutral truncate max-w-[200px] md:max-w-none">
              {getFilterSummaryText()}
            </span>
          ) : (
            <span className="hidden md:inline text-[11px] text-assistive font-normal">
              {hideComplexSearch ? t.filterSubtitleOverview : t.filterSubtitleAnalysis}
            </span>
          )}
        </div>
        {isMobile && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-neutral hover:text-strong transition shrink-0"
            aria-label={expanded ? "접기" : "펼치기"}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* 필터 폼 */}
      {(expanded || !isMobile) && (
        <div className="space-y-3">
          {hideComplexSearch ? (
            /* 종합 현황 모드 (1줄 콤팩트 레이아웃) */
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              {/* 프리셋 드롭다운 & 지역 검색 */}
              <div className="flex flex-row items-end gap-2 flex-grow min-w-0">
                {/* 프리셋 셀렉트 박스 */}
                <div className="flex flex-col gap-1 shrink-0">
                  <label className="text-[11px] font-semibold text-neutral">프리셋</label>
                  <div className="flex items-center gap-1">
                    <select
                      value={selectedPresetId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setSelectedPresetId("");
                          handleReset();
                        } else {
                          handleLoadPreset(val);
                        }
                      }}
                      className="bg-normal border border-normal rounded-lg px-2.5 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary w-24 md:w-32"
                    >
                      <option value="">{t.presetSelectOverview}</option>
                      {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowPresetModal(true)}
                      title={t.presetSaveBtn}
                      className="p-2 rounded-lg border border-normal bg-normal text-neutral hover:text-strong transition shrink-0"
                    >
                      <Save size={13} />
                    </button>
                    {selectedPresetId && (
                      <button
                        type="button"
                        onClick={(e) => handleDeletePreset(selectedPresetId, e)}
                        title="프리셋 삭제"
                        className="p-2 rounded-lg border border-normal bg-normal text-warn hover:bg-warn/10 transition shrink-0"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 지역 검색 */}
                <div className="flex flex-col gap-1 flex-grow min-w-0">
                  <label className="text-[11px] font-semibold text-neutral">{t.regionLabel}</label>
                  <RegionSearchInput
                    value={regionText}
                    onChange={setRegionText}
                    onSelect={(candidate: RegionSearchResult) => {
                      setRegionText(candidate.displayName);
                      onFilterChange({ ...filter, lawdCode: candidate.lawdCode, regionName: candidate.displayName }, candidate.displayName);
                    }}
                    placeholder={t.regionPlaceholder}
                    className="w-full bg-normal border border-normal rounded-lg px-2.5 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                    locale={locale}
                  />
                </div>
              </div>

              {/* 조회 기간 */}
              <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto">
                <label className="text-[11px] font-semibold text-neutral">{t.dateLabel}</label>
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="month"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPeriod('custom');
                    }}
                    className="w-full md:w-32 bg-normal border border-normal rounded-lg px-2 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-assistive font-semibold text-xs">~</span>
                  <input
                    type="month"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPeriod('custom');
                    }}
                    className="w-full md:w-32 bg-normal border border-normal rounded-lg px-2 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* 퀵선택 배지 */}
              <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto">
                <label className="text-[11px] font-semibold text-neutral">{t.periodQuickSelect}</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePeriodBadgeClick(1)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      period === '1year' 
                        ? "bg-primary text-white border-primary" 
                        : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                    }`}
                  >
                    {t.period1Year}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodBadgeClick(2)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      period === '2year' 
                        ? "bg-primary text-white border-primary" 
                        : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                    }`}
                  >
                    {t.period2Year}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePeriodBadgeClick(3)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      period === '3year' 
                        ? "bg-primary text-white border-primary" 
                        : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                    }`}
                  >
                    {t.period3Year}
                  </button>
                </div>
              </div>

              {/* 실행 / 초기화 버튼 */}
              <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-alternative hover:bg-alternative/80 text-neutral hover:text-strong text-xs font-bold rounded-lg transition-colors border border-normal"
                >
                  <RotateCcw size={12} />
                  <span>{t.buttonReset}</span>
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-4 py-1.5 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-opacity"
                >
                  <Play size={12} />
                  <span>{t.buttonApply}</span>
                </button>
              </div>
            </div>
          ) : (
            /* 단지 분석 모드 (2줄 조밀 레이아웃) */
            <div className="space-y-3">
              {/* 1행: 입력 필드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* 프리셋 & 지역 검색 */}
                <div className="flex flex-row items-end gap-2 md:col-span-2">
                  {/* 프리셋 셀렉트 박스 */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <label className="text-[11px] font-semibold text-neutral">프리셋</label>
                    <div className="flex items-center gap-1">
                      <select
                        value={selectedPresetId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setSelectedPresetId("");
                            handleReset();
                          } else {
                            handleLoadPreset(val);
                          }
                        }}
                        className="bg-normal border border-normal rounded-lg px-2.5 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary w-24 md:w-32"
                      >
                        <option value="">{t.presetSelectAnalysis}</option>
                        {presets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowPresetModal(true)}
                        title={t.presetSaveBtn}
                        className="p-2 rounded-lg border border-normal bg-normal text-neutral hover:text-strong transition shrink-0"
                      >
                        <Save size={13} />
                      </button>
                      {selectedPresetId && (
                        <button
                          type="button"
                          onClick={(e) => handleDeletePreset(selectedPresetId, e)}
                          title="프리셋 삭제"
                          className="p-2 rounded-lg border border-normal bg-normal text-warn hover:bg-warn/10 transition shrink-0"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 지역 검색 */}
                  <div className="flex flex-col gap-1 flex-grow min-w-0">
                    <label className="text-[11px] font-semibold text-neutral">{t.regionLabel}</label>
                    <RegionSearchInput
                      value={regionText}
                      onChange={setRegionText}
                      onSelect={(candidate: RegionSearchResult) => {
                        setRegionText(candidate.displayName);
                        onFilterChange({ ...filter, lawdCode: candidate.lawdCode, regionName: candidate.displayName }, candidate.displayName);
                      }}
                      placeholder={t.regionPlaceholder}
                      className="w-full bg-normal border border-normal rounded-lg px-2.5 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                      locale={locale}
                    />
                  </div>
                </div>

                {/* 아파트 단지명 */}
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[11px] font-semibold text-neutral flex items-center gap-1">
                    <span>{t.complexLabel}</span>
                    {searchingComplexes && <span className="text-[9px] text-neutral animate-pulse">{t.loadingComplex}</span>}
                  </label>
                  <input
                    ref={complexInputRef}
                    type="text"
                    value={complexName}
                    onChange={(e) => {
                      setComplexName(e.target.value);
                      if (filter.lawdCode) {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (filter.lawdCode) {
                        setShowSuggestions(true);
                      } else if (filteredSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1); }, 150)}
                    placeholder={filter.lawdCode ? t.complexPlaceholderWithCode : t.complexPlaceholderNoCode}
                    className="w-full bg-normal border border-normal rounded-lg px-2.5 py-1.5 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-1 focus:ring-primary"
                    autoComplete="off"
                  />

                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-60 overflow-auto rounded-lg border border-normal bg-elevated py-1 shadow-lg">
                      {filteredSuggestions.map((item, index) => (
                        <li key={`${item.name}-${item.lawdCode}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectSuggestion(item)}
                            className={`w-full text-left px-3 py-1.5 text-xs text-strong transition-colors ${
                              index === activeIndex ? "bg-primary text-white font-semibold" : "hover:bg-alternative"
                            }`}
                          >
                            <span>{item.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 전용 면적 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-neutral">{t.areaLabel}</label>
                    <button
                      onClick={() => setUsePyung(!usePyung)}
                      className="text-[9px] text-primary hover:underline font-bold"
                    >
                      {usePyung ? t.areaViewM2 : t.areaViewPyung}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder={usePyung ? t.areaMinPlaceholderPyung : t.areaMinPlaceholderM2}
                      value={usePyung ? toPyung(minArea) : minArea}
                      onChange={(e) => handleAreaChange(e.target.value, "min")}
                      className="w-full bg-normal border border-normal rounded-lg px-2 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-assistive font-semibold text-xs">~</span>
                    <input
                      type="number"
                      placeholder={usePyung ? t.areaMaxPlaceholderPyung : t.areaMaxPlaceholderM2}
                      value={usePyung ? toPyung(maxArea) : maxArea}
                      onChange={(e) => handleAreaChange(e.target.value, "max")}
                      className="w-full bg-normal border border-normal rounded-lg px-2 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* 2행: 기간 & 실행 버튼 */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pt-3 border-t border-normal">
                <div className="flex flex-col md:flex-row md:items-center gap-3 flex-grow">
                  {/* 조회 기간 */}
                  <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto">
                    <label className="text-[11px] font-semibold text-neutral">{t.dateLabel}</label>
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="month"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setPeriod('custom');
                        }}
                        className="w-full md:w-32 bg-normal border border-normal rounded-lg px-2 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-assistive font-semibold text-xs">~</span>
                      <input
                        type="month"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setPeriod('custom');
                        }}
                        className="w-full md:w-32 bg-normal border border-normal rounded-lg px-2 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* 퀵선택 배지 */}
                  <div className="flex flex-col gap-1 shrink-0 w-full md:w-auto">
                    <label className="text-[11px] font-semibold text-neutral">{t.periodQuickSelect}</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePeriodBadgeClick(1)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          period === '1year' 
                            ? "bg-primary text-white border-primary" 
                            : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                        }`}
                      >
                        {t.period1Year}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePeriodBadgeClick(2)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          period === '2year' 
                            ? "bg-primary text-white border-primary" 
                            : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                        }`}
                      >
                        {t.period2Year}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePeriodBadgeClick(3)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          period === '3year' 
                            ? "bg-primary text-white border-primary" 
                            : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                        }`}
                      >
                        {t.period3Year}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 실행 / 초기화 버튼 */}
                <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-alternative hover:bg-alternative/80 text-neutral hover:text-strong text-xs font-bold rounded-lg transition-colors border border-normal"
                  >
                    <RotateCcw size={12} />
                    <span>{t.buttonReset}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="flex-1 md:flex-initial flex items-center justify-center gap-1 px-4 py-1.5 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-opacity"
                  >
                    <Play size={12} />
                    <span>{t.buttonApply}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 프리셋 이름 입력 모달 */}
      {showPresetModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="bg-elevated border border-normal w-full max-w-md p-5 rounded-xl shadow-lg relative z-[51] mx-4 animate-in fade-in zoom-in-95 duration-150 text-strong">
            <h3 className="text-base font-bold text-strong mb-1">{t.presetModalTitle}</h3>
            <p className="text-xs text-neutral mb-3">{t.presetModalDesc}</p>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs text-neutral font-semibold">{t.presetNameLabel}</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder={t.presetNamePlaceholder}
                className="w-full bg-alternative border border-normal rounded-lg px-3 py-1.5 text-xs text-strong focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errorMsg && <p className="text-xs text-warn mt-1">{errorMsg}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPresetModal(false);
                  setNewPresetName("");
                  setErrorMsg("");
                }}
                className="px-3.5 py-1.5 bg-alternative hover:bg-alternative/80 text-neutral text-xs font-semibold rounded-lg transition"
              >
                {t.buttonCancel}
              </button>
              <button
                onClick={handleSavePreset}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-lg transition"
              >
                {t.buttonSave}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}