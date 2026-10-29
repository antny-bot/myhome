import { useState, useEffect, useRef } from "react";
import type { GraphFilter, ComplexMetaFilter } from "@myhome/shared";
import {
  fetchDbRegions,
  searchComplexNames as searchComplexNamesApi,
  fetchComplexesByRegion,
} from "../../../api/index.js";
import { usePresetManagement } from "./usePresetManagement.js";

interface UseFilterPanelStateProps {
  filter: GraphFilter;
  regionName: string;
  onFilterChange: (filter: GraphFilter, regionName: string) => void;
  onApply: (appliedFilter: GraphFilter) => void;
  hideComplexSearch?: boolean;
}

export function useFilterPanelState({
  filter,
  regionName,
  onFilterChange,
  onApply,
  hideComplexSearch = false,
}: UseFilterPanelStateProps) {
  // 로컬 필터 상태
  const [regionText, setRegionText] = useState(regionName || "");
  const [startDate, setStartDate] = useState(filter.startDate || "");
  const [endDate, setEndDate] = useState(filter.endDate || "");
  const [complexName, setComplexName] = useState(filter.complexName || "");
  const [minArea, setMinArea] = useState(filter.minArea !== undefined ? String(filter.minArea) : "");
  const [maxArea, setMaxArea] = useState(filter.maxArea !== undefined ? String(filter.maxArea) : "");
  const [metaFilter, setMetaFilter] = useState<ComplexMetaFilter>({
    minHouseholds: filter.minHouseholds, minTotalParking: filter.minTotalParking, minParkingPerHousehold: filter.minParkingPerHousehold, minBuildYear: filter.minBuildYear, maxBuildYear: filter.maxBuildYear,
  });

  useEffect(() => {
    setMetaFilter({
      minHouseholds: filter.minHouseholds,
      minTotalParking: filter.minTotalParking,
      minParkingPerHousehold: filter.minParkingPerHousehold,
      minBuildYear: filter.minBuildYear,
      maxBuildYear: filter.maxBuildYear,
    });
  }, [filter.minHouseholds, filter.minTotalParking, filter.minParkingPerHousehold, filter.minBuildYear, filter.maxBuildYear]);

  const [selectedRegions, setSelectedRegions] = useState<Array<{ lawdCode: string; regionName: string }>>(() => {
    if (hideComplexSearch) {
      const saved = localStorage.getItem("myhome_selected_regions");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error("Failed to parse saved regions", e);
        }
      }
    }
    if (filter.lawdCodes && filter.lawdCodes.length > 0) {
      return filter.lawdCodes.map((code) => ({ lawdCode: code, regionName: "" }));
    }
    if (filter.lawdCode) {
      return [{ lawdCode: filter.lawdCode, regionName: regionName || "" }];
    }
    return [];
  });

  // DB 수집 지역 목록
  const [dbRegions, setDbRegions] = useState<Array<{ lawdCode: string; displayName: string }>>([]);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const regionDropdownRef = useRef<HTMLDivElement>(null);

  // 단지 분석 모드 지역 선택 드롭다운 상태
  const [showAnalysisRegionDropdown, setShowAnalysisRegionDropdown] = useState(false);
  const analysisRegionDropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 검색어
  const [overviewSearchQuery, setOverviewSearchQuery] = useState("");
  const [analysisSearchQuery, setAnalysisSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchDbRegions();
        setDbRegions(list);
      } catch (err) {
        console.error("Failed to load db regions", err);
      }
    })();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setShowRegionDropdown(false);
      }
      if (analysisRegionDropdownRef.current && !analysisRegionDropdownRef.current.contains(event.target as Node)) {
        setShowAnalysisRegionDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (filter.lawdCodes && filter.lawdCodes.length > 0) {
      const mapped = filter.lawdCodes.map((code) => {
        const found = dbRegions.find((r) => r.lawdCode === code);
        return { lawdCode: code, regionName: found ? found.displayName : "" };
      });
      setSelectedRegions(mapped);
    } else if (filter.lawdCode) {
      const found = dbRegions.find((r) => r.lawdCode === filter.lawdCode);
      setSelectedRegions([{ lawdCode: filter.lawdCode, regionName: found ? found.displayName : regionName || "" }]);
    } else {
      setSelectedRegions([]);
    }
  }, [filter.lawdCodes, filter.lawdCode, dbRegions, regionName]);

  // 전역 단지 검색 자동완성
  const [globalSuggestions, setGlobalSuggestions] = useState<Array<{ name: string; lawdCode: string; regionName: string }>>([]);
  const [apartments, setApartments] = useState<string[]>([]);
  const [searchingComplexes, setSearchingComplexes] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const complexInputRef = useRef<HTMLInputElement>(null);

  // 기간 선택
  const [period, setPeriod] = useState<string>(
    filter.startDate && filter.endDate ? "custom" : "none"
  );

  const handlePeriodBadgeClick = (years: number) => {
    const key = `${years}year`;
    if (period === key) {
      setStartDate("");
      setEndDate("");
      setPeriod("none");
      const updated: GraphFilter = {
        ...filter,
        startDate: undefined,
        endDate: undefined,
      };
      onFilterChange(updated, regionName);
      onApply(updated);
    } else {
      const now = new Date();
      const endYear = now.getFullYear();
      const endMonth = String(now.getMonth() + 1).padStart(2, "0");
      const endStr = `${endYear}-${endMonth}`;

      const startYear = endYear - years;
      const startMonth = String(now.getMonth() + 1).padStart(2, "0");
      const startStr = `${startYear}-${startMonth}`;

      setStartDate(startStr);
      setEndDate(endStr);
      setPeriod(key);

      const updated: GraphFilter = {
        ...filter,
        startDate: startStr,
        endDate: endStr,
      };
      onFilterChange(updated, regionName);
      onApply(updated);
    }
  };

  useEffect(() => {
    setStartDate(filter.startDate || "");
    setEndDate(filter.endDate || "");
  }, [filter.startDate, filter.endDate]);

  useEffect(() => {
    if (!filter.lawdCode) {
      setApartments([]);
      return;
    }
    let canceled = false;
    (async () => {
      try {
        setSearchingComplexes(true);
        const data = await fetchComplexesByRegion(filter.lawdCode!);
        if (!canceled) setApartments(data);
      } catch (err) {
        if (!canceled) console.error("Failed to fetch complexes by region", err);
      } finally {
        if (!canceled) setSearchingComplexes(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [filter.lawdCode]);

  const suggestions = filter.lawdCode
    ? apartments
        .filter((apt) => !complexName || apt.toLowerCase().includes(complexName.toLowerCase()))
        .map((name) => ({ name, lawdCode: filter.lawdCode!, regionName }))
    : globalSuggestions;

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
        setSearchingComplexes(true);
        const results = await searchComplexNamesApi(query, undefined, metaFilter);
        setGlobalSuggestions(results);
        const isCurrentFocused = document.activeElement === complexInputRef.current;
        setShowSuggestions(results.length > 0 && isCurrentFocused);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Failed to search complex names", err);
      } finally {
        setSearchingComplexes(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [complexName, filter.lawdCode, metaFilter]);

  useEffect(() => {
    if (filter.lawdCode && dbRegions.length > 0) {
      const found = dbRegions.find((r) => r.lawdCode === filter.lawdCode);
      if (found) {
        if (!regionText || regionText !== found.displayName) setRegionText(found.displayName);
        if (!regionName || regionName !== found.displayName) onFilterChange({ ...filter, lawdCode: found.lawdCode }, found.displayName);
      }
    }
  }, [filter.lawdCode, dbRegions]);

  useEffect(() => {
    if (hideComplexSearch && selectedRegions.length > 0) {
      try {
        localStorage.setItem("myhome_selected_regions", JSON.stringify(selectedRegions));
      } catch (e) {
        console.error("Failed to save selected regions to localStorage", e);
      }
    }
  }, [selectedRegions, hideComplexSearch]);

  const [isPyungUnit, setIsPyungUnit] = useState(true);

  // 프리셋 로직 위임
  const presetManagement = usePresetManagement({
    hideComplexSearch,
    filter,
    regionText,
    complexName,
    startDate,
    endDate,
    minArea,
    maxArea,
    metaFilter,
    selectedRegions,
    dbRegions,
    setSelectedRegions,
    setStartDate,
    setEndDate,
    setRegionText,
    setComplexName,
    setMinArea,
    setMaxArea,
    setMetaFilter,
    onFilterChange,
    onApply,
  });

  const toPyung = (m2: number | string): string => {
    if (!m2 || isNaN(Number(m2))) return "";
    return (Math.round((Number(m2) / 3.30578) * 10) / 10).toString();
  };

  const toM2 = (pyung: number | string): string => {
    if (!pyung || isNaN(Number(pyung))) return "";
    return Math.round(Number(pyung) * 3.30578).toString();
  };

  const handleAreaChange = (val: string, type: "min" | "max") => {
    if (isPyungUnit) {
      const m2Val = toM2(val);
      if (type === "min") setMinArea(m2Val);
      else setMaxArea(m2Val);
    } else {
      if (type === "min") setMinArea(val);
      else setMaxArea(val);
    }
  };

  const handleApply = () => {
    let nextFilter: GraphFilter;
    if (hideComplexSearch) {
      const selectedCodes = selectedRegions.map((r) => r.lawdCode);
      const selectedNames = selectedRegions.map((r) => r.regionName).join(", ");
      nextFilter = {
        lawdCodes: selectedCodes,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minHouseholds: metaFilter.minHouseholds,
        minTotalParking: metaFilter.minTotalParking,
        minParkingPerHousehold: metaFilter.minParkingPerHousehold,
        minBuildYear: metaFilter.minBuildYear,
        maxBuildYear: metaFilter.maxBuildYear,
      };
      onFilterChange(nextFilter, selectedNames);
    } else {
      nextFilter = {
        lawdCode: filter.lawdCode,
        complexName: complexName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minArea: minArea ? Number(minArea) : undefined,
        maxArea: maxArea ? Number(maxArea) : undefined,
        minHouseholds: metaFilter.minHouseholds,
        minTotalParking: metaFilter.minTotalParking,
        minParkingPerHousehold: metaFilter.minParkingPerHousehold,
        minBuildYear: metaFilter.minBuildYear,
        maxBuildYear: metaFilter.maxBuildYear,
      };
      onFilterChange(nextFilter, regionText);
    }
    onApply(nextFilter);
  };

  const handleReset = () => {
    setRegionText("");
    setStartDate("");
    setEndDate("");
    setComplexName("");
    setMinArea("");
    setMaxArea("");
    setPeriod("none");
    presetManagement.setSelectedPresetId("");
    setSelectedRegions([]);
    setMetaFilter({});
    onFilterChange({}, "");
    onApply({});
  };

  return {
    regionText, setRegionText, startDate, setStartDate, endDate, setEndDate,
    complexName, setComplexName, minArea, maxArea, metaFilter, setMetaFilter,
    selectedRegions, setSelectedRegions, dbRegions, showRegionDropdown, setShowRegionDropdown,
    regionDropdownRef, showAnalysisRegionDropdown, setShowAnalysisRegionDropdown, analysisRegionDropdownRef,
    overviewSearchQuery, setOverviewSearchQuery, analysisSearchQuery, setAnalysisSearchQuery,
    suggestions, searchingComplexes, showSuggestions, setShowSuggestions, activeIndex, setActiveIndex,
    complexInputRef, period, setPeriod,
    handlePeriodBadgeClick,
    isPyungUnit,
    setIsPyungUnit,
    presets: presetManagement.presets,
    selectedPresetId: presetManagement.selectedPresetId,
    handleSelectPreset: presetManagement.handleSelectPreset,
    isPresetModalOpen: presetManagement.isPresetModalOpen,
    setIsPresetModalOpen: presetManagement.setIsPresetModalOpen,
    presetNameInput: presetManagement.presetNameInput,
    setPresetNameInput: presetManagement.setPresetNameInput,
    presetModalError: presetManagement.presetModalError,
    setPresetModalError: presetManagement.setPresetModalError,
    handleSavePreset: presetManagement.handleSavePreset,
    handleDeletePreset: presetManagement.handleDeletePreset,
    toPyung,
    handleAreaChange,
    handleApply,
    handleReset,
  };
}

export type FilterPanelState = ReturnType<typeof useFilterPanelState>;
