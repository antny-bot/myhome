import React, { useState, useEffect, useRef, useMemo } from "react";
import { useKakaoMap } from "../useKakaoMap";
import { SectionCard } from "../components/SectionCard";
import { PageHeader } from "../components/PageHeader";
import {
  loadRegionsSummary,
  loadRegionMapComplexes,
  triggerGeocodeBatch,
  loadGeocodeStats,
} from "../api";
import type { RegionMapData, RegionMapComplexItem } from "@myhome/shared";
import {
  MapPin,
  Search,
  Map as MapIcon,
  Compass,
  ArrowRight,
  Bell,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Play,
  Filter,
  List,
  Maximize2
} from "lucide-react";
import { useLocale } from "../lib/i18n";
import { createComplexMarkerHtml, getPriceTheme } from "../lib/mapTheme";
import { MapLegend } from "../components/MapLegend";

const LOCAL_STORAGE_KEY_REGION = "myhome_recent_map_region";

interface RegionSummaryItem {
  lawdCode: string;
  displayName: string;
  transactionCount: number;
  minDealDate: string | null;
  maxDealDate: string | null;
}

interface RegionMapPageProps {
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
}

type SortOption = "txCount" | "latestDeal" | "priceHigh" | "priceLow" | "name";

export function RegionMapPage({ onSelectComplex, onNavigateToRules }: RegionMapPageProps) {
  const { t } = useLocale();
  const { loaded: mapLoaded, error: mapError } = useKakaoMap();

  // 지역 목록 상태
  const [regions, setRegions] = useState<RegionSummaryItem[]>([]);
  const [selectedLawdCode, setSelectedLawdCode] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY_REGION) || "";
    } catch {
      return "";
    }
  });

  // 단지 데이터 상태
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mapData, setMapData] = useState<RegionMapData | null>(null);
  const [selectedComplex, setSelectedComplex] = useState<RegionMapComplexItem | null>(null);

  // 검색 및 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDong, setSelectedDong] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("txCount");
  const [mobileTab, setMobileTab] = useState<"map" | "list">("map");

  // Geocoding 일괄 수집 상태
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    processed: number;
    total: number;
    success: number;
    failed: number;
  } | null>(null);

  // 카카오 지도 레퍼런스
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [avoidCollision, setAvoidCollision] = useState(true);

  // 지역 선택 칩 가로 드래그 스크롤 상태 및 핸들러
  const chipContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingChips, setIsDraggingChips] = useState(false);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleChipMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chipContainerRef.current) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - chipContainerRef.current.offsetLeft;
    scrollLeftRef.current = chipContainerRef.current.scrollLeft;
  };

  const handleChipMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDownRef.current || !chipContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - chipContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
      if (!isDraggingChips) setIsDraggingChips(true);
    }
    chipContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleChipMouseUpOrLeave = () => {
    isDownRef.current = false;
    setIsDraggingChips(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 80);
  };

  // 1. DB 적재 지역 목록 로드
  useEffect(() => {
    async function initRegions() {
      try {
        const summary = await loadRegionsSummary();
        setRegions(summary);

        if (summary.length > 0) {
          // 저장된 최근 지역구가 유효한지 확인
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY_REGION);
          const found = summary.find(r => r.lawdCode === stored);
          if (found) {
            setSelectedLawdCode(found.lawdCode);
          } else {
            // 저장된 게 없으면 거래 건수가 가장 많은 지역구 기본 선택
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

  // 2. 선택된 지역의 단지 데이터 로드
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

  // 선택 지역 변경 핸들러
  const handleSelectRegion = (lawdCode: string) => {
    if (lawdCode === selectedLawdCode) return;
    setSelectedLawdCode(lawdCode);
  };

  // 법정동 목록 추출
  const dongList = useMemo(() => {
    if (!mapData || !mapData.complexes) return [];
    const dongs = new Set<string>();
    mapData.complexes.forEach(c => {
      if (c.dongName && c.dongName.trim()) {
        dongs.add(c.dongName.trim());
      }
    });
    return Array.from(dongs).sort();
  }, [mapData]);

  // 필터링 및 정렬된 단지 목록
  const filteredComplexes = useMemo(() => {
    if (!mapData || !mapData.complexes) return [];
    let list = [...mapData.complexes];

    // 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.dongName && c.dongName.toLowerCase().includes(q)) ||
        (c.roadName && c.roadName.toLowerCase().includes(q))
      );
    }

    // 동 필터
    if (selectedDong !== "ALL") {
      list = list.filter(c => c.dongName === selectedDong);
    }

    // 정렬
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
  }, [mapData, searchQuery, selectedDong, sortBy]);

  // 3. 마커 및 지시선 렌더링 함수
  const renderMarkers = () => {
    if (!mapLoaded || !mapRef.current || !mapData) return;
    const kakao = window.kakao;
    if (!kakao || !kakao.maps) return;

    const map = mapRef.current;
    const proj = map.getProjection();

    // 기존 오버레이 및 지시선 정리
    for (const overlay of overlaysRef.current) {
      overlay.setMap(null);
    }
    overlaysRef.current = [];

    for (const line of polylinesRef.current) {
      line.setMap(null);
    }
    polylinesRef.current = [];

    const validComplexes = filteredComplexes.filter(
      (c) => c.lat !== null && c.lng !== null && !isNaN(c.lat) && !isNaN(c.lng)
    );

    if (validComplexes.length === 0) return;

    const zoomLevel = map.getLevel();

    // 우선순위 정렬: 선택된 단지 최우선, 그 다음 거래건수 많은 순
    const sorted = [...validComplexes].sort((a, b) => {
      if (selectedComplex?.id === a.id) return -1;
      if (selectedComplex?.id === b.id) return 1;
      return (b.txCount || 0) - (a.txCount || 0);
    });

    const newOverlays: any[] = [];
    const newPolylines: any[] = [];

    // 충돌 감지용 바운딩 박스 목록
    const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const markerW = 105;
    const markerH = 44;

    // 근접 클러스터 (Zoom-in 시 Spiderfy / Leader line용)
    const proximityClusters: { centerPoint: { x: number; y: number }; items: typeof sorted }[] = [];
    const clusterRadius = 40; // 픽셀 거리

    if (proj && avoidCollision && zoomLevel <= 5) {
      for (const item of sorted) {
        const origPos = new kakao.maps.LatLng(item.lat!, item.lng!);
        const pt = proj.pointFromCoords(origPos);
        let foundCluster = proximityClusters.find(
          (cl) => Math.hypot(cl.centerPoint.x - pt.x, cl.centerPoint.y - pt.y) < clusterRadius
        );
        if (!foundCluster) {
          foundCluster = { centerPoint: pt, items: [] };
          proximityClusters.push(foundCluster);
        }
        foundCluster.items.push(item);
      }
    }

    sorted.forEach((c, idx) => {
      const origPos = new kakao.maps.LatLng(c.lat!, c.lng!);
      const isSelected = selectedComplex?.id === c.id;

      let displayPos = origPos;
      let hasLeaderLine = false;
      let isDotOnly = false;

      if (proj && avoidCollision) {
        const pt = proj.pointFromCoords(origPos);

        if (zoomLevel >= 6) {
          // [광역 줌아웃]: 상위 거래량 단지(상위 4개) 및 선택된 단지는 무조건 풀 카드로 유지하여 사라짐 방지
          const isGuaranteedCard = isSelected || idx < 4;

          const box = {
            x1: pt.x - markerW / 2,
            y1: pt.y - markerH,
            x2: pt.x + markerW / 2,
            y2: pt.y,
          };

          const isOverlapped = placedBoxes.some(
            (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
          );

          if (isOverlapped && !isGuaranteedCard) {
            isDotOnly = true;
          } else {
            placedBoxes.push(box);
          }
        } else {
          // [상세 줌인]: 2개 이상 근접 단지는 오프셋 이동 & 지시선 연결
          const cluster = proximityClusters.find((cl) => cl.items.some((i) => i.id === c.id));
          if (cluster && cluster.items.length > 1) {
            const index = cluster.items.findIndex((i) => i.id === c.id);
            const total = cluster.items.length;
            const angle = (2 * Math.PI * index) / total - Math.PI / 2;
            const offsetDist = Math.min(65, 34 + total * 8);

            const offsetPt = new kakao.maps.Point(
              cluster.centerPoint.x + Math.cos(angle) * offsetDist,
              cluster.centerPoint.y + Math.sin(angle) * offsetDist
            );

            displayPos = proj.coordsFromPoint(offsetPt);
            hasLeaderLine = true;
          }
        }
      }

      const theme = getPriceTheme(c.latestPriceEok);

      // 1. 지시선(Leader line) 렌더링
      if (hasLeaderLine) {
        const polyline = new kakao.maps.Polyline({
          path: [origPos, displayPos],
          strokeWeight: 1.5,
          strokeColor: isSelected ? "#f59e0b" : theme.hexColor,
          strokeOpacity: 0.85,
          strokeStyle: "shortdash",
        });
        polyline.setMap(map);
        newPolylines.push(polyline);

        // 원점 위치에 작은 도트 앵커 마커 (가장 뒤에 배치)
        const anchorEl = document.createElement("div");
        anchorEl.className = `w-2 h-2 rounded-full ${theme.dotClass} border border-white shadow-sm pointer-events-none`;
        const anchorOverlay = new kakao.maps.CustomOverlay({
          position: origPos,
          content: anchorEl,
          zIndex: 4,
          xAnchor: 0.5,
          yAnchor: 0.5,
        });
        anchorOverlay.setMap(map);
        newOverlays.push(anchorOverlay);
      }

      // 2. 단지 오버레이 엘리먼트 생성
      const el = document.createElement("div");
      el.className = "select-none pointer-events-auto transition-transform duration-150 active:scale-95";
      const overlayZIndex = isSelected ? 50 : isDotOnly ? 5 : hasLeaderLine ? 30 : 20;
      el.style.zIndex = String(overlayZIndex);

      if (isDotOnly) {
        el.className += " -translate-x-1/2 -translate-y-1/2";
        el.innerHTML = createComplexMarkerHtml({
          name: c.name,
          priceEok: c.latestPriceEok,
          priceText: c.latestPriceEok !== null ? `${c.latestPriceEok}억` : "-",
          subText: c.txCount > 0 ? `${c.txCount}건` : undefined,
          isSelected,
          isDotOnly: true,
        });
      } else {
        el.className += " relative -translate-y-[100%]";
        el.innerHTML = createComplexMarkerHtml({
          name: c.name,
          priceEok: c.latestPriceEok,
          priceText: c.latestPriceEok !== null ? `${c.latestPriceEok}억` : "-",
          subText: c.txCount > 0 ? `${c.txCount}건` : undefined,
          isSelected,
          hasLeaderLine,
        });
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectedComplex(c);
        map.panTo(origPos);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: displayPos,
        content: el,
        zIndex: overlayZIndex,
        xAnchor: 0.5,
        yAnchor: isDotOnly ? 0.5 : 0,
      });

      overlay.setMap(map);
      newOverlays.push(overlay);
    });

    overlaysRef.current = newOverlays;
    polylinesRef.current = newPolylines;
  };

  // 4. 카카오 지도 초기화 및 이벤트 리스너 등록
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !mapData) return;
    const kakao = window.kakao;
    if (!kakao || !kakao.maps) return;

    let initialCenter = new kakao.maps.LatLng(37.5665, 126.9780);
    if (mapData.center) {
      initialCenter = new kakao.maps.LatLng(mapData.center.lat, mapData.center.lng);
    }

    if (!mapRef.current) {
      const options = {
        center: initialCenter,
        level: 5,
        draggable: true,
        zoomable: true,
      };
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      const zoomControl = new kakao.maps.ZoomControl();
      map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

      kakao.maps.event.addListener(map, "zoom_changed", () => {
        renderMarkers();
      });
      kakao.maps.event.addListener(map, "dragend", () => {
        renderMarkers();
      });
    } else {
      mapRef.current.relayout();
    }

    const map = mapRef.current;
    renderMarkers();

    // 단지들이 모두 보이도록 줌 및 중심 설정
    const bounds = new kakao.maps.LatLngBounds();
    let validCoordCount = 0;

    filteredComplexes.forEach((c) => {
      if (c.lat !== null && c.lng !== null && !isNaN(c.lat) && !isNaN(c.lng)) {
        bounds.extend(new kakao.maps.LatLng(c.lat, c.lng));
        validCoordCount++;
      }
    });

    if (validCoordCount > 0 && !selectedComplex) {
      map.setBounds(bounds, 50, 50, 50, 50);
    } else if (mapData.center && validCoordCount === 0) {
      map.setCenter(initialCenter);
    }
  }, [mapLoaded, mapData, filteredComplexes, selectedComplex, avoidCollision]);

  // 단지 리스트에서 단지 클릭 시 지도 이동
  const handleFocusComplex = (complex: RegionMapComplexItem) => {
    setSelectedComplex(complex);
    setMobileTab("map");
    if (mapRef.current && complex.lat && complex.lng) {
      const kakao = window.kakao;
      const pos = new kakao.maps.LatLng(complex.lat, complex.lng);
      mapRef.current.panTo(pos);
      if (mapRef.current.getLevel() > 4) {
        mapRef.current.setLevel(3);
      }
    }
  };

  // 단지 좌표 일괄 지오코딩 트리거
  const handleRunGeocodeBatch = async () => {
    if (batchLoading || !selectedLawdCode) return;
    setBatchLoading(true);
    setBatchProgress(null);

    try {
      let processed = 0;
      let success = 0;
      let failed = 0;

      // 최대 3회 분할 배치 처리
      for (let step = 0; step < 3; step++) {
        const res = await triggerGeocodeBatch(selectedLawdCode, 20);
        if (res.total === 0) break;
        processed += res.total;
        success += res.success;
        failed += res.failed;
        setBatchProgress({ processed, total: processed, success, failed });
        if (res.total < 20) break;
        await new Promise(r => setTimeout(r, 1000));
      }

      // 데이터 리로드
      const updated = await loadRegionMapComplexes(selectedLawdCode);
      setMapData(updated);
    } catch (err: any) {
      console.error("Geocoding batch failed:", err);
      alert("좌표 수집 중 오류가 발생했습니다: " + (err.message || ""));
    } finally {
      setBatchLoading(false);
    }
  };

  const selectedRegionSummary = regions.find(r => r.lawdCode === selectedLawdCode);

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-5rem)]">
      {/* 1. 상단 타이틀 */}
      <PageHeader
        title={t.regionMapTitle || "지역별 단지 지도"}
        subtitle={t.regionMapSubtitle || "수집된 지역구 내 아파트 단지 위치와 최근 실거래가를 지도에서 한눈에 확인하고 단지 분석으로 연결합니다."}
        icon={MapIcon}
      />

      {/* 2. 상단 적재 지역 선택 바 (Loaded Districts Selector Bar) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t.loadedRegions || "적재 지역 선택"}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {regions.length}개 지역구
            </span>
          </div>
          {selectedRegionSummary && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>총 <strong>{selectedRegionSummary.transactionCount.toLocaleString()}</strong>건 실거래 적재</span>
              {selectedRegionSummary.maxDealDate && (
                <span>최근 거래: {selectedRegionSummary.maxDealDate}</span>
              )}
            </div>
          )}
        </div>

        {/* 가로 마우스 드래그 스크롤 가능한 지역 칩 리스트 (스크롤바 숨김) */}
        <div
          ref={chipContainerRef}
          onMouseDown={handleChipMouseDown}
          onMouseMove={handleChipMouseMove}
          onMouseUp={handleChipMouseUpOrLeave}
          onMouseLeave={handleChipMouseUpOrLeave}
          className={`flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none select-none ${
            isDraggingChips ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {regions.map((reg) => {
            const isSelected = reg.lawdCode === selectedLawdCode;
            return (
              <button
                key={reg.lawdCode}
                onClick={() => {
                  if (hasDraggedRef.current) return;
                  handleSelectRegion(reg.lawdCode);
                }}
                className={`flex items-center gap-2 shrink-0 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 border select-none ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20 scale-[1.02]"
                    : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300"
                }`}
              >
                <MapPin size={14} className={isSelected ? "text-amber-300" : "text-slate-400"} />
                <span>{reg.displayName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white font-black"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {reg.transactionCount.toLocaleString()}건
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 모바일 뷰 전환 탭 (지도 ↔ 목록) */}
      <div className="flex lg:hidden bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setMobileTab("map")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === "map"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <MapIcon size={14} />
          <span>{t.mapViewToggle || "지도 보기"}</span>
        </button>
        <button
          onClick={() => setMobileTab("list")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === "list"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <List size={14} />
          <span>{t.listViewToggle || "목록 보기"} ({filteredComplexes.length})</span>
        </button>
      </div>

      {/* 3. 메인 콘텐츠 (좌측 사이드바 + 우측 지도) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[580px]">
        {/* 좌측 단지 목록 & 필터 패널 */}
        <div
          className={`lg:col-span-5 xl:col-span-4 flex flex-col gap-3 ${
            mobileTab === "map" ? "hidden lg:flex" : "flex"
          }`}
        >
          <SectionCard className="flex flex-col flex-1 p-3.5 sm:p-4 gap-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            {/* 상단 통계 요약 */}
            {mapData && (
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {mapData.regionName}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    총 {mapData.totalComplexes}개 단지 중 {mapData.geocodedCount}개 위치 표시
                  </span>
                </div>

                {mapData.totalComplexes > mapData.geocodedCount && (
                  <button
                    onClick={handleRunGeocodeBatch}
                    disabled={batchLoading}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                    title={t.runBatchGeocodeForRegion || "단지 좌표 일괄 수집"}
                  >
                    {batchLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    <span>좌표 수집</span>
                  </button>
                )}
              </div>
            )}

            {/* 검색창 */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchComplexInRegion || "단지명 또는 동 검색..."}
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 법정동 필터 칩 */}
            {dongList.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedDong("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    selectedDong === "ALL"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {t.allDongs || "전체 동"}
                </button>
                {dongList.map((dong) => (
                  <button
                    key={dong}
                    onClick={() => setSelectedDong(dong)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                      selectedDong === dong
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {dong}
                  </button>
                ))}
              </div>
            )}

            {/* 정렬 셀렉터 & 건수 */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredComplexes.length}개 단지</span>
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-2 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="txCount">{t.sortByTxCount || "거래 많은순"}</option>
                  <option value="latestDeal">{t.sortByLatestDeal || "최근 거래순"}</option>
                  <option value="priceHigh">{t.sortByPriceHigh || "높은 가격순"}</option>
                  <option value="priceLow">{t.sortByPriceLow || "낮은 가격순"}</option>
                  <option value="name">{t.sortByName || "가나다순"}</option>
                </select>
              </div>
            </div>

            {/* 단지 리스트 */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px] lg:max-h-[540px] pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-medium">{t.loading}</span>
                </div>
              ) : filteredComplexes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <AlertCircle size={28} className="text-slate-300 dark:text-slate-600" />
                  <span className="text-xs">{t.noResults}</span>
                </div>
              ) : (
                filteredComplexes.map((c) => {
                  const isSelected = selectedComplex?.id === c.id;
                  const hasCoords = c.lat !== null && c.lng !== null;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleFocusComplex(c)}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700 shadow-sm"
                          : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {c.name}
                            </span>
                            {c.dongName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 shrink-0">
                                {c.dongName}
                              </span>
                            )}
                            {!hasCoords && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0 font-medium">
                                좌표미등록
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                              {t.latestDealPrice || "최근"}:{" "}
                              <strong className="text-indigo-600 dark:text-indigo-400 font-black">
                                {c.latestPriceEok !== null ? `${c.latestPriceEok}억` : "-"}
                              </strong>
                            </span>
                            {c.avgPriceEok !== null && (
                              <span>
                                {t.avgDealPrice || "평균"}: {c.avgPriceEok}억
                              </span>
                            )}
                            <span>{c.txCount}건 거래</span>
                          </div>

                          {c.latestDealDate && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              최근 거래일: {c.latestDealDate}
                            </div>
                          )}
                        </div>

                        {/* 단지 분석 바로가기 액션 버튼 */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectComplex(c.name, c.lawdCode);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                            title={t.viewComplexAnalysisBtn || "단지 분석 바로가기"}
                          >
                            <span>단지 분석</span>
                            <ArrowRight size={12} />
                          </button>
                          {onNavigateToRules && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToRules({
                                  regionName: c.regionName,
                                  regionCode: c.lawdCode,
                                  apartmentKeywords: [c.name]
                                });
                              }}
                              className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-0.5"
                            >
                              <Bell size={10} />
                              <span>알림</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        </div>

        {/* 우측 카카오 지도 뷰 */}
        <div
          className={`lg:col-span-7 xl:col-span-8 flex flex-col min-h-[480px] lg:min-h-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative ${
            mobileTab === "list" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* 지도 컨테이너 */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[500px] flex-1 bg-slate-100 dark:bg-slate-800" />

          {/* 지도 상단 오버레이 안내 및 도구 */}
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-md flex items-center gap-2 text-xs pointer-events-auto">
              <MapPin size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {mapData?.regionName || "지역 지도"}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                (마커 클릭 시 단지 상세 확인 및 이동)
              </span>
            </div>

            <button
              onClick={() => setAvoidCollision(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md backdrop-blur-md transition-all pointer-events-auto flex items-center gap-1.5 ${
                avoidCollision
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-indigo-600/20"
                  : "bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              }`}
              title="줌 아웃 시 마커 겹침을 방지하고 근접 단지는 지시선으로 연결합니다."
            >
              <SlidersHorizontal size={13} />
              <span>겹침 방지 / 지시선</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-black ${avoidCollision ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                {avoidCollision ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          {/* 지도 로딩/에러 표시 */}
          {!mapLoaded && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
              {mapError ? (
                <div className="flex flex-col items-center gap-2 text-red-500 p-4 text-center">
                  <AlertCircle size={32} />
                  <span className="text-xs font-semibold">{t.mapLoadError}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 size={28} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-medium">{t.loadingMap}</span>
                </div>
              )}
            </div>
          )}

          {/* 지도 좌하단 통일 범례 */}
          {mapLoaded && (
            <MapLegend
              className="absolute z-20 left-3 bottom-3"
              title="범례 (최근가)"
              showSelected={!!selectedComplex}
            />
          )}

          {/* 선택된 단지 플로팅 인포 카드 (지도 하단) */}
          {selectedComplex && (
            <div className="absolute bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-indigo-200 dark:border-indigo-800 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {selectedComplex.name}
                    </h3>
                    {selectedComplex.dongName && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        {selectedComplex.dongName}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedComplex.regionName} {selectedComplex.jibun || selectedComplex.roadName || ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedComplex(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 가격 및 거래 정보 그리드 */}
              <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-100 dark:border-slate-800 text-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400">{t.latestDealPrice || "최근 거래"}</span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {selectedComplex.latestPriceEok !== null ? `${selectedComplex.latestPriceEok}억` : "-"}
                  </span>
                </div>
                <div className="flex flex-col border-x border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">{t.avgDealPrice || "평균 가격"}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedComplex.avgPriceEok !== null ? `${selectedComplex.avgPriceEok}억` : "-"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400">{t.dealCountLabel || "총 거래건수"}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedComplex.txCount}건
                  </span>
                </div>
              </div>

              {/* 하단 액션 버튼 */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => onSelectComplex(selectedComplex.name, selectedComplex.lawdCode)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
                >
                  <Building2 size={14} />
                  <span>{t.viewComplexAnalysisBtn || "단지 분석 바로가기"}</span>
                  <ArrowRight size={13} />
                </button>

                {onNavigateToRules && (
                  <button
                    onClick={() => {
                      onNavigateToRules({
                        regionName: selectedComplex.regionName,
                        regionCode: selectedComplex.lawdCode,
                        apartmentKeywords: [selectedComplex.name]
                      });
                    }}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={t.addRuleForComplex || "알림 규칙 추가"}
                  >
                    <Bell size={16} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
