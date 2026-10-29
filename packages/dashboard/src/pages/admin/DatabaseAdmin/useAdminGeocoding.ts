import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadGeocodePending,
  loadGeocodeStats,
  resetComplexCoords,
  searchComplexNames,
  triggerGeocodeBatch,
  updateComplexCoords,
} from "../../../api.js";
import type { BatchProgress, GeocodeStats } from "./types.js";

export function useAdminGeocoding() {
  const [geocodeStats, setGeocodeStats] = useState<GeocodeStats | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [shouldStopBatch, setShouldStopBatch] = useState(false);
  const shouldStopRef = useRef(false);

  const [pendingComplexes, setPendingComplexes] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const fetchGeocodeStats = async () => {
    try {
      const stats = await loadGeocodeStats();
      setGeocodeStats(stats);
    } catch (err) {
      console.error("Failed to load geocode stats", err);
    }
  };

  const fetchPendingComplexes = async () => {
    setLoadingPending(true);
    try {
      const list = await loadGeocodePending();
      setPendingComplexes(list);
    } catch (err) {
      console.error("Failed to load geocode pending complexes", err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchGeocodeStats();
    fetchPendingComplexes();
  }, []);

  const geocodePercentage = useMemo(() => {
    if (!geocodeStats || geocodeStats.total === 0) return 0;
    return Math.round((geocodeStats.geocoded / geocodeStats.total) * 100);
  }, [geocodeStats]);

  const handleGeocodeBatch = async () => {
    if (batchLoading) return;

    let currentPending = 0;
    try {
      const stats = await loadGeocodeStats();
      setGeocodeStats(stats);
      currentPending = stats.pending;
    } catch (err) {
      console.error("Failed to load geocode stats before batch", err);
      return;
    }

    if (currentPending === 0) {
      alert("수집할 미확보 단지가 없습니다.");
      return;
    }

    const totalToProcess = currentPending;
    setBatchLoading(true);
    shouldStopRef.current = false;
    setShouldStopBatch(false);
    setBatchResult(null);

    const progressState: BatchProgress = {
      processed: 0,
      total: totalToProcess,
      success: 0,
      failed: 0,
      failures: [],
      isPaused: false,
    };
    setBatchProgress(progressState);

    for (let i = 0; i < totalToProcess; i++) {
      if (shouldStopRef.current) break;

      try {
        const res = await triggerGeocodeBatch(undefined, 1);
        progressState.processed += 1;
        progressState.success += res.success;
        progressState.failed += res.failed;
        if (res.failedDetails && res.failedDetails.length > 0) {
          progressState.failures.push(...res.failedDetails);
        }
        setBatchProgress({ ...progressState });

        setGeocodeStats((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            geocoded: prev.geocoded + res.success,
            pending: prev.pending - res.success,
          };
        });
      } catch (err: any) {
        console.error("Geocoding step failed:", err);
        progressState.processed += 1;
        progressState.failed += 1;
        progressState.failures.push({
          name: `단지 ${i + 1}`,
          query: "N/A",
          reason: err.message || "네트워크 통신 오류",
        });
        setBatchProgress({ ...progressState });
      }

      if ((i + 1) % 30 === 0 && i < totalToProcess - 1) {
        setBatchProgress((prev) => (prev ? { ...prev, isPaused: true } : null));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setBatchProgress((prev) => (prev ? { ...prev, isPaused: false } : null));
      } else if (totalToProcess > 1 && i < totalToProcess - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setBatchLoading(false);
    setBatchResult({
      total: progressState.processed,
      success: progressState.success,
      failed: progressState.failed,
    });

    await fetchGeocodeStats();
    await fetchPendingComplexes();
  };

  const handleStopBatch = () => {
    shouldStopRef.current = true;
    setShouldStopBatch(true);
  };

  // 좌표 수동 관리
  const [coordsQuery, setCoordsQuery] = useState("");
  const [showCoordsDropdown, setShowCoordsDropdown] = useState(false);
  const [activeCoordsIndex, setActiveCoordsIndex] = useState(-1);
  const [coordsApartments, setCoordsApartments] = useState<any[]>([]);
  const [searchingCoords, setSearchingCoords] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<any | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [coordsUpdating, setCoordsUpdating] = useState(false);

  useEffect(() => {
    const q = coordsQuery.trim();
    if (q.length <= 1) {
      if (q.length === 0) setCoordsApartments([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCoords(true);
      try {
        const found = await searchComplexNames(q);
        setCoordsApartments(found);
      } catch (err) {
        console.error("Failed to search complexes for coords:", err);
        setCoordsApartments([]);
      } finally {
        setSearchingCoords(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [coordsQuery]);

  const handleSelectCoordsComplex = (complex: any) => {
    setSelectedComplex(complex);
    setCoordsQuery(complex.name);
    setEditLat(complex.lat !== null && complex.lat !== undefined ? String(complex.lat) : "");
    setEditLng(complex.lng !== null && complex.lng !== undefined ? String(complex.lng) : "");
    setShowCoordsDropdown(false);
  };

  const handleUpdateCoords = async () => {
    if (!selectedComplex || !selectedComplex.id) {
      alert("선택된 단지의 식별자(ID)가 누락되었습니다. 단지를 다시 검색하여 선택해 주세요.");
      return;
    }
    const latNum = parseFloat(editLat);
    const lngNum = parseFloat(editLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert("위도와 경도는 올바른 숫자여야 합니다.");
      return;
    }

    setCoordsUpdating(true);
    try {
      await updateComplexCoords(selectedComplex.id, latNum, lngNum);
      alert(`'${selectedComplex.name}' 단지의 좌표가 성공적으로 수정되었습니다.`);
      setSelectedComplex({ ...selectedComplex, lat: latNum, lng: lngNum });
      void fetchGeocodeStats();
      void fetchPendingComplexes();
    } catch (err: any) {
      alert(`좌표 수정 실패: ${err.message || "오류가 발생했습니다."}`);
    } finally {
      setCoordsUpdating(false);
    }
  };

  const handleResetCoords = async () => {
    if (!selectedComplex || !selectedComplex.id) {
      alert("선택된 단지의 식별자(ID)가 누락되었습니다. 단지를 다시 검색하여 선택해 주세요.");
      return;
    }
    if (!confirm(`'${selectedComplex.name}' 단지의 좌표를 초기화하고 다시 Geocoding 하도록 설정하시겠습니까?`)) return;

    setCoordsUpdating(true);
    try {
      await resetComplexCoords(selectedComplex.id);
      alert(`'${selectedComplex.name}' 단지의 좌표가 초기화되었습니다.`);
      setSelectedComplex({ ...selectedComplex, lat: null, lng: null });
      setEditLat("");
      setEditLng("");
      void fetchGeocodeStats();
      void fetchPendingComplexes();
    } catch (err: any) {
      alert(`좌표 초기화 실패: ${err.message || "오류가 발생했습니다."}`);
    } finally {
      setCoordsUpdating(false);
    }
  };

  return {
    geocodeStats,
    geocodePercentage,
    batchLoading,
    batchResult,
    batchProgress,
    shouldStopBatch,
    pendingComplexes,
    loadingPending,
    handleGeocodeBatch,
    handleStopBatch,
    fetchGeocodeStats,
    fetchPendingComplexes,
    coordsQuery,
    setCoordsQuery,
    showCoordsDropdown,
    setShowCoordsDropdown,
    activeCoordsIndex,
    setActiveCoordsIndex,
    coordsApartments,
    searchingCoords,
    selectedComplex,
    setSelectedComplex,
    editLat,
    setEditLat,
    editLng,
    setEditLng,
    coordsUpdating,
    handleSelectCoordsComplex,
    handleUpdateCoords,
    handleResetCoords,
  };
}
