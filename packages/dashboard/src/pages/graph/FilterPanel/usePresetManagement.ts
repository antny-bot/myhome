import { useState, useEffect } from "react";
import type { GraphFilter, ComplexMetaFilter, GraphPreset } from "@myhome/shared";
import {
  loadPresetsOverview,
  savePresetOverview,
  deletePresetOverview,
  loadPresetsAnalysis,
  savePresetAnalysis,
  deletePresetAnalysis,
} from "../../../api/index.js";

interface UsePresetManagementProps {
  hideComplexSearch: boolean;
  filter: GraphFilter;
  regionText: string;
  complexName: string;
  startDate: string;
  endDate: string;
  minArea: string;
  maxArea: string;
  metaFilter: ComplexMetaFilter;
  selectedRegions: Array<{ lawdCode: string; regionName: string }>;
  dbRegions: Array<{ lawdCode: string; displayName: string }>;
  setSelectedRegions: (regions: Array<{ lawdCode: string; regionName: string }>) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setRegionText: (v: string) => void;
  setComplexName: (v: string) => void;
  setMinArea: (v: string) => void;
  setMaxArea: (v: string) => void;
  setMetaFilter: (mf: ComplexMetaFilter) => void;
  onFilterChange: (f: GraphFilter, regionName: string) => void;
  onApply: (f: GraphFilter) => void;
}

export function usePresetManagement({
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
}: UsePresetManagementProps) {
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState("");
  const [presetModalError, setPresetModalError] = useState("");

  const loadAllPresets = async () => {
    try {
      const data = hideComplexSearch
        ? await loadPresetsOverview()
        : await loadPresetsAnalysis();
      setPresets(data as any[]);
    } catch (err) {
      console.error("Failed to load presets", err);
    }
  };

  useEffect(() => {
    loadAllPresets();
  }, [hideComplexSearch]);

  const handleSelectPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);

    if (hideComplexSearch) {
      const f = (preset as GraphPreset).filter;
      if (f.lawdCodes && f.lawdCodes.length > 0) {
        const mapped = f.lawdCodes.map((code) => {
          const found = dbRegions.find((r) => r.lawdCode === code);
          return { lawdCode: code, regionName: found ? found.displayName : "" };
        });
        setSelectedRegions(mapped);
      } else if (f.lawdCode) {
        const found = dbRegions.find((r) => r.lawdCode === f.lawdCode);
        setSelectedRegions([
          { lawdCode: f.lawdCode, regionName: found ? found.displayName : f.regionName || "" },
        ]);
      } else {
        setSelectedRegions([]);
      }
      setStartDate(f.startDate || "");
      setEndDate(f.endDate || "");
      setMetaFilter({
        minHouseholds: f.minHouseholds,
        minTotalParking: f.minTotalParking,
        minParkingPerHousehold: f.minParkingPerHousehold,
        minBuildYear: f.minBuildYear,
        maxBuildYear: f.maxBuildYear,
      });
      onFilterChange(f, f.regionName || preset.name);
      onApply(f);
    } else {
      const p = preset as any;
      setRegionText(p.regionName || "");
      setComplexName(p.buildingName || "");
      setMinArea(p.areaM2 ? String(p.areaM2) : "");
      setMaxArea(p.areaMaxM2 ? String(p.areaMaxM2) : "");
      const nextFilter: GraphFilter = {
        ...filter,
        complexName: p.buildingName || undefined,
        minArea: p.areaM2 || undefined,
        maxArea: p.areaMaxM2 || undefined,
      };
      onFilterChange(nextFilter, p.regionName || "");
      onApply(nextFilter);
    }
  };

  const handleSavePreset = async () => {
    if (!presetNameInput.trim()) {
      setPresetModalError("presetErrNoName");
      return;
    }

    try {
      if (hideComplexSearch) {
        const currentFilter: GraphFilter = {
          lawdCodes: selectedRegions.map((r) => r.lawdCode),
          regionName: selectedRegions.map((r) => r.regionName).join(", "),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          minHouseholds: metaFilter.minHouseholds,
          minTotalParking: metaFilter.minTotalParking,
          minParkingPerHousehold: metaFilter.minParkingPerHousehold,
          minBuildYear: metaFilter.minBuildYear,
          maxBuildYear: metaFilter.maxBuildYear,
        };
        await savePresetOverview(presetNameInput.trim(), currentFilter);
      } else {
        if (!regionText) {
          setPresetModalError("presetErrNoRegion");
          return;
        }
        if (!complexName) {
          setPresetModalError("presetErrNoComplex");
          return;
        }
        await savePresetAnalysis({
          name: presetNameInput.trim(),
          regionName: regionText,
          buildingName: complexName,
          areaM2: minArea ? Number(minArea) : undefined,
          areaMaxM2: maxArea ? Number(maxArea) : undefined,
        });
      }
      setIsPresetModalOpen(false);
      setPresetNameInput("");
      setPresetModalError("");
      await loadAllPresets();
    } catch (err: any) {
      console.error("Failed to save preset", err);
      setPresetModalError(err.message || "프리셋 저장 실패");
    }
  };

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (hideComplexSearch) {
        await deletePresetOverview(id);
      } else {
        await deletePresetAnalysis(id);
      }
      if (selectedPresetId === id) setSelectedPresetId("");
      await loadAllPresets();
    } catch (err) {
      console.error("Failed to delete preset", err);
    }
  };

  return {
    presets,
    selectedPresetId,
    setSelectedPresetId,
    isPresetModalOpen,
    setIsPresetModalOpen,
    presetNameInput,
    setPresetNameInput,
    presetModalError,
    setPresetModalError,
    handleSelectPreset,
    handleSavePreset,
    handleDeletePreset,
    loadAllPresets,
  };
}
