import { useEffect, useRef, useState } from "react";
import { useKakaoMap } from "../../useKakaoMap.js";
import type { RegionSearchResult } from "../../types.js";
import type { RegionSummary } from "./RegionCollectModal.js";
import { createRegionMarkerElement } from "./dashboardMapUtils.js";

interface UseDashboardMapProps {
  dbRegions: RegionSummary[];
  isAdmin: boolean;
  onNavigate?: (view: any) => void;
  openCollectModal: (lawdCode: string, regionName: string, existingRegion?: RegionSummary) => void;
  setUiFeedback: (feedback: { message: string; type: "success" | "error" } | null) => void;
}

export function useDashboardMap({
  dbRegions,
  isAdmin,
  onNavigate,
  openCollectModal,
  setUiFeedback,
}: UseDashboardMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const regionCoordsRef = useRef<{ region: RegionSummary; lat: number; lng: number }[]>([]);
  const [searchRegionName, setSearchRegionName] = useState("");

  const { loaded: mapLoaded, error: mapError } = useKakaoMap();

  const handleRegionClick = (lawdCode: string, regionName: string) => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, "0");
    const endDate = `${curYear}-${curMonth}`;

    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const startY = oneYearAgo.getFullYear();
    const startM = String(oneYearAgo.getMonth() + 1).padStart(2, "0");
    const startDate = `${startY}-${startM}`;

    const url = `?view=analytics&lawdCode=${lawdCode}&regionName=${encodeURIComponent(regionName)}&startDate=${startDate}&endDate=${endDate}`;
    window.history.pushState({ view: "analytics" }, "", url);

    if (onNavigate) {
      onNavigate("analytics");
    }
  };

  const renderRegionOverlays = () => {
    if (!mapLoaded || !mapRef.current) return;
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

    const coords = regionCoordsRef.current;
    if (coords.length === 0) return;

    const zoomLevel = map.getLevel();
    const sorted = [...coords].sort(
      (a, b) => (b.region.transactionCount || 0) - (a.region.transactionCount || 0)
    );

    const newOverlays: any[] = [];
    const newPolylines: any[] = [];
    const placedBoxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const markerW = 135;
    const markerH = 50;

    const proximityClusters: { centerPoint: { x: number; y: number }; items: typeof sorted }[] = [];
    const clusterRadius = 45;

    if (proj && zoomLevel <= 8) {
      for (const item of sorted) {
        const origPos = new kakao.maps.LatLng(item.lat, item.lng);
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

    sorted.forEach(({ region, lat, lng }) => {
      const origPos = new kakao.maps.LatLng(lat, lng);
      let displayPos = origPos;
      let hasLeaderLine = false;
      let isDotOnly = false;

      if (proj) {
        const pt = proj.pointFromCoords(origPos);

        if (zoomLevel >= 9) {
          const box = {
            x1: pt.x - markerW / 2,
            y1: pt.y - markerH,
            x2: pt.x + markerW / 2,
            y2: pt.y,
          };

          const isOverlapped = placedBoxes.some(
            (b) => !(box.x2 < b.x1 || box.x1 > b.x2 || box.y2 < b.y1 || box.y1 > b.y2)
          );

          if (isOverlapped) {
            isDotOnly = true;
          } else {
            placedBoxes.push(box);
          }
        } else {
          const cluster = proximityClusters.find((cl) =>
            cl.items.some((i) => i.region.lawdCode === region.lawdCode)
          );
          if (cluster && cluster.items.length > 1) {
            const index = cluster.items.findIndex((i) => i.region.lawdCode === region.lawdCode);
            const total = cluster.items.length;
            const angle = (2 * Math.PI * index) / total - Math.PI / 2;
            const offsetDist = Math.min(75, 42 + total * 8);

            const offsetPt = new kakao.maps.Point(
              cluster.centerPoint.x + Math.cos(angle) * offsetDist,
              cluster.centerPoint.y + Math.sin(angle) * offsetDist
            );

            displayPos = proj.coordsFromPoint(offsetPt);
            hasLeaderLine = true;
          }
        }
      }

      if (hasLeaderLine) {
        const polyline = new kakao.maps.Polyline({
          path: [origPos, displayPos],
          strokeWeight: 1.5,
          strokeColor: "#6366f1",
          strokeOpacity: 0.85,
          strokeStyle: "shortdash",
        });
        polyline.setMap(map);
        newPolylines.push(polyline);

        const anchorEl = document.createElement("div");
        anchorEl.className = "w-2 h-2 rounded-full bg-indigo-600 border border-white shadow-sm pointer-events-none";
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

      // 2. 오버레이 엘리먼트 생성
      const { content, overlayZIndex } = createRegionMarkerElement({
        region,
        isDotOnly,
        hasLeaderLine,
        isAdmin,
        onRegionClick: handleRegionClick,
        onCollectClick: openCollectModal,
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: displayPos,
        content: content,
        zIndex: overlayZIndex,
        xAnchor: 0.5,
        yAnchor: isDotOnly ? 0.5 : 1.15,
      });

      overlay.setMap(map);
      newOverlays.push(overlay);
    });

    overlaysRef.current = newOverlays;
    polylinesRef.current = newPolylines;
  };

  // 지도 인스턴스 초기화 & 이벤트 리스너 등록
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current) return;

    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps) return;

    const initialCenter = new kakao.maps.LatLng(37.566524, 126.978058);
    const options = { center: initialCenter, level: 8 };

    const map = new kakao.maps.Map(mapContainerRef.current, options);
    mapRef.current = map;

    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    const geocoder = new kakao.maps.services.Geocoder();

    const handleClick = (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      const lat = latlng.getLat();
      const lng = latlng.getLng();

      geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
        if (status === kakao.maps.services.Status.OK) {
          const legalDong = result.find((item) => item.region_type === "B");
          if (legalDong && isAdmin) {
            const lawdCode = legalDong.code.substring(0, 5);
            const regionName = `${legalDong.region_1depth_name} ${legalDong.region_2depth_name}`;
            openCollectModal(lawdCode, regionName);
          }
        }
      });
    };

    const handleViewChange = () => {
      renderRegionOverlays();
    };

    kakao.maps.event.addListener(map, "click", handleClick);
    kakao.maps.event.addListener(map, "zoom_changed", handleViewChange);
    kakao.maps.event.addListener(map, "dragend", handleViewChange);

    return () => {
      if (kakao?.maps?.event && map) {
        kakao.maps.event.removeListener(map, "click", handleClick);
        kakao.maps.event.removeListener(map, "zoom_changed", handleViewChange);
        kakao.maps.event.removeListener(map, "dragend", handleViewChange);
      }
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
  }, [mapLoaded, isAdmin]);

  // mapContainer 크기 변화 감지 자동 relayout
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

  // dbRegions 변경 시 지오코딩 및 마커 렌더링
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || dbRegions.length === 0) return;

    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps) return;

    const geocoder = new kakao.maps.services.Geocoder();
    const bounds = new kakao.maps.LatLngBounds();
    let validBoundsCount = 0;

    const promises = dbRegions.map((region) => {
      return new Promise<{ region: RegionSummary; lat: number; lng: number } | null>((resolve) => {
        geocoder.addressSearch(region.displayName, (result: any[], status: string) => {
          if (status === kakao.maps.services.Status.OK && result[0]) {
            const lat = parseFloat(result[0].y);
            const lng = parseFloat(result[0].x);
            const position = new kakao.maps.LatLng(lat, lng);
            bounds.extend(position);
            validBoundsCount++;
            resolve({ region, lat, lng });
          } else {
            resolve(null);
          }
        });
      });
    });

    Promise.all(promises).then((results) => {
      const validResults = results.filter(
        (r): r is { region: RegionSummary; lat: number; lng: number } => r !== null
      );
      regionCoordsRef.current = validResults;
      renderRegionOverlays();

      if (validBoundsCount > 0 && mapRef.current) {
        mapRef.current.setBounds(bounds);
      }
    });
  }, [mapLoaded, dbRegions, isAdmin]);

  const handleSearchSelect = (item: RegionSearchResult) => {
    if (!mapLoaded || !mapRef.current) return;

    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps) return;

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.addressSearch(item.displayName, (result: any[], status: string) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        const lat = parseFloat(result[0].y);
        const lng = parseFloat(result[0].x);
        const position = new kakao.maps.LatLng(lat, lng);

        mapRef.current.panTo(position);
        mapRef.current.setLevel(6);

        const cleanedName = item.displayName.split(" (")[0].trim();
        const isExisting = dbRegions.some((r) => r.lawdCode === item.lawdCode);
        if (isExisting) {
          handleRegionClick(item.lawdCode, cleanedName);
        } else {
          if (isAdmin) {
            openCollectModal(item.lawdCode, cleanedName);
          } else {
            setUiFeedback({
              message: "아직 집계되지 않은 지역입니다. 지역 추가는 관리자에게 문의하세요.",
              type: "error",
            });
          }
        }
        setSearchRegionName("");
      } else {
        setUiFeedback({ message: "검색한 지역의 주소 좌표를 찾을 수 없습니다.", type: "error" });
      }
    });
  };

  return {
    mapContainerRef,
    mapLoaded,
    mapError,
    searchRegionName,
    setSearchRegionName,
    handleSearchSelect,
    handleRegionClick,
  };
}
