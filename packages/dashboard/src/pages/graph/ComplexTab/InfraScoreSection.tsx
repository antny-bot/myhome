import React, { useEffect, useRef, useState } from "react";
import {
  Train,
  School,
  Car,
  Activity,
  ShoppingBag,
  Trees,
  MapPin,
  Compass,
} from "lucide-react";
import { SectionCard } from "../../../components/SectionCard.js";
import { useLocale } from "../../../lib/i18n.js";
import { useKakaoMap } from "../../../useKakaoMap.js";
import {
  createComplexMarkerHtml,
  createStationMarkerHtml,
  MAP_CIRCLE_STYLES,
} from "../../../lib/mapTheme.js";
import { InfraBuildingSummary } from "./InfraBuildingSummary.js";

interface InfraScoreSectionProps {
  detailData: any;
  showDetailInfras: boolean;
}

export function InfraScoreSection({ detailData, showDetailInfras }: InfraScoreSectionProps) {
  const { t } = useLocale();
  const { loaded: mapLoaded } = useKakaoMap();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [activeInfraFilter, setActiveInfraFilter] = useState<string | null>(null);
  const [infraMarkers, setInfraMarkers] = useState<any[]>([]);

  const infraCategories = [
    { code: "SW8", label: "지하철", icon: Train, color: "text-emerald-500" },
    { code: "SC4", label: "학교", icon: School, color: "text-blue-500" },
    { code: "HP8", label: "병원", icon: Activity, color: "text-indigo-500" },
    { code: "MT1", label: "대형마트", icon: ShoppingBag, color: "text-purple-500" },
    { code: "CS2", label: "편의점", icon: ShoppingBag, color: "text-amber-500" },
    { code: "PM9", label: "약국", icon: Activity, color: "text-rose-500" },
  ];

  const getTravelTime = (distanceM: number) => {
    const walkMin = Math.max(1, Math.round(distanceM / 80));
    const carMin = Math.max(1, Math.round(distanceM / 500));
    return { walkMin, carMin };
  };

  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !detailData?.complexInfo) return;
    const { lat, lng } = detailData.complexInfo;
    if (lat === null || lng === null) return;
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps) return;

    const complexPosition = new kakao.maps.LatLng(lat, lng);
    const options = { center: complexPosition, level: 5 };
    const map = new kakao.maps.Map(mapContainerRef.current, options);
    mapInstanceRef.current = map;

    // 단지 마커
    const complexEl = document.createElement("div");
    complexEl.className = "select-none pointer-events-auto relative -translate-y-[100%]";
    const latestTx = detailData.recentTx?.[0];
    const latestPrice = latestTx?.priceEok ?? (detailData.metrics?.avgPrice ? Number(detailData.metrics.avgPrice.toFixed(1)) : 0);
    complexEl.innerHTML = createComplexMarkerHtml({
      name: detailData.complexInfo.name || "단지",
      priceEok: latestPrice,
      isSelected: true,
      hasLeaderLine: false,
    });

    const complexOverlay = new kakao.maps.CustomOverlay({
      position: complexPosition,
      content: complexEl,
      zIndex: 50,
      xAnchor: 0.5,
      yAnchor: 0,
    });
    complexOverlay.setMap(map);

    // 반경 500m, 1km 원
    const circle500 = new kakao.maps.Circle({
      center: complexPosition,
      radius: 500,
      ...MAP_CIRCLE_STYLES,
      strokeOpacity: 0.4,
      fillOpacity: 0.03,
    });
    circle500.setMap(map);

    const circle1000 = new kakao.maps.Circle({
      center: complexPosition,
      radius: 1000,
      ...MAP_CIRCLE_STYLES,
      strokeOpacity: 0.6,
      fillOpacity: 0.05,
    });
    circle1000.setMap(map);

    // 주변 지하철역 마커
    if (detailData.subways && detailData.subways.length > 0) {
      detailData.subways.forEach((sub: any) => {
        if (!sub.lat || !sub.lng) return;
        const subPosition = new kakao.maps.LatLng(sub.lat, sub.lng);
        const stationEl = document.createElement("div");
        stationEl.className = "select-none pointer-events-auto";
        stationEl.innerHTML = createStationMarkerHtml(sub.name);

        const overlay = new kakao.maps.CustomOverlay({
          position: subPosition,
          content: stationEl,
          zIndex: 40,
          xAnchor: 0.5,
          yAnchor: 1.0,
        });
        overlay.setMap(map);
      });
    }

    return () => {
      complexOverlay.setMap(null);
      circle500.setMap(null);
      circle1000.setMap(null);
    };
  }, [mapLoaded, detailData?.complexInfo, detailData?.subways]);

  const toggleInfraCategory = (categoryCode: string) => {
    if (!mapInstanceRef.current || !detailData?.complexInfo) return;
    const kakao = (window as any).kakao;
    if (!kakao || !kakao.maps || !kakao.maps.services) return;

    infraMarkers.forEach((item) => {
      item.marker?.setMap(null);
      item.overlay?.setMap(null);
    });
    setInfraMarkers([]);

    if (activeInfraFilter === categoryCode) {
      setActiveInfraFilter(null);
      return;
    }

    setActiveInfraFilter(categoryCode);
    const { lat, lng } = detailData.complexInfo;
    const ps = new kakao.maps.services.Places(mapInstanceRef.current);

    ps.categorySearch(
      categoryCode,
      (data: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          const newMarkers = data.map((place: any) => {
            const pos = new kakao.maps.LatLng(place.y, place.x);
            const marker = new kakao.maps.Marker({
              position: pos,
              map: mapInstanceRef.current,
            });

            const overlay = new kakao.maps.CustomOverlay({
              position: pos,
              content: `<div style="background-color:var(--color-semantic-background-normal-normal); border:1px solid var(--color-semantic-line-normal-normal); border-radius:4px; padding:2px 6px; font-size:9px; color:var(--color-semantic-label-strong); box-shadow:0 1px 2px rgba(0,0,0,0.15); margin-top:-32px;">${place.place_name}</div>`,
              yAnchor: 1,
            });
            overlay.setMap(mapInstanceRef.current);
            return { marker, overlay };
          });
          setInfraMarkers(newMarkers);
        }
      },
      {
        location: new kakao.maps.LatLng(lat, lng),
        radius: 1000,
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* 6대 인프라 그리드 (showDetailInfras 시 노출) */}
      {detailData?.infraRating && (
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            showDetailInfras
              ? "grid-rows-[1fr] opacity-100 p-4 bg-elevated border border-normal rounded-xl"
              : "grid-rows-[0fr] opacity-0 overflow-hidden"
          }`}
        >
          <div className="min-h-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-neutral">
              <span className="font-medium leading-relaxed">{t.infraRatingSubtitle}</span>
              {detailData.infraRating.isMock && (
                <span className="text-[11px] text-warn font-semibold">
                  {t.infraMockNotice}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {[
                { code: "SW8", name: t.infraCategorySubway, weight: "1.5 (최상)", color: "emerald", icon: Train },
                { code: "SC4", name: t.infraCategorySchool, weight: "1.2 (상)", color: "blue", icon: School },
                { code: "PKG", name: "주차 쾌적도", weight: "1.2 (상)", color: "amber", icon: Car },
                { code: "HP8", name: t.infraCategoryHospital, weight: "0.8 (중상)", color: "indigo", icon: Activity },
                { code: "MT1", name: t.infraCategoryMart, weight: "0.7 (중)", color: "purple", icon: ShoppingBag },
                { code: "NAT", name: t.infraCategoryNatural, weight: t.infraWeightBonus, color: "teal", icon: Trees },
              ].map((item) => {
                const info = detailData.infraRating.categories[item.code] || {
                  score: 0,
                  count: 0,
                  minDistance: null,
                };
                const Icon = item.icon;

                return (
                  <div
                    key={item.code}
                    className="bg-normal/20 border border-normal rounded-xl p-4 flex flex-col justify-between gap-4 hover:bg-normal/30 transition duration-150 h-fit"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-strong flex items-center gap-1.5 min-w-0">
                          <Icon size={14} className="text-primary shrink-0" />
                          <span className="truncate">{item.name.split(" ")[0]}</span>
                        </span>
                        <span className="text-[10px] text-assistive shrink-0 font-semibold bg-alternative px-1.5 py-0.5 rounded">
                          가중치 {item.weight.split(" ")[0]}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-assistive font-semibold">{t.infraScore}</span>
                          <span className="font-bold text-strong font-mono">{info.score}점</span>
                        </div>
                        <div className="w-full bg-alternative rounded-full h-1.5 overflow-hidden border border-normal">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.color === "emerald"
                                ? "bg-emerald-500"
                                : item.color === "blue"
                                ? "bg-blue-500"
                                : item.color === "teal"
                                ? "bg-teal-500"
                                : item.color === "indigo"
                                ? "bg-indigo-500"
                                : item.color === "purple"
                                ? "bg-purple-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${info.score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {info.details && (
                      <div className="border-t border-normal/30 pt-2.5 space-y-1.5 text-[10px] text-neutral">
                        {item.code === "SW8" && (
                          <div className="flex justify-between items-center">
                            <span className="text-assistive flex items-center gap-1">
                              <Train size={12} className="text-primary shrink-0" />
                              지하철
                            </span>
                            <span className="font-semibold text-strong">
                              {info.details.metroCount}개
                              {info.details.metroMinDistance !== null
                                ? ` (${info.details.metroMinDistance}m)`
                                : " (-)"}
                            </span>
                          </div>
                        )}
                        {item.code === "SC4" && (
                          <div className="flex justify-between items-center">
                            <span className="text-assistive flex items-center gap-1">
                              <School size={12} className="text-primary shrink-0" />
                              학교
                            </span>
                            <span className="font-semibold text-strong">
                              {info.details.schoolCount}개
                              {info.details.schoolMinDistance !== null
                                ? ` (${info.details.schoolMinDistance}m)`
                                : " (-)"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 지도 및 입지 분석 섹션 */}
      {detailData?.complexInfo && (
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <Compass size={18} className="text-primary" />
              <span>단지 주변 입지 분석 (역세권 및 인프라)</span>
            </span>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* 좌측: 지도 뷰 (2/3) */}
            <div className="lg:col-span-2 relative rounded-xl border border-normal overflow-hidden h-[420px]">
              <div ref={mapContainerRef} className="w-full h-full" />
              <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1 bg-elevated/90 backdrop-blur-md p-1.5 rounded-lg border border-normal shadow-sm">
                {infraCategories.map((infra) => {
                  const Icon = infra.icon;
                  const isActive = activeInfraFilter === infra.code;
                  return (
                    <button
                      key={infra.code}
                      type="button"
                      onClick={() => toggleInfraCategory(infra.code)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                        isActive ? "bg-primary text-white" : "bg-normal text-neutral hover:text-strong"
                      }`}
                    >
                      <Icon size={11} />
                      <span>{infra.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우측: 인근 역세권 및 대장 정보 (1/3) */}
            <InfraBuildingSummary detailData={detailData} getTravelTime={getTravelTime} />
          </div>
        </SectionCard>
      )}
    </div>
  );
}
