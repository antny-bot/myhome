import React, { useRef } from "react";
import { Compass } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader.js";
import { useLocale } from "../../../lib/i18n.js";
import type { NearbyStationTabProps } from "./types.js";
import { useNearbyStationData } from "./useNearbyStationData.js";
import { StationSearchCard } from "./StationSearchCard.js";
import { StationComplexList } from "./StationComplexList.js";
import { StationMapView } from "./StationMapView.js";

export function NearbyStationTab({
  onSelectComplex,
  onNavigateToRules,
  hideHeader = false,
}: NearbyStationTabProps) {
  const { t } = useLocale();
  const state = useNearbyStationData();
  const mapRef = useRef<any>(null);

  const handlePanTo = (lat: number, lng: number) => {
    if (mapRef.current && (window as any).kakao?.maps) {
      const pos = new (window as any).kakao.maps.LatLng(lat, lng);
      mapRef.current.panTo(pos);
    }
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          title={t.nearbyStationTitle || "역세권 아파트 검색"}
          subtitle={
            t.nearbyStationSubtitle ||
            "지하철역 주변 관심 반경 내의 아파트 단지 정보와 위치를 검색합니다."
          }
          icon={Compass}
        />
      )}

      {/* 1. 역세권 검색 & 설정 카드 */}
      <StationSearchCard state={state} />

      {/* 2. 검색 결과: 지도 및 단지 목록 그리드 */}
      {state.searchResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* 단지 목록 (1/3) */}
          <div className="lg:col-span-1 order-2 lg:order-1 h-full">
            <StationComplexList
              state={state}
              onSelectComplex={onSelectComplex}
              onNavigateToRules={onNavigateToRules}
              onPanTo={handlePanTo}
            />
          </div>

          {/* 지도 (2/3) */}
          <div className="lg:col-span-2 order-1 lg:order-2 h-full">
            <StationMapView
              searchResult={state.searchResult}
              mergedComplexes={state.mergedComplexes}
              onSelectComplex={onSelectComplex}
              mapRef={mapRef}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default NearbyStationTab;
