import React, { useEffect, useRef, useState } from "react";
import { useKakaoMap } from "../../../useKakaoMap.js";
import { useLocale } from "../../../lib/i18n.js";
import {
  createComplexMarkerHtml,
  createStationMarkerHtml,
  MAP_CIRCLE_STYLES,
} from "../../../lib/mapTheme.js";
import { MapLegend } from "../../../components/MapLegend.js";
import { SlidersHorizontal } from "lucide-react";

interface StationMapViewProps {
  searchResult: any;
  mergedComplexes: any[];
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  mapRef?: React.MutableRefObject<any>;
}

export function StationMapView({
  searchResult,
  mergedComplexes,
  onSelectComplex,
  mapRef: externalMapRef,
}: StationMapViewProps) {
  const { loaded: mapLoaded } = useKakaoMap();
  const { t } = useLocale();
  const localMapRef = useRef<any>(null);
  const mapRef = externalMapRef || localMapRef;
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const stationMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const [avoidCollision, setAvoidCollision] = useState(true);

  // 1. 지도 초기화 및 역 마커/반경 Circle 렌더링
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !searchResult) return;
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps) return;

    const center = new kakao.maps.LatLng(searchResult.station.lat, searchResult.station.lng);

    if (!mapRef.current) {
      const options = {
        center,
        level: searchResult.radiusM <= 500 ? 4 : searchResult.radiusM <= 1000 ? 5 : 6,
      };
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, options);

      kakao.maps.event.addListener(mapRef.current, "zoom_changed", () => {
        renderStationMapMarkers();
      });
    } else {
      mapRef.current.setCenter(center);
      const level = searchResult.radiusM <= 500 ? 4 : searchResult.radiusM <= 1000 ? 5 : 6;
      mapRef.current.setLevel(level);
    }

    const map = mapRef.current;

    // 역 마커
    if (stationMarkerRef.current) stationMarkerRef.current.setMap(null);
    const stationContent = document.createElement("div");
    stationContent.className = "relative z-30 select-none";
    stationContent.innerHTML = createStationMarkerHtml(searchResult.station.name);

    stationMarkerRef.current = new kakao.maps.CustomOverlay({
      position: center,
      content: stationContent,
      zIndex: 40,
      yAnchor: 1.0,
    });
    stationMarkerRef.current.setMap(map);

    // 반경 Circle
    if (circleRef.current) circleRef.current.setMap(null);
    circleRef.current = new kakao.maps.Circle({
      center,
      radius: searchResult.radiusM,
      ...MAP_CIRCLE_STYLES,
    });
    circleRef.current.setMap(map);

    renderStationMapMarkers();

    return () => {
      if (stationMarkerRef.current) stationMarkerRef.current.setMap(null);
      if (circleRef.current) circleRef.current.setMap(null);
      for (const ov of overlaysRef.current) ov.setMap(null);
      for (const pl of polylinesRef.current) pl.setMap(null);
    };
  }, [mapLoaded, searchResult]);

  // 2. 단지 마커 및 지시선 렌더링
  const renderStationMapMarkers = () => {
    if (!mapLoaded || !mapRef.current || !searchResult) return;
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps) return;

    const map = mapRef.current;
    let proj: any = null;
    try {
      proj = map.getProjection();
    } catch {
      proj = null;
    }

    for (const ov of overlaysRef.current) ov.setMap(null);
    overlaysRef.current = [];
    for (const pl of polylinesRef.current) pl.setMap(null);
    polylinesRef.current = [];

    const zoomLevel = map.getLevel();
    const validComplexes = mergedComplexes.filter(
      (c) => c.lat !== null && c.lng !== null && !isNaN(c.lat) && !isNaN(c.lng)
    );
    if (validComplexes.length === 0) return;

    const newOverlays: any[] = [];
    const newPolylines: any[] = [];
    const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const markerW = 90;
    const markerH = 38;

    const proximityClusters: {
      centerPoint: { x: number; y: number };
      items: typeof validComplexes;
    }[] = [];
    const clusterRadius = 35;

    if (proj && avoidCollision && zoomLevel <= 5) {
      for (const item of validComplexes) {
        try {
          const origPos = new kakao.maps.LatLng(item.lat!, item.lng!);
          const pt = proj.pointFromCoords(origPos);
          if (pt && !isNaN(pt.x) && !isNaN(pt.y)) {
            let foundCluster = proximityClusters.find(
              (cl) => Math.hypot(cl.centerPoint.x - pt.x, cl.centerPoint.y - pt.y) < clusterRadius
            );
            if (!foundCluster) {
              foundCluster = { centerPoint: pt, items: [] };
              proximityClusters.push(foundCluster);
            }
            foundCluster.items.push(item);
          }
        } catch {
          // ignore
        }
      }
    }

    validComplexes.forEach((c, idx) => {
      const origPos = new kakao.maps.LatLng(c.lat!, c.lng!);
      let displayPos = origPos;
      let hasLeaderLine = false;
      let isDotOnly = false;

      if (proj && avoidCollision) {
        try {
          const pt = proj.pointFromCoords(origPos);
          if (pt && !isNaN(pt.x) && !isNaN(pt.y)) {
            if (zoomLevel >= 6) {
              const isGuaranteedCard = idx < 4;
              const box = {
                x1: pt.x - markerW / 2,
                y1: pt.y - markerH,
                x2: pt.x + markerW / 2,
                y2: pt.y,
              };
              const isOverlapped = placedBoxes.some(
                (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
              );
              if (isOverlapped && !isGuaranteedCard) isDotOnly = true;
              else placedBoxes.push(box);
            } else {
              const cluster = proximityClusters.find((cl) =>
                cl.items.some((i) => i.name === c.name)
              );
              if (cluster && cluster.items.length > 1) {
                const index = cluster.items.findIndex((i) => i.name === c.name);
                const total = cluster.items.length;
                const angle = (2 * Math.PI * index) / total - Math.PI / 2;
                const offsetDist = Math.min(55, 30 + total * 7);
                const offsetPt = new kakao.maps.Point(
                  cluster.centerPoint.x + Math.cos(angle) * offsetDist,
                  cluster.centerPoint.y + Math.sin(angle) * offsetDist
                );
                displayPos = proj.coordsFromPoint(offsetPt);
                hasLeaderLine = true;
              }
            }
          }
        } catch {
          displayPos = origPos;
        }
      }

      const themeHex = c.hasDbData ? "#059669" : "#2563eb";

      if (hasLeaderLine) {
        const polyline = new kakao.maps.Polyline({
          path: [origPos, displayPos],
          strokeWeight: 1.5,
          strokeColor: themeHex,
          strokeOpacity: 0.85,
          strokeStyle: "shortdash",
        });
        polyline.setMap(map);
        newPolylines.push(polyline);
      }

      const el = document.createElement("div");
      el.className = "cursor-pointer select-none transition-transform hover:scale-105";

      if (isDotOnly) {
        el.className += " -translate-x-1/2 -translate-y-1/2";
        el.innerHTML = createComplexMarkerHtml({
          name: c.name,
          priceEok: c.hasDbData ? 4.9 : 7.0,
          priceText: c.distanceM !== null && c.distanceM !== undefined ? `${c.distanceM}m` : undefined,
          badgeText: c.hasDbData ? undefined : "실시간",
          isDotOnly: true,
        });
      } else {
        el.className += " relative -translate-y-[100%]";
        el.innerHTML = createComplexMarkerHtml({
          name: c.name,
          priceEok: c.hasDbData ? 4.9 : 7.0,
          priceText: c.distanceM !== null && c.distanceM !== undefined ? `${c.distanceM}m` : "-",
          badgeText: c.hasDbData ? undefined : "실시간",
          hasLeaderLine,
        });
      }

      el.addEventListener("click", () => {
        onSelectComplex(c.name, c.lawdCode);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: displayPos,
        content: el,
        zIndex: 20,
        xAnchor: 0.5,
        yAnchor: isDotOnly ? 0.5 : 1.0,
      });
      overlay.setMap(map);
      newOverlays.push(overlay);
    });

    overlaysRef.current = newOverlays;
    polylinesRef.current = newPolylines;
  };

  useEffect(() => {
    renderStationMapMarkers();
  }, [mergedComplexes, avoidCollision]);

  return (
    <div className="relative w-full h-[550px] bg-alternative/30 rounded-xl border border-normal overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* 충돌 방지 토글 버튼 */}
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => setAvoidCollision((prev) => !prev)}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold shadow-md transition-all flex items-center gap-1.5 ${
            avoidCollision
              ? "bg-elevated text-strong border-primary/50 shadow-primary/10"
              : "bg-alternative/90 text-neutral border-normal"
          }`}
          title="마커 겹침 방지 및 스마트 배치 활성화"
        >
          <SlidersHorizontal size={13} className={avoidCollision ? "text-primary" : ""} />
          <span>{avoidCollision ? "겹침 방지 ON" : "겹침 방지 OFF"}</span>
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-10">
        <MapLegend />
      </div>
    </div>
  );
}
