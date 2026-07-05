import React, { useEffect, useRef, useState } from "react";
import { useKakaoMap } from "../useKakaoMap";
import { copy } from "../locales/ko";
import type { TransactionRecord } from "../types";
import { MapPin, ZoomIn, ZoomOut, Compass } from "lucide-react";

const locale = "ko";
const t = copy[locale];

interface KakaoMapProps {
  searchedRegion: string;
  records: TransactionRecord[];
  selectedApartment: string | null;
  onSelectApartment: (aptName: string) => void;
}

interface ComplexSummary {
  apartmentName: string;
  avgPrice: number;
  maxPrice: number;
  count: number;
  address: string;
}

// 주소-좌표 변환용 글로벌/메모리 캐시
const addressCache = new Map<string, { lat: number; lng: number }>();

export function KakaoMap({
  searchedRegion,
  records,
  selectedApartment,
  onSelectApartment
}: KakaoMapProps) {
  const { loaded, error } = useKakaoMap();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [mapInitialized, setMapInitialized] = useState(false);

  // 1. 레코드 데이터를 아파트 단지별로 그룹화 및 요약
  const complexSummaries = React.useMemo(() => {
    if (!records.length) return [];

    const groups = new Map<string, TransactionRecord[]>();
    for (const rec of records) {
      const list = groups.get(rec.apartmentName) || [];
      list.push(rec);
      groups.set(rec.apartmentName, list);
    }

    const summaries: ComplexSummary[] = [];
    for (const [aptName, list] of groups.entries()) {
      const prices = list.map((item) => item.priceEok);
      const avgPrice = prices.reduce((sum, v) => sum + v, 0) / prices.length;
      const maxPrice = Math.max(...prices);
      // 검색된 지역명(searchedRegion)과 아파트명을 결합하여 검색 주소 생성
      const address = `${searchedRegion} ${aptName}`;

      summaries.push({
        apartmentName: aptName,
        avgPrice,
        maxPrice,
        count: list.length,
        address
      });
    }
    return summaries;
  }, [records, searchedRegion]);

  // 2. 카카오 지도 객체 초기 생성
  useEffect(() => {
    if (!loaded || !mapContainerRef.current || mapRef.current) return;

    const options = {
      center: new window.kakao.maps.LatLng(37.566524, 126.978058), // 기본 서울 중심
      level: 5 // 기본 줌 레벨
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, options);
    mapRef.current = map;
    setMapInitialized(true);

    return () => {
      if (mapRef.current) {
        mapRef.current = null;
        setMapInitialized(false);
      }
    };
  }, [loaded]);

  // 3. 지오코딩 헬퍼 프로미스
  const geocodeAddress = (geocoder: any, address: string): Promise<{ lat: number; lng: number } | null> => {
    if (addressCache.has(address)) {
      return Promise.resolve(addressCache.get(address)!);
    }
    return new Promise((resolve) => {
      geocoder.addressSearch(address, (result: any[], status: string) => {
        if (status === "OK" && result[0]) {
          const coords = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
          addressCache.set(address, coords);
          resolve(coords);
        } else {
          resolve(null);
        }
      });
    });
  };

  // 4. 단지 데이터 맵 마커(커스텀 오버레이) 배치 및 업데이트
  useEffect(() => {
    if (!mapInitialized || !mapRef.current || !loaded) return;

    const map = mapRef.current;
    const geocoder = new window.kakao.maps.services.Geocoder();

    // 기존 오버레이들 모두 초기화
    for (const ov of overlaysRef.current) {
      ov.setMap(null);
    }
    overlaysRef.current = [];

    if (complexSummaries.length === 0) {
      // 검색 결과가 없는 상태이면 검색된 법정동 주소 위치로 지도 중심 이동 시도
      if (searchedRegion) {
        geocoder.addressSearch(searchedRegion, (result: any[], status: string) => {
          if (status === "OK" && result[0]) {
            const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
            map.setCenter(coords);
            map.setLevel(6);
          }
        });
      }
      return;
    }

    let isCancelled = false;

    // 모든 단지 좌표 비동기 변환 수행
    const loadMarkers = async () => {
      const bounds = new window.kakao.maps.LatLngBounds();
      const validPoints: { coords: any; summary: ComplexSummary }[] = [];

      for (const summary of complexSummaries) {
        if (isCancelled) return;
        const pos = await geocodeAddress(geocoder, summary.address);
        if (pos) {
          const kakaoCoords = new window.kakao.maps.LatLng(pos.lat, pos.lng);
          validPoints.push({ coords: kakaoCoords, summary });
          bounds.extend(kakaoCoords);
        }
      }

      if (isCancelled) return;

      // 커스텀 오버레이 생성 및 지도 표시
      const newOverlays = validPoints.map(({ coords, summary }) => {
        const isSelected = selectedApartment === summary.apartmentName;

        // 오버레이 컨테이너 생성
        const container = document.createElement("div");
        container.className = "relative -translate-y-[100%] select-none pointer-events-auto";

        // 오버레이 디자인 (Tailwind 클래스 적용)
        // 가격대별 색상 매핑
        let colorClass = "bg-emerald-600 shadow-emerald-500/20";
        if (summary.avgPrice >= 15) {
          colorClass = "bg-indigo-700 shadow-indigo-500/30";
        } else if (summary.avgPrice >= 10) {
          colorClass = "bg-rose-500 shadow-rose-500/25";
        } else if (summary.avgPrice >= 5) {
          colorClass = "bg-blue-600 shadow-blue-500/20";
        }

        const borderClass = isSelected
          ? "ring-[3px] ring-white scale-108 z-20 border-[2px] border-primary"
          : "hover:scale-105 active:scale-95 z-10";

        container.innerHTML = `
          <div class="flex flex-col items-center cursor-pointer transition-all duration-200 ${borderClass}">
            <div class="px-2.5 py-1.5 rounded-xl text-white font-bold flex flex-col items-center text-center shadow-lg ${colorClass}">
              <span class="text-[10px] opacity-90 truncate max-w-[110px] leading-tight font-medium">${summary.apartmentName}</span>
              <div class="flex items-baseline gap-0.5 mt-0.5">
                <span class="text-xs font-black tracking-tight">${summary.avgPrice.toFixed(1)}</span>
                <span class="text-[10px] font-bold opacity-80">${t.unitDeal}</span>
              </div>
              <span class="text-[9px] mt-0.5 px-1 py-0.2 bg-black/20 rounded font-semibold">${summary.count}${t.unitCount}</span>
            </div>
            <!-- 꼬리표 삼각형 -->
            <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${
              isSelected ? "border-t-primary" : summary.avgPrice >= 15 ? "border-t-indigo-700" : summary.avgPrice >= 10 ? "border-t-rose-500" : summary.avgPrice >= 5 ? "border-t-blue-600" : "border-t-emerald-600"
            }"></div>
          </div>
        `;

        // 오버레이 클릭 이벤트 연동
        container.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectApartment(summary.apartmentName);
        });

        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: coords,
          content: container,
          xAnchor: 0.5,
          yAnchor: 0
        });

        customOverlay.setMap(map);
        return customOverlay;
      });

      overlaysRef.current = newOverlays;

      // 여러 단지가 있을 경우 지도의 시야를 마커들이 포함된 영역으로 자동 조정
      if (validPoints.length > 0) {
        map.setBounds(bounds);
        // 지나치게 줌인되는 것을 방지
        if (map.getLevel() < 3) {
          map.setLevel(3);
        }
      }
    };

    loadMarkers();

    return () => {
      isCancelled = true;
    };
  }, [complexSummaries, mapInitialized, loaded, selectedApartment, onSelectApartment]);

  // 5. 상위에서 특정 아파트가 선택(포커스)되었을 때 중심 이동 및 줌
  useEffect(() => {
    if (!mapInitialized || !mapRef.current || !loaded || !selectedApartment || complexSummaries.length === 0) return;

    const map = mapRef.current;
    const target = complexSummaries.find((s) => s.apartmentName === selectedApartment);
    if (!target) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(target.address, (result: any[], status: string) => {
      if (status === "OK" && result[0]) {
        const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
        map.panTo(coords);
        if (map.getLevel() > 4) {
          map.setLevel(4);
        }
      }
    });
  }, [selectedApartment, complexSummaries, mapInitialized, loaded]);

  // 6. 지도 줌 컨트롤 핸들러
  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setLevel(mapRef.current.getLevel() - 1);
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setLevel(mapRef.current.getLevel() + 1);
    }
  };

  const resetCenter = () => {
    if (!mapRef.current || complexSummaries.length === 0) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    const geocoder = new window.kakao.maps.services.Geocoder();

    const fitAll = async () => {
      for (const summary of complexSummaries) {
        const pos = await geocodeAddress(geocoder, summary.address);
        if (pos) {
          bounds.extend(new window.kakao.maps.LatLng(pos.lat, pos.lng));
        }
      }
      mapRef.current.setBounds(bounds);
    };
    fitAll();
  };

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-red-200/60 bg-red-500/5 p-6 text-center">
        <MapPin className="h-8 w-8 text-red-500 animate-pulse mb-3" />
        <p className="text-sm font-semibold text-red-600">{t.mapLoadError}</p>
        <p className="mt-1.5 text-xs text-neutral">Developer Console에서 API 키 허용 도메인 설정을 확인해 보세요.</p>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-normal bg-alternative/40 p-6 text-center min-h-[300px]">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-neutral animate-pulse">{t.loadingMap}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-normal shadow-sm">
      {/* 지도 컨테이너 */}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: "350px" }} />

      {/* 우측 상단 플로팅 지도 줌 컨트롤 */}
      {mapInitialized && (
        <div className="absolute z-20 right-3 top-3 flex flex-col gap-1.5 rounded-xl border border-normal bg-elevated/95 backdrop-blur-sm p-1.5 shadow-md">
          <button
            type="button"
            onClick={zoomIn}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg text-strong hover:bg-alternative transition-colors active:scale-95"
            title="확대"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg text-strong hover:bg-alternative transition-colors active:scale-95"
            title="축소"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </button>
          <div className="h-px bg-normal my-0.5" />
          <button
            type="button"
            onClick={resetCenter}
            disabled={complexSummaries.length === 0}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg text-strong hover:bg-alternative transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="전체 단지 맞춤"
          >
            <Compass className="h-4.5 w-4.5" />
          </button>
        </div>
      )}

      {/* 가격대별 범례 설명 (지도 하단) */}
      {mapInitialized && complexSummaries.length > 0 && (
        <div className="absolute z-20 left-3 bottom-3 flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-normal bg-elevated/95 backdrop-blur-sm px-3 py-2 text-[10px] font-bold text-neutral shadow-md max-w-[calc(100%-24px)] md:max-w-md">
          <span className="text-[9px] font-extrabold uppercase text-strong border-r border-normal pr-2 flex items-center">범례 (평균가)</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-700 shadow shadow-indigo-500/20" />
            <span>15억↑</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow shadow-rose-500/20" />
            <span>10억~15억</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow shadow-blue-500/20" />
            <span>5억~10억</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow shadow-emerald-500/20" />
            <span>5억↓</span>
          </div>
        </div>
      )}
    </div>
  );
}
