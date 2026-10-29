import React from "react";
import { AlertCircle, Loader2, MapPin, SlidersHorizontal } from "lucide-react";
import type { RegionMapComplexItem, RegionMapData } from "@myhome/shared";
import { MapLegend } from "../../components/MapLegend.js";
import { useLocale } from "../../lib/i18n.js";
import { SelectedComplexCard } from "./SelectedComplexCard.js";

interface RegionMapViewProps {
  mapData: RegionMapData | null;
  mapLoaded: boolean;
  mapError: any;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  contentHeight: number;
  mobileTab: "map" | "list";
  avoidCollision: boolean;
  setAvoidCollision: React.Dispatch<React.SetStateAction<boolean>>;
  quartiles: any;
  selectedComplex: RegionMapComplexItem | null;
  setSelectedComplex: (complex: RegionMapComplexItem | null) => void;
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
}

export function RegionMapView({
  mapData,
  mapLoaded,
  mapError,
  mapContainerRef,
  contentHeight,
  mobileTab,
  avoidCollision,
  setAvoidCollision,
  quartiles,
  selectedComplex,
  setSelectedComplex,
  onSelectComplex,
  onNavigateToRules,
}: RegionMapViewProps) {
  const { t } = useLocale();

  return (
    <div
      className={`lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm relative w-full ${
        mobileTab === "list" ? "hidden lg:flex" : "flex"
      }`}
      style={{ height: contentHeight, minHeight: contentHeight }}
    >
      {/* 지도 컨테이너 */}
      <div
        ref={mapContainerRef}
        className="w-full flex-1 bg-slate-100 dark:bg-slate-800"
        style={{ width: "100%", height: contentHeight }}
      />

      {/* 지도 상단 오버레이 안내 및 도구 */}
      <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-md flex items-center gap-2 text-xs pointer-events-auto">
          <MapPin size={14} className="text-primary" />
          <span className="font-bold text-slate-800 dark:text-slate-100">
            {mapData?.regionName || "지역 지도"}
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">(마커 클릭 시 단지 상세 확인 및 이동)</span>
        </div>

        <button
          onClick={() => setAvoidCollision((prev) => !prev)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md backdrop-blur-md transition-all pointer-events-auto flex items-center gap-1.5 ${
            avoidCollision
              ? "bg-primary border-primary text-white shadow-primary/20"
              : "bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
          }`}
          title="줌 아웃 시 마커 겹침을 방지하고 근접 단지는 지시선으로 연결합니다."
        >
          <SlidersHorizontal size={13} />
          <span>겹침 방지 / 지시선</span>
          <span
            className={`text-[10px] px-1 py-0.2 rounded font-black ${
              avoidCollision ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
            }`}
          >
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
              <Loader2 size={28} className="animate-spin text-primary" />
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
          quartiles={quartiles}
        />
      )}

      {/* 선택된 단지 플로팅 인포 카드 (지도 하단) */}
      {selectedComplex && (
        <SelectedComplexCard
          complex={selectedComplex}
          onClose={() => setSelectedComplex(null)}
          onSelectComplex={onSelectComplex}
          onNavigateToRules={onNavigateToRules}
        />
      )}
    </div>
  );
}
