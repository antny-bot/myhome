import { useState } from "react";
import type { RegionMapData } from "@myhome/shared";
import { loadRegionMapComplexes, triggerBuildingMetaBatch, triggerGeocodeBatch } from "../../api.js";

interface UseRegionBatchesProps {
  selectedLawdCode: string;
  setMapData: (data: RegionMapData) => void;
}

export function useRegionBatches({ selectedLawdCode, setMapData }: UseRegionBatchesProps) {
  const [batchLoading, setBatchLoading] = useState(false);
  const [buildingBatchLoading, setBuildingBatchLoading] = useState(false);
  const [buildingBatchProgress, setBuildingBatchProgress] = useState<{
    processed: number;
    total: number;
    success: number;
    failed: number;
  } | null>(null);
  const [batchProgress, setBatchProgress] = useState<{
    processed: number;
    total: number;
    success: number;
    failed: number;
  } | null>(null);

  const handleRunBuildingMetaBatch = async () => {
    if (buildingBatchLoading || !selectedLawdCode) return;
    setBuildingBatchLoading(true);
    setBuildingBatchProgress(null);

    try {
      let processed = 0;
      let success = 0;
      let failed = 0;

      for (let step = 0; step < 3; step++) {
        const res = await triggerBuildingMetaBatch(selectedLawdCode, 20);
        if (res.total === 0) break;
        processed += res.total;
        success += res.success;
        failed += res.failed;
        setBuildingBatchProgress({ processed, total: processed, success, failed });
        if (res.total < 20) break;
        await new Promise((r) => setTimeout(r, 800));
      }

      const updated = await loadRegionMapComplexes(selectedLawdCode);
      setMapData(updated);
    } catch (err: any) {
      console.error("Building meta batch failed:", err);
      alert("건축물대장 수집 중 오류가 발생했습니다: " + (err.message || ""));
    } finally {
      setBuildingBatchLoading(false);
    }
  };

  const handleRunGeocodeBatch = async () => {
    if (batchLoading || !selectedLawdCode) return;
    setBatchLoading(true);
    setBatchProgress(null);

    try {
      let processed = 0;
      let success = 0;
      let failed = 0;

      for (let step = 0; step < 3; step++) {
        const res = await triggerGeocodeBatch(selectedLawdCode, 20);
        if (res.total === 0) break;
        processed += res.total;
        success += res.success;
        failed += res.failed;
        setBatchProgress({ processed, total: processed, success, failed });
        if (res.total < 20) break;
        await new Promise((r) => setTimeout(r, 1000));
      }

      const updated = await loadRegionMapComplexes(selectedLawdCode);
      setMapData(updated);
    } catch (err: any) {
      console.error("Geocoding batch failed:", err);
      alert("좌표 수집 중 오류가 발생했습니다: " + (err.message || ""));
    } finally {
      setBatchLoading(false);
    }
  };

  return {
    batchLoading,
    batchProgress,
    buildingBatchLoading,
    buildingBatchProgress,
    handleRunGeocodeBatch,
    handleRunBuildingMetaBatch,
  };
}
