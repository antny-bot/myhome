import { useEffect, useMemo, useRef, useState } from "react";
import type { ComplexMetaFilter, RegionMapComplexItem, RegionMapData } from "@myhome/shared";
import { loadRegionMapComplexes, loadRegionsSummary } from "../../api.js";
import { useBreakpoint } from "../../useBreakpoint.js";
import { useLocale } from "../../lib/i18n.js";
import { calculatePriceQuartiles } from "../../lib/mapTheme.js";
import { RegionSummaryItem } from "./RegionChips.js";
import { LOCAL_STORAGE_KEY_REGION, type SortOption } from "./types.js";
import { useRegionBatches } from "./useRegionBatches.js";

export function useRegionMapData() {
  const { isMobile } = useBreakpoint();
  const { t } = useLocale();

  const [regions, setRegions] = useState<RegionSummaryItem[]>([]);
  const [selectedLawdCode, setSelectedLawdCode] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY_REGION) || "";
    } catch {
      return "";
    }
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mapData, setMapData] = useState<RegionMapData | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<RegionMapComplexItem | null>(null);

  const [metaFilter, setMetaFilter] = useState<ComplexMetaFilter>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDong, setSelectedDong] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("txCount");
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");
  const [avoidCollision, setAvoidCollision] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const batches = useRegionBatches({
    selectedLawdCode,
    setMapData,
  });

  const pageContainerRef = useRef<HTMLDivElement>(null);
  const topSectionRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(540);

  useEffect(() => {
    const updateHeight = () => {
      if (!pageContainerRef.current) return;
      const isMobileLayout = isMobile || window.innerWidth < 768;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;

      if (isMobileLayout) {
        const TOP_BAR_H = 56;
        const BOTTOM_PADDING = 64;
        const MAIN_PT = 8;
        const topSectionH = topSectionRef.current ? topSectionRef.current.offsetHeight : 120;
        const CONTENT_GAP = 10;
        const available = viewportHeight - TOP_BAR_H - BOTTOM_PADDING - MAIN_PT - topSectionH - CONTENT_GAP;
        setContentHeight(Math.max(300, Math.floor(available)));
      } else {
        const pageRect = pageContainerRef.current.getBoundingClientRect();
        const pageTop = Math.max(0, pageRect.top);
        const topSectionH = topSectionRef.current ? topSectionRef.current.offsetHeight : 120;
        const calculated = viewportHeight - pageTop - topSectionH - 10 - 36;
        setContentHeight(Math.max(480, Math.floor(calculated)));
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    let observer: ResizeObserver | null = null;
    if (topSectionRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateHeight();
      });
      observer.observe(topSectionRef.current);
    }

    const timer = setTimeout(updateHeight, 100);

    return () => {
      window.removeEventListener("resize", updateHeight);
      if (observer) observer.disconnect();
      clearTimeout(timer);
    };
  }, [selectedLawdCode, regions.length, mobileTab, isMobile]);

  useEffect(() => {
    async function initRegions() {
      try {
        const summary = await loadRegionsSummary();
        setRegions(summary);

        if (summary.length > 0) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY_REGION);
          const found = summary.find((r) => r.lawdCode === stored);
          if (found) {
            setSelectedLawdCode(found.lawdCode);
          } else {
            const best = [...summary].sort((a, b) => b.transactionCount - a.transactionCount)[0];
            setSelectedLawdCode(best.lawdCode);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_REGION, best.lawdCode);
            } catch {}
          }
        }
      } catch (err) {
        console.error("Failed to load regions summary:", err);
      }
    }
    void initRegions();
  }, []);

  useEffect(() => {
    if (!selectedLawdCode) return;

    let isMounted = true;
    async function fetchRegionMap() {
      setLoading(true);
      setErrorMsg("");
      setSelectedComplex(null);
      setSelectedDong("ALL");
      setSearchQuery("");

      try {
        const data = await loadRegionMapComplexes(selectedLawdCode);
        if (isMounted) {
          setMapData(data);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY_REGION, selectedLawdCode);
          } catch {}
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || t.searchFailed);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchRegionMap();
    return () => {
      isMounted = false;
    };
  }, [selectedLawdCode, t.searchFailed]);

  const handleSelectRegion = (lawdCode: string) => {
    if (lawdCode === selectedLawdCode) return;
    setSelectedLawdCode(lawdCode);
  };

  const dongList = useMemo(() => {
    if (!mapData || !mapData.complexes) return [];
    const dongs = new Set<string>();
    mapData.complexes.forEach((c) => {
      if (c.dongName && c.dongName.trim()) {
        dongs.add(c.dongName.trim());
      }
    });
    return Array.from(dongs).sort();
  }, [mapData]);

  const hasActiveMetaFilters = useMemo(() => {
    return Boolean(
      metaFilter.minHouseholds ||
        metaFilter.minTotalParking ||
        metaFilter.minParkingPerHousehold ||
        metaFilter.minBuildYear ||
        metaFilter.maxBuildYear
    );
  }, [metaFilter]);

  const filteredComplexes = useMemo(() => {
    if (!mapData || !mapData.complexes) return [];
    let list = [...mapData.complexes];

    if (metaFilter.minHouseholds && metaFilter.minHouseholds > 0) {
      list = list.filter((c) => c.totalHouseholds != null && c.totalHouseholds >= metaFilter.minHouseholds!);
    }
    if (metaFilter.minTotalParking && metaFilter.minTotalParking > 0) {
      list = list.filter((c) => c.totalParking != null && c.totalParking >= metaFilter.minTotalParking!);
    }
    if (metaFilter.minParkingPerHousehold && metaFilter.minParkingPerHousehold > 0) {
      list = list.filter(
        (c) => c.parkingPerHousehold != null && c.parkingPerHousehold >= metaFilter.minParkingPerHousehold!
      );
    }
    if (metaFilter.minBuildYear && metaFilter.minBuildYear > 0) {
      list = list.filter((c) => {
        if (!c.useApprovalDate) return false;
        const year = parseInt(c.useApprovalDate.substring(0, 4), 10);
        return !isNaN(year) && year >= metaFilter.minBuildYear!;
      });
    }
    if (metaFilter.maxBuildYear && metaFilter.maxBuildYear > 0) {
      list = list.filter((c) => {
        if (!c.useApprovalDate) return false;
        const year = parseInt(c.useApprovalDate.substring(0, 4), 10);
        return !isNaN(year) && year <= metaFilter.maxBuildYear!;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.dongName && c.dongName.toLowerCase().includes(q)) ||
          (c.roadName && c.roadName.toLowerCase().includes(q))
      );
    }

    if (selectedDong !== "ALL") {
      list = list.filter((c) => c.dongName === selectedDong);
    }

    list.sort((a, b) => {
      if (sortBy === "txCount") {
        return (b.txCount || 0) - (a.txCount || 0);
      }
      if (sortBy === "latestDeal") {
        return (b.latestDealDate || "").localeCompare(a.latestDealDate || "");
      }
      if (sortBy === "priceHigh") {
        return (b.latestPriceEok || 0) - (a.latestPriceEok || 0);
      }
      if (sortBy === "priceLow") {
        const pA = a.latestPriceEok || 999999;
        const pB = b.latestPriceEok || 999999;
        return pA - pB;
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "ko");
      }
      return 0;
    });

    return list;
  }, [mapData, searchQuery, selectedDong, sortBy, metaFilter]);

  const quartiles = useMemo(() => {
    if (!filteredComplexes.length) return null;
    const prices = filteredComplexes
      .map((c) => c.latestPriceEok)
      .filter((p): p is number => typeof p === "number" && p > 0);
    return calculatePriceQuartiles(prices);
  }, [filteredComplexes]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedDong, sortBy, selectedLawdCode, pageSize, metaFilter]);

  useEffect(() => {
    if (selectedComplex && !filteredComplexes.some((c) => c.id === selectedComplex.id)) {
      setSelectedComplex(null);
    }
  }, [filteredComplexes, selectedComplex]);

  useEffect(() => {
    if (!selectedComplex) return;
    const idx = filteredComplexes.findIndex((c) => c.id === selectedComplex.id);
    if (idx !== -1) {
      const targetPage = Math.floor(idx / pageSize) + 1;
      if (targetPage !== page) {
        setPage(targetPage);
      }
    }
  }, [selectedComplex, filteredComplexes, pageSize]);

  const totalItems = filteredComplexes.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedComplexes = useMemo(() => {
    return filteredComplexes.slice(startIndex, endIndex);
  }, [filteredComplexes, startIndex, endIndex]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    let start = Math.max(1, validPage - Math.floor(maxButtons / 2));
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }
    const list: number[] = [];
    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  }, [validPage, totalPages]);

  const handlePageChange = (newPage: number) => {
    const target = Math.max(1, Math.min(totalPages, newPage));
    setPage(target);
    listContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pendingBuildingMetaCount = useMemo(() => {
    return mapData?.complexes?.filter((c) => !c.totalHouseholds).length || 0;
  }, [mapData]);

  const selectedRegionSummary = regions.find((r) => r.lawdCode === selectedLawdCode);

  return {
    isMobile,
    t,
    regions,
    selectedLawdCode,
    setSelectedLawdCode,
    handleSelectRegion,
    selectedRegionSummary,
    loading,
    errorMsg,
    mapData,
    selectedComplex,
    setSelectedComplex,
    metaFilter,
    setMetaFilter,
    hasActiveMetaFilters,
    searchQuery,
    setSearchQuery,
    selectedDong,
    setSelectedDong,
    dongList,
    sortBy,
    setSortBy,
    mobileTab,
    setMobileTab,
    avoidCollision,
    setAvoidCollision,
    page,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    validPage,
    paginatedComplexes,
    filteredComplexes,
    quartiles,
    pageNumbers,
    handlePageChange,
    listContainerRef,
    pageContainerRef,
    topSectionRef,
    contentHeight,
    pendingBuildingMetaCount,
    ...batches,
  };
}
