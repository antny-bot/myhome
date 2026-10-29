import React from "react";
import {
  MapPin,
  Search,
  Settings,
  RefreshCw,
  AlertTriangle,
  Clock,
  X,
  Play,
} from "lucide-react";
import { SectionCard } from "../../../components/SectionCard.js";
import { useLocale } from "../../../lib/i18n.js";
import type { NearbyStationDataState } from "./useNearbyStationData.js";

interface StationSearchCardProps {
  state: NearbyStationDataState;
}

export function StationSearchCard({ state }: StationSearchCardProps) {
  const { t } = useLocale();

  const geocodePercentage =
    state.geocodeStats && state.geocodeStats.total > 0
      ? Math.round((state.geocodeStats.geocoded / state.geocodeStats.total) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <SectionCard
        title={t.nearbyStationTitle || "역세권 아파트 검색"}
        right={
          <button
            type="button"
            onClick={() => state.setShowGeocodeAdmin(!state.showGeocodeAdmin)}
            className={`px-3 py-1.5 rounded-lg border border-normal text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
              state.showGeocodeAdmin
                ? "bg-primary text-white border-transparent"
                : "bg-alternative hover:bg-opacity-90 text-strong"
            }`}
          >
            <Settings size={13} />
            <span>{t.geocodeStatsBtn || "좌표 캐싱 설정"}</span>
          </button>
        }
      >
        <form onSubmit={state.handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-neutral">
                <MapPin size={18} />
              </span>
              <input
                ref={state.inputRef}
                type="text"
                value={state.stationName}
                onChange={(e) => {
                  state.setStationName(e.target.value);
                  state.setShowSuggest(true);
                  state.setShowAllRecent(false);
                }}
                onFocus={() => {
                  state.setShowSuggest(true);
                  state.setShowAllRecent(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    state.setShowSuggest(false);
                    state.setActiveIndex(-1);
                  }, 200);
                }}
                onKeyDown={state.handleKeyDown}
                placeholder={t.stationPlaceholder || "예: 판교역, 강남역"}
                className="w-full pl-10 pr-4 py-1.5 h-[38px] rounded-lg border border-normal bg-normal text-strong text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                autoComplete="off"
              />
              {state.showSuggest && state.displayedStations.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-hidden rounded-lg border border-normal bg-normal shadow-lg flex flex-col left-0 top-[38px]">
                  <div className="flex justify-between items-center px-3 py-1.5 bg-alternative border-b border-normal text-[10px] font-bold text-neutral select-none">
                    <span>{t.recentStations || "최근 검색 지하철역"}</span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={state.handleClearAllRecent}
                      className="hover:text-red-500 transition-colors flex items-center gap-0.5"
                    >
                      <X size={10} />
                      <span>{t.recentSearchClear || "전체 삭제"}</span>
                    </button>
                  </div>
                  <ul role="listbox" className="overflow-y-auto max-h-60 py-1">
                    {state.displayedStations.map((station, index) => {
                      const isSelected = index === state.activeIndex;
                      return (
                        <li
                          key={`${station}-${index}`}
                          id={`suggest-station-item-${index}`}
                          role="option"
                          aria-selected={isSelected}
                          className="relative group"
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => state.handleSelectRecent(station)}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-strong transition-colors ${
                              isSelected ? "bg-primary/10 text-primary" : "hover:bg-primary/5"
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5 text-neutral shrink-0" />
                            <span className="flex-1 truncate pr-8">{station}</span>
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => state.handleRemoveRecent(station, e)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral hover:text-red-500 rounded transition-colors group-hover:opacity-100 opacity-0 focus:opacity-100"
                            title={t.deleteRegion || "삭제"}
                          >
                            <X size={12} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-xs font-bold text-neutral whitespace-nowrap">
                {t.nearbyRadiusLabel}
              </span>
              <select
                value={state.radiusM}
                onChange={(e) => state.setRadiusM(Number(e.target.value))}
                className="w-full px-3 py-1.5 h-[38px] rounded-lg border border-normal bg-normal text-strong text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={300}>{t.nearbyRadius300m}</option>
                <option value={500}>{t.nearbyRadius500m}</option>
                <option value={700}>{t.nearbyRadius700m}</option>
                <option value={1000}>{t.nearbyRadius1000m}</option>
                <option value={1500}>{t.nearbyRadius1500m}</option>
                <option value={2000}>{t.nearbyRadius2000m}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={state.loading}
              className="flex items-center justify-center gap-1.5 px-4 h-[38px] bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg shadow-sm shadow-primary/20 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {state.loading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Search size={14} />
              )}
              <span>
                {state.loading
                  ? t.loading || "조회 중..."
                  : t.searchButton || "조회하기"}
              </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mt-1 select-none">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-neutral">
              <input
                type="checkbox"
                checked={state.enableLive}
                onChange={(e) => state.setEnableLive(e.target.checked)}
                className="rounded border-normal text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>{t.enableLiveLabel || "실시간 국토부 API 연동 조회"}</span>
            </label>
            <span className="text-[10px] text-neutral/70">
              (
              {t.liveSearchDesc ||
                "국토부 API 실시간 호출로 검색 시간이 5초 이상 소요될 수 있으며, 최근 3개월 거래 단지만 표시됩니다."}
              )
            </span>
          </div>

          {state.errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-500 flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{state.errorMsg}</span>
            </div>
          )}
        </form>
      </SectionCard>

      {/* Geocoding 관리 카드 */}
      {state.showGeocodeAdmin && (
        <SectionCard
          title={t.geocodeStatsTitle || "Geocoding 좌표 캐싱 관리"}
          right={<Settings size={15} className="text-neutral" />}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-neutral">{t.geocodePercentageOfTotal || "좌표 데이터 현황"}</span>
              <span className="text-strong">
                {state.geocodeStats?.geocoded || 0} / {state.geocodeStats?.total || 0} 단지 (
                {geocodePercentage}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-alternative overflow-hidden border border-normal">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${geocodePercentage}%` }}
              />
            </div>

            {state.geocodeStats && state.geocodeStats.pending > 0 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-neutral">
                  미변환 단지: <strong>{state.geocodeStats.pending}개</strong>
                </span>
                <button
                  type="button"
                  onClick={state.batchLoading ? state.handleStopBatch : state.handleGeocodeBatch}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 ${
                    state.batchLoading ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:opacity-90"
                  }`}
                >
                  {state.batchLoading ? (
                    <>
                      <X size={13} />
                      <span>중단하기</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      <span>일괄 변환 시작</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
