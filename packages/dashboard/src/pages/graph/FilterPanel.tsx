import React, { useState, useEffect } from "react";
import { RegionSearchInput } from "../../components/RegionSearchInput";
import { GraphFilter, GraphPreset } from "@myhome/shared";
import { loadPresets, savePreset, deletePreset, getApartments } from "../../api";
import { Play, Save, FolderOpen, Trash2, RotateCcw } from "lucide-react";
import type { RegionSearchResult } from "../../types";

interface FilterPanelProps {
  filter: GraphFilter;
  regionName: string;
  onFilterChange: (filter: GraphFilter, regionName: string) => void;
  onApply: () => void;
}

export default function FilterPanel({
  filter,
  regionName,
  onFilterChange,
  onApply,
}: FilterPanelProps) {
  // 로컬 필터 상태
  const [regionText, setRegionText] = useState(regionName || "");
  const [startDate, setStartDate] = useState(filter.startDate || "");
  const [endDate, setEndDate] = useState(filter.endDate || "");
  const [complexName, setComplexName] = useState(filter.complexName || "");
  const [minArea, setMinArea] = useState(filter.minArea !== undefined ? String(filter.minArea) : "");
  const [maxArea, setMaxArea] = useState(filter.maxArea !== undefined ? String(filter.maxArea) : "");

  // 아파트 자동완성 관련 상태
  const [allApartments, setAllApartments] = useState<string[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // lawdCode가 변경되면 아파트 목록을 다시 불러온다
  useEffect(() => {
    const loadApts = async () => {
      if (!filter.lawdCode) {
        setAllApartments([]);
        return;
      }
      try {
        const list = await getApartments(filter.lawdCode);
        setAllApartments(list);
      } catch (err) {
        console.error("Failed to load apartments", err);
      }
    };
    loadApts();
  }, [filter.lawdCode]);

  // complexName이 타이핑될 때 실시간 필터링
  useEffect(() => {
    const query = complexName.trim().toLowerCase();
    if (!query) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = allApartments.filter((apt) =>
      apt.toLowerCase().includes(query)
    );
    setFilteredSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveIndex(-1);
  }, [complexName, allApartments]);

  useEffect(() => {
    setRegionText(regionName || "");
  }, [regionName]);
  
  // 평형 <-> ㎡ 단위 토글을 위한 상태
  const [usePyung, setUsePyung] = useState(false);

  // 프리셋 관련 상태
  const [presets, setPresets] = useState<GraphPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
        setComplexName(selected);
        setShowSuggestions(false);
        // 부모 컴포넌트에 즉시 필터 변경 알리고 분석 실행
        onFilterChange(
          {
            lawdCode: filter.lawdCode,
            regionName,
            complexName: selected,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            minArea: minArea ? Number(minArea) : undefined,
            maxArea: maxArea ? Number(maxArea) : undefined,
          },
          regionName
        );
        setTimeout(() => onApply(), 50);
      } else if (filteredSuggestions.length === 1) {
        e.preventDefault();
        const selected = filteredSuggestions[0];
        setComplexName(selected);
        setShowSuggestions(false);
        onFilterChange(
          {
            lawdCode: filter.lawdCode,
            regionName,
            complexName: selected,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            minArea: minArea ? Number(minArea) : undefined,
            maxArea: maxArea ? Number(maxArea) : undefined,
          },
          regionName
        );
        setTimeout(() => onApply(), 50);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const selectSuggestion = (name: string) => {
    setComplexName(name);
    setShowSuggestions(false);
    onFilterChange(
      {
        lawdCode: filter.lawdCode,
        regionName,
        complexName: name,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
      },
      regionName
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 shadow-xl text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">📊 실거래 분석 필터</h2>
          <p className="text-xs text-slate-400 mt-1">기간, 지역, 단지명, 평형 조건을 설정해 데이터를 탐색합니다.</p>
        </div>

        {/* 프리셋 영역 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedPresetId}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10 appearance-none cursor-pointer"
            >
              <option value="">📁 프리셋 불러오기</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <FolderOpen size={16} />
            </div>
          </div>

          {selectedPresetId && (
            <button
              onClick={(e) => handleDeletePreset(selectedPresetId, e)}
              className="p-2 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900 text-rose-400 rounded-lg transition"
              title="현재 프리셋 삭제"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            onClick={() => setShowPresetModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-sm rounded-lg transition"
          >
            <Save size={16} />
            <span>프리셋 저장</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* 지역 검색 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">지역</label>
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

        {/* 아파트명 */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-xs font-semibold text-slate-400">아파트 단지명</label>
          <input
            type="text"
            value={complexName}
            onChange={(e) => setComplexName(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => filteredSuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1); }, 150)}
            placeholder="단지명 키워드 (예: 자이)"
            className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoComplete="off"
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-60 overflow-auto rounded-lg border border-slate-750 bg-slate-900 py-1 shadow-2xl">
              {filteredSuggestions.map((item, index) => (
                <li key={item}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(item)}
                    className={`w-full text-left px-4 py-2 text-sm text-slate-200 transition-colors ${
                      index === activeIndex ? "bg-emerald-600 text-white font-semibold" : "hover:bg-slate-800"
                    }`}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 기간 선택 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">기간</label>
          <div className="flex items-center gap-1.5">
            <input
              type="month"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-slate-500">~</span>
            <input
              type="month"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 면적(평수) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-400">전용 면적</label>
            <button
              onClick={() => setUsePyung(!usePyung)}
              className="text-[10px] text-emerald-400 hover:underline"
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
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-slate-500">~</span>
            <input
              type="number"
              placeholder={usePyung ? "최대 평" : "최대 ㎡"}
              value={usePyung ? toPyung(maxArea) : maxArea}
              onChange={(e) => handleAreaChange(e.target.value, "max")}
              className="w-full bg-slate-850 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
        >
          <RotateCcw size={14} />
          <span>초기화</span>
        </button>
        <button
          onClick={handleApply}
          className="flex items-center gap-1 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-emerald-950/20 transition"
        >
          <Play size={14} />
          <span>분석 실행</span>
        </button>
      </div>

      {/* 프리셋 이름 입력 모달 */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md p-6 rounded-xl shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">💾 조회 조건 프리셋 저장</h3>
            <p className="text-xs text-slate-400 mb-4">현재 설정된 필터 조건에 이름을 붙여 저장합니다.</p>

            <div className="flex flex-col gap-1.5 mb-4">
              <label className="text-xs text-slate-400 font-semibold">프리셋 이름</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="예: 강남구 84타입 최근 거래"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errorMsg && <p className="text-xs text-rose-500 mt-1">{errorMsg}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPresetModal(false);
                  setNewPresetName("");
                  setErrorMsg("");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleSavePreset}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition"
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
