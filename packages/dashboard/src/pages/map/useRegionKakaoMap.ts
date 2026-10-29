import { useEffect, useRef } from "react";
import type { RegionMapComplexItem, RegionMapData } from "@myhome/shared";
import { createComplexMarkerHtml, getPriceTheme } from "../../lib/mapTheme.js";
import { useKakaoMap } from "../../useKakaoMap.js";

interface UseRegionKakaoMapProps {
  mapData: RegionMapData | null;
  filteredComplexes: RegionMapComplexItem[];
  quartiles: any;
  selectedComplex: RegionMapComplexItem | null;
  setSelectedComplex: (complex: RegionMapComplexItem | null) => void;
  avoidCollision: boolean;
  mobileTab: "map" | "list";
  contentHeight: number;
}

export function useRegionKakaoMap({
  mapData,
  filteredComplexes,
  quartiles,
  selectedComplex,
  setSelectedComplex,
  avoidCollision,
  mobileTab,
  contentHeight,
}: UseRegionKakaoMapProps) {
  const { loaded: mapLoaded, error: mapError } = useKakaoMap();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const renderMarkersRef = useRef<() => void>(() => {});
  const prevLawdCodeRef = useRef<string>("");

  const renderMarkers = () => {
    if (!mapLoaded || !mapRef.current || !mapData) return;
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps) return;

    const map = mapRef.current;
    const proj = map.getProjection();

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

    const sorted = [...validComplexes].sort((a, b) => {
      if (selectedComplex?.id === a.id) return -1;
      if (selectedComplex?.id === b.id) return 1;
      return (b.txCount || 0) - (a.txCount || 0);
    });

    const newOverlays: any[] = [];
    const newPolylines: any[] = [];
    const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const markerW = 105;
    const markerH = 44;

    const proximityClusters: { centerPoint: { x: number; y: number }; items: typeof sorted }[] = [];
    const clusterRadius = 40;

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

      const theme = getPriceTheme(c.latestPriceEok, quartiles);

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

      const el = document.createElement("div");
      el.className = "select-none pointer-events-auto transition-transform duration-150 active:scale-95";
      const overlayZIndex = isSelected ? 50 : isDotOnly ? 5 : hasLeaderLine ? 30 : 20;
      el.style.zIndex = String(overlayZIndex);

      const badge = c.totalHouseholds
        ? `${c.totalHouseholds >= 1000 ? "대단지 " : ""}${c.totalHouseholds.toLocaleString()}세대`
        : undefined;

      if (isDotOnly) {
        el.className += " -translate-x-1/2 -translate-y-1/2";
        el.innerHTML = createComplexMarkerHtml({
          name: c.name,
          priceEok: c.latestPriceEok,
          priceText: c.latestPriceEok !== null ? `${c.latestPriceEok}억` : "-",
          subText: c.txCount > 0 ? `${c.txCount}건` : undefined,
          badgeText: badge,
          isSelected,
          isDotOnly: true,
          quartiles,
        });
      } else {
        el.className += " relative -translate-y-[100%]";
        el.innerHTML = createComplexMarkerHtml({
          name: c.name,
          priceEok: c.latestPriceEok,
          priceText: c.latestPriceEok !== null ? `${c.latestPriceEok}억` : "-",
          subText: c.txCount > 0 ? `${c.txCount}건` : undefined,
          badgeText: badge,
          isSelected,
          hasLeaderLine,
          quartiles,
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

  renderMarkersRef.current = renderMarkers;

  const fitMapToBounds = (forceRegionBounds: boolean = false) => {
    if (!mapRef.current || !(window as any).kakao?.maps || !mapData) return;
    const kakao = (window as any).kakao;
    const map = mapRef.current;

    let initialCenter = new kakao.maps.LatLng(37.5665, 126.978);
    if (mapData.center) {
      initialCenter = new kakao.maps.LatLng(mapData.center.lat, mapData.center.lng);
    }

    if (selectedComplex && selectedComplex.lat && selectedComplex.lng && !forceRegionBounds) {
      const pos = new kakao.maps.LatLng(selectedComplex.lat, selectedComplex.lng);
      map.panTo(pos);
      if (map.getLevel() > 4) {
        map.setLevel(3);
      }
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();
    let validCoordCount = 0;
    filteredComplexes.forEach((c) => {
      if (c.lat !== null && c.lng !== null && !isNaN(c.lat) && !isNaN(c.lng)) {
        bounds.extend(new kakao.maps.LatLng(c.lat, c.lng));
        validCoordCount++;
      }
    });

    if (validCoordCount > 0) {
      map.setBounds(bounds, 40, 40, 40, 40);
    } else if (mapData.center) {
      map.setCenter(initialCenter);
      map.setLevel(5);
    }
  };

  const initOrRelayoutMap = (forceFit: boolean = false) => {
    if (!mapLoaded || !mapContainerRef.current || !mapData) return;
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;

    const container = mapContainerRef.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      return;
    }

    let initialCenter = new kakao.maps.LatLng(37.5665, 126.978);
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
      const map = new kakao.maps.Map(container, options);
      mapRef.current = map;

      const zoomControl = new kakao.maps.ZoomControl();
      map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

      const handleZoomChange = () => renderMarkersRef.current();
      const handleDragEnd = () => renderMarkersRef.current();

      kakao.maps.event.addListener(map, "zoom_changed", handleZoomChange);
      kakao.maps.event.addListener(map, "dragend", handleDragEnd);
    }

    const map = mapRef.current;
    map.relayout();
    renderMarkers();

    const isRegionChanged = prevLawdCodeRef.current !== mapData.lawdCode;
    prevLawdCodeRef.current = mapData.lawdCode;

    fitMapToBounds(forceFit || isRegionChanged);
  };

  useEffect(() => {
    initOrRelayoutMap();
  }, [mapLoaded, mapData, filteredComplexes, quartiles, selectedComplex, avoidCollision, mobileTab]);

  useEffect(() => {
    if (!mapRef.current) return;
    const raf = requestAnimationFrame(() => {
      mapRef.current?.relayout();
      const t = setTimeout(() => {
        mapRef.current?.relayout();
      }, 100);
      return () => clearTimeout(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [contentHeight]);

  useEffect(() => {
    if (!mapContainerRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.relayout();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      for (const overlay of overlaysRef.current) {
        overlay.setMap(null);
      }
      overlaysRef.current = [];
      for (const line of polylinesRef.current) {
        line.setMap(null);
      }
      polylinesRef.current = [];
      mapRef.current = null;
    };
  }, []);

  const handleFocusComplex = (complex: RegionMapComplexItem) => {
    setSelectedComplex(complex);
    if (complex.lat && complex.lng) {
      setTimeout(() => {
        if (mapRef.current && (window as any).kakao?.maps) {
          mapRef.current.relayout();
          const kakao = (window as any).kakao;
          const pos = new kakao.maps.LatLng(complex.lat, complex.lng);
          mapRef.current.panTo(pos);
          if (mapRef.current.getLevel() > 4) {
            mapRef.current.setLevel(3);
          }
        }
      }, 80);
    }
  };

  return {
    mapLoaded,
    mapError,
    mapContainerRef,
    mapRef,
    renderMarkers,
    fitMapToBounds,
    handleFocusComplex,
  };
}
