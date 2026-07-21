import React, { useState, useEffect, useRef } from "react";
import { RegionSearchInput } from "../../components/RegionSearchInput";
import { GraphFilter, GraphPreset } from "@myhome/shared";
import { loadPresets, savePreset, deletePreset, searchComplexNames as searchComplexNamesApi, fetchComplexesByRegion } from "../../api";
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
}

export default function FilterPanel({
  filter,
  regionName,
  onFilterChange,
  onApply,
  hideComplexSearch = false,
}: FilterPanelProps) {
  const { isMobile } = useBreakpoint();

  // 로컬 필터 상태
  const [regionText, setRegionText] = useState(regionName || "");
  const [startDate, setStartDate] = useState(filter.startDate || "");
  const [endDate, setEndDate] = useState(filter.endDate || "");
  const [complexName, setComplexName] = useState(filter.complexName || "");
  const [minArea, setMinArea] = useState(filter.minArea !== undefined ? String(filter.minArea) : "");
  const [maxArea, setMaxArea] = useState(filter.maxArea !== undefined ? String(filter.maxArea) : "");

  // 글로벌 단지 검색 자동완성
  const [globalSuggestions, setGlobalSuggestions] = useState<Array<{ name: string; lawdCode: string; regionName: string }>>([]);
  const [apartments, setApartments] = useState<string[]>([]);
  const [searchingComplexes, setSearchingComplexes] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const complexInputRef = useRef<HTMLInputElement>(null);

  // lawdCode 확정 시 해당 지역 아파트 목록 미리 로드 (제한 없이 전체 로드)
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
      const data = await loadPresets();
      setPresets(data);
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
    onFilterChange({}, "");
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      setErrorMsg("프리셋 이름을 입력해 주세요.");
      return;
    }
    try {
      const currentFilter: GraphFilter = {
        lawdCode: filter.lawdCode,
        regionName: regionName,
        complexName: complexName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
      };
      await savePreset(newPresetName, currentFilter);
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
    if (!confirm("이 프리셋을 삭제하시겠습니까?")) return;
    try {
      await deletePreset(id);
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

    const f = preset.filter;
    setRegionText(f.regionName || "");
    setStartDate(f.startDate || "");
    setEndDate(f.endDate || "");
    setComplexName(f.complexName || "");
    setMinArea(f.minArea !== undefined ? String(f.minArea) : "");
    setMaxArea(f.maxArea !== undefined ? String(f.maxArea) : "");

    // 부모 상태 갱신
    onFilterChange(f, f.regionName || preset.name);
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

  return (
    <div className="bg-elevated border border-normal rounded-xl p-6 mb-6 shadow-sm text-strong">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-normal pb-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h2 className="text-lg font-bold text-strong">📊 {hideComplexSearch ? "지역·기간 필터" : "실거래 분석 필터"}</h2>
            <p className="text-xs text-neutral mt-1">{hideComplexSearch ? "기간과 지역을 설정해 거시 통계 데이터를 탐색합니다." : "기간, 지역, 단지명, 평형 조건을 설정해 데이터를 탐색합니다."}</p>
          </div>
          {isMobile && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-neutral hover:text-strong transition"
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* 프리셋 칩 영역 */}
      {(expanded || !isMobile) && (
        <>
          {presets.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleLoadPreset(p.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    selectedPresetId === p.id
                      ? "bg-primary text-white border-primary"
                      : "bg-normal text-neutral border-normal hover:border-primary/50 hover:text-strong"
                  }`}
                >
                  {p.name}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleDeletePreset(p.id, e)}
                    onKeyDown={(e) => e.key === "Enter" && handleDeletePreset(p.id, e as any)}
                    className="ml-0.5 hover:text-warn transition cursor-pointer"
                    aria-label="프리셋 삭제"
                  >
                    <X size={12} />
                  </span>
                </button>
              ))}
              <button
                onClick={() => setShowPresetModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-normal text-neutral hover:border-primary/50 hover:text-strong transition"
              >
                <Save size={12} />
                저장
              </button>
            </div>
          )}

          {presets.length === 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <button
                onClick={() => setShowPresetModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-normal text-neutral hover:border-primary/50 hover:text-strong transition"
              >
                <Save size={12} />
                프리셋 저장
              </button>
            </div>
          )}

          <div className={`grid ${isMobile ? 'grid-cols-1' : hideComplexSearch ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'} gap-4 mb-6`}>
            {/* 지역 검색 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral">지역</label>
              <RegionSearchInput
                value={regionText}
                onChange={setRegionText}
                onSelect={(candidate: RegionSearchResult) => {
                  setRegionText(candidate.displayName);
                  onFilterChange({ ...filter, lawdCode: candidate.lawdCode, regionName: candidate.displayName }, candidate.displayName);
                }}
                placeholder={regionName || "지역명 검색 (예: 서초구)"}
              />
            </div>

            {/* 아파트명 — hideComplexSearch가 true이면 숨김 */}
            {!hideComplexSearch && (
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-neutral">
                  아파트 단지명 {searchingComplexes && <span className="text-[10px] text-neutral animate-pulse">(로딩 중...)</span>}
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
                  placeholder={filter.lawdCode ? "단지명 검색 또는 선택" : "단지명 키워드 (예: 자이)"}
                  className="w-full bg-normal border border-normal rounded-lg px-3.5 py-2 text-sm text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary"
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
                          className={`w-full text-left px-4 py-2 text-sm text-strong transition-colors ${
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
            )}

            {/* 기간 선택 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral">기간</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="month"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-normal border border-normal rounded-lg px-2 py-1.5 text-sm text-strong focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-assistive">~</span>
                <input
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-normal border border-normal rounded-lg px-2 py-1.5 text-sm text-strong focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* 면적(평수) — hideComplexSearch가 true이면 숨김 */}
            {!hideComplexSearch && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-neutral">전용 면적</label>
                  <button
                    onClick={() => setUsePyung(!usePyung)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {usePyung ? "㎡ 단위로 보기" : "평 단위로 보기"}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder={usePyung ? "최소 평" : "최소 ㎡"}
                    value={usePyung ? toPyung(minArea) : minArea}
                    onChange={(e) => handleAreaChange(e.target.value, "min")}
                    className="w-full bg-normal border border-normal rounded-lg px-3 py-1.5 text-sm text-strong focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-assistive">~</span>
                  <input
                    type="number"
                    placeholder={usePyung ? "최대 평" : "최대 ㎡"}
                    value={usePyung ? toPyung(maxArea) : maxArea}
                    onChange={(e) => handleAreaChange(e.target.value, "max")}
                    className="w-full bg-normal border border-normal rounded-lg px-3 py-1.5 text-sm text-strong focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-normal pt-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-4 py-2 bg-alternative hover:bg-alternative text-neutral text-sm rounded-lg transition"
            >
              <RotateCcw size={14} />
              <span>초기화</span>
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-1 px-5 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-semibold rounded-lg shadow-lg shadow-primary/20 transition"
            >
              <Play size={14} />
              <span>분석 실행</span>
            </button>
          </div>
        </>
      )}

      {/* 프리셋 이름 입력 모달 */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-elevated border border-normal w-full max-w-md p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-strong mb-2">💾 조회 조건 프리셋 저장</h3>
            <p className="text-xs text-neutral mb-4">현재 설정된 필터 조건에 이름을 붙여 저장합니다.</p>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs text-neutral font-semibold">프리셋 이름</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="예: 강남구 84타입 최근 거래"
                className="w-full bg-alternative border border-normal rounded-lg px-3 py-2 text-sm text-strong focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errorMsg && <p className="text-xs text-warn mt-1">{errorMsg}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPresetModal(false);
                  setNewPresetName("");
                  setErrorMsg("");
                }}
                className="px-4 py-2 bg-alternative hover:bg-alternative text-neutral text-sm rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleSavePreset}
                className="px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-semibold rounded-lg transition"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
