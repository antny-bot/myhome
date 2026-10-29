import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  loadNearbyStation,
  triggerGeocodeBatch,
  loadGeocodeStats,
  fetchComplexData,
} from "../../../api/index.js";
import { useLocale } from "../../../lib/i18n.js";
import {
  loadRecentStations,
  saveRecentStation,
  removeRecentStation,
  clearRecentStations,
} from "./stationHistory.js";
import type {
  NearbyComplex,
  LiveNearbyComplex,
  FetchResult,
} from "./types.js";

export function useNearbyStationData() {
  const { t } = useLocale();
  const [stationName, setStationName] = useState("");
  const [radiusM, setRadiusM] = useState(500);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showGeocodeAdmin, setShowGeocodeAdmin] = useState(false);
  const [enableLive, setEnableLive] = useState(false);

  // 최근 검색어 상태
  const [recentStations, setRecentStations] = useState<string[]>([]);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // 온디맨드 적재 상태
  const [fetchingComplex, setFetchingComplex] = useState<string | null>(null);
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    setRecentStations(loadRecentStations());
  }, []);

  const handleSelectRecent = (station: string) => {
    setStationName(station);
    setShowSuggest(false);
    setActiveIndex(-1);
    handleSearch(undefined, station);
  };

  const handleRemoveRecent = (station: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const updated = removeRecentStation(station);
    setRecentStations(updated);
    inputRef.current?.focus();
  };

  const handleClearAllRecent = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    clearRecentStations();
    setRecentStations([]);
    inputRef.current?.focus();
  };

  const query = stationName.trim().toLowerCase();
  const displayedStations = recentStations.filter((station) => {
    if (showAllRecent || !query) return true;
    return station.toLowerCase().includes(query);
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggest || displayedStations.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev < displayedStations.length - 1 ? prev + 1 : prev));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < displayedStations.length) {
        event.preventDefault();
        handleSelectRecent(displayedStations[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setShowSuggest(false);
      setActiveIndex(-1);
    }
  };

  // API 결과 상태
  const [searchResult, setSearchResult] = useState<{
    station: { name: string; lat: number; lng: number };
    radiusM: number;
    complexes: NearbyComplex[];
    liveComplexes: LiveNearbyComplex[];
    totalComplexesInRadius?: number;
    stats?: any;
    geocodeStats?: { total: number; geocoded: number; pending: number };
  } | null>(null);

  // 일괄 지오코딩 상태
  const [geocodeStats, setGeocodeStats] = useState<{
    total: number;
    geocoded: number;
    pending: number;
  } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [batchProgress, setBatchProgress] = useState<{
    processed: number;
    total: number;
    success: number;
    failed: number;
    failures: { name: string; query: string; reason: string }[];
    isPaused?: boolean;
  } | null>(null);
  const [shouldStopBatch, setShouldStopBatch] = useState(false);
  const shouldStopRef = useRef(false);

  // 통합 단지 목록 병합 및 정렬
  const mergedComplexes = useMemo(() => {
    if (!searchResult) return [];

    const dbMap = new Map<
      string,
      {
        name: string;
        distanceM: number | null;
        dongName: string | null;
        jibun: string | null;
        lat: number | null;
        lng: number | null;
        regionName: string;
        hasDbData: boolean;
      }
    >();

    searchResult.complexes.forEach((c) => {
      dbMap.set(c.name, {
        name: c.name,
        distanceM: c.distanceM,
        dongName: c.dongName,
        jibun: c.jibun,
        lat: c.lat,
        lng: c.lng,
        regionName: c.regionName || "",
        hasDbData: true,
      });
    });

    searchResult.liveComplexes.forEach((c) => {
      if (!dbMap.has(c.name)) {
        dbMap.set(c.name, {
          name: c.name,
          distanceM: c.distanceM,
          dongName: c.dongName,
          jibun: c.jibun,
          lat: c.lat,
          lng: c.lng,
          regionName: c.regionName || "",
          hasDbData: c.hasDbData,
        });
      } else {
        const existing = dbMap.get(c.name)!;
        if (existing.distanceM === null || existing.distanceM === undefined) {
          existing.distanceM = c.distanceM;
        }
        if (!existing.regionName && c.regionName) {
          existing.regionName = c.regionName;
        }
      }
    });

    return Array.from(dbMap.values()).sort((a, b) => {
      if (a.distanceM !== null && b.distanceM !== null) {
        return a.distanceM - b.distanceM;
      }
      if (a.distanceM !== null) return -1;
      if (b.distanceM !== null) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [searchResult]);

  const fetchGeocodeStats = async () => {
    try {
      const stats = await loadGeocodeStats();
      setGeocodeStats(stats);
    } catch (e) {
      console.error("Failed to load geocode stats", e);
    }
  };

  useEffect(() => {
    fetchGeocodeStats();
  }, []);

  const handleSearch = async (e?: React.FormEvent, overrideStationName?: string) => {
    if (e) e.preventDefault();
    const queryStr = (overrideStationName !== undefined ? overrideStationName : stationName).trim();
    if (!queryStr) return;

    setLoading(true);
    setErrorMsg("");
    setFetchResult(null);
    setFetchError("");

    try {
      const result = await loadNearbyStation(queryStr, radiusM, enableLive);
      setSearchResult(result);

      saveRecentStation(queryStr);
      setRecentStations(loadRecentStations());

      if (result.geocodeStats) {
        setGeocodeStats(result.geocodeStats);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t.stationSearchFailed || "지하철역 조회에 실패했습니다.");
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchComplexData = async (complex: any) => {
    if (!complex.regionName) {
      setFetchError("지역 정보가 없어 실거래가를 조회할 수 없습니다.");
      return;
    }

    setFetchingComplex(complex.name);
    setFetchError("");
    setFetchResult(null);

    try {
      const res = await fetchComplexData(complex.regionName, complex.name);
      setFetchResult({
        ok: res.ok,
        complexName: complex.name,
        inserted: res.inserted,
        months: res.months,
        alreadyCached: res.alreadyCached,
      });

      if (searchResult) {
        const updatedLive = searchResult.liveComplexes.map((c) =>
          c.name === complex.name ? { ...c, hasDbData: true } : c
        );
        setSearchResult({ ...searchResult, liveComplexes: updatedLive });
      }
    } catch (err: any) {
      setFetchError(err.message || "데이터 수집에 실패했습니다.");
    } finally {
      setFetchingComplex(null);
    }
  };

  const handleGeocodeBatch = async () => {
    const totalToProcess = geocodeStats?.pending || 0;
    if (totalToProcess <= 0) return;

    setBatchLoading(true);
    shouldStopRef.current = false;
    setShouldStopBatch(false);
    setBatchResult(null);

    const progressState = {
      processed: 0,
      total: totalToProcess,
      success: 0,
      failed: 0,
      failures: [] as { name: string; query: string; reason: string }[],
      isPaused: false,
    };
    setBatchProgress({ ...progressState });

    while (progressState.processed < totalToProcess) {
      if (shouldStopRef.current) {
        progressState.isPaused = true;
        setBatchProgress({ ...progressState });
        break;
      }

      try {
        const res = await triggerGeocodeBatch(undefined, 1);
        progressState.processed += res.success + res.failed;
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
          name: "알 수 없음",
          query: "일괄 처리 중 에러",
          reason: err.message || "오류",
        });
        setBatchProgress({ ...progressState });
      }

      if (progressState.processed >= totalToProcess) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    setBatchLoading(false);
    await fetchGeocodeStats();
  };

  const handleStopBatch = () => {
    shouldStopRef.current = true;
    setShouldStopBatch(true);
  };

  return {
    stationName,
    setStationName,
    radiusM,
    setRadiusM,
    loading,
    errorMsg,
    showGeocodeAdmin,
    setShowGeocodeAdmin,
    enableLive,
    setEnableLive,
    recentStations,
    showAllRecent,
    setShowAllRecent,
    showSuggest,
    setShowSuggest,
    activeIndex,
    setActiveIndex,
    inputRef,
    displayedStations,
    handleSelectRecent,
    handleRemoveRecent,
    handleClearAllRecent,
    handleKeyDown,
    searchResult,
    setSearchResult,
    mergedComplexes,
    fetchingComplex,
    fetchResult,
    fetchError,
    handleFetchComplexData,
    geocodeStats,
    batchLoading,
    batchResult,
    batchProgress,
    shouldStopBatch,
    handleGeocodeBatch,
    handleStopBatch,
    handleSearch,
  };
}

export type NearbyStationDataState = ReturnType<typeof useNearbyStationData>;
