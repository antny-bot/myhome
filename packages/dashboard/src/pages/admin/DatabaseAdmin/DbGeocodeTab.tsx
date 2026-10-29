import React from "react";
import { AlertCircle, Building2, MapPin, Play, RefreshCw, Settings } from "lucide-react";
import { CoordPickerMap } from "../../../components/CoordPickerMap.js";
import { SectionCard } from "../../../components/SectionCard.js";
import { classNames } from "../../../lib/format.js";
import { useLocale } from "../../../lib/i18n.js";
import type { BatchProgress, GeocodeStats } from "./types.js";

interface DbGeocodeTabProps {
  geocodeStats: GeocodeStats | null;
  geocodePercentage: number;
  batchLoading: boolean;
  batchResult: { total: number; success: number; failed: number } | null;
  batchProgress: BatchProgress | null;
  shouldStopBatch: boolean;
  pendingComplexes: any[];
  handleGeocodeBatch: () => Promise<void>;
  handleStopBatch: () => void;
  coordsQuery: string;
  setCoordsQuery: (val: string) => void;
  showCoordsDropdown: boolean;
  setShowCoordsDropdown: (val: boolean) => void;
  activeCoordsIndex: number;
  setActiveCoordsIndex: React.Dispatch<React.SetStateAction<number>>;
  coordsApartments: any[];
  searchingCoords: boolean;
  selectedComplex: any | null;
  setSelectedComplex: (val: any | null) => void;
  editLat: string;
  setEditLat: (val: string) => void;
  editLng: string;
  setEditLng: (val: string) => void;
  coordsUpdating: boolean;
  handleSelectCoordsComplex: (complex: any) => void;
  handleUpdateCoords: () => Promise<void>;
  handleResetCoords: () => Promise<void>;
}

export function DbGeocodeTab(props: DbGeocodeTabProps) {
  const {
    geocodeStats,
    geocodePercentage,
    batchLoading,
    batchResult,
    batchProgress,
    shouldStopBatch,
    pendingComplexes,
    handleGeocodeBatch,
    handleStopBatch,
    coordsQuery,
    setCoordsQuery,
    showCoordsDropdown,
    setShowCoordsDropdown,
    activeCoordsIndex,
    setActiveCoordsIndex,
    coordsApartments,
    searchingCoords,
    selectedComplex,
    setSelectedComplex,
    editLat,
    setEditLat,
    editLng,
    setEditLng,
    coordsUpdating,
    handleSelectCoordsComplex,
    handleUpdateCoords,
    handleResetCoords,
  } = props;

  const { t } = useLocale();

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      {/* Geocoding 좌표 캐싱 관리 */}
      <SectionCard title="Geocoding 좌표 캐싱 관리" right={<Settings size={15} className="text-neutral" />}>
        <div className="space-y-4">
          <p className="text-xs text-neutral">
            지하철역 주변 역세권 분석 속도 및 데이터 정확도 향상을 위해 로컬 DB에 등록된 아파트 단지 주소를 위도·경도
            좌표로 일괄 변환(Geocoding) 및 캐싱합니다.
          </p>
          <div className="flex justify-between items-center text-xs font-bold border-t border-normal/50 pt-3">
            <span className="text-neutral">좌표 데이터 현황</span>
            <span className="text-strong">
              {geocodeStats?.geocoded || 0} / {geocodeStats?.total || 0} 단지 ({geocodePercentage}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-alternative overflow-hidden border border-normal">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${geocodePercentage}%` }}
            />
          </div>

          {geocodeStats && geocodeStats.pending > 0 ? (
            <div className="space-y-3">
              <p className="text-[11px] text-neutral leading-relaxed">
                현재 DB에 등록된 아파트 중 <strong>{geocodeStats.pending}개</strong> 단지의 위도·경도 좌표가 없습니다.
                국토부 지번 주소 기반으로 카카오 Geocoding 일괄 수집을 실행할 수 있습니다.
              </p>
              {batchLoading ? (
                <div className="flex gap-2">
                  <div className="flex-1 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-600 font-bold flex items-center justify-center gap-2 border border-emerald-500/20 text-sm">
                    <RefreshCw size={15} className="animate-spin text-emerald-600 shrink-0" />
                    <span>
                      {batchProgress?.isPaused
                        ? t.geocodeBatchPausing || "수집 대기 중 (API 제한 방지)..."
                        : `${t.geocodeCollecting || "수집 중"} (${batchProgress?.processed} / ${batchProgress?.total})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopBatch}
                    disabled={shouldStopBatch}
                    className="px-4 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20 disabled:opacity-50 text-sm shrink-0"
                  >
                    중단
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGeocodeBatch}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 text-sm"
                >
                  <Play size={15} />
                  <span>좌표 미확보 단지 일괄 수집</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 py-2">
              ✓ 모든 아파트 단지의 위도·경도 좌표가 확보되었습니다.
            </p>
          )}

          {batchProgress && (
            <div className="text-[11px] font-semibold text-neutral flex justify-between bg-alternative/40 p-2 rounded-lg border border-normal/50">
              <span>진행 수치</span>
              <span>
                성공: <span className="text-emerald-500 font-bold">{batchProgress.success}</span> | 실패:{" "}
                <span className="text-red-500 font-bold">{batchProgress.failed}</span>
              </span>
            </div>
          )}

          {batchProgress && batchProgress.failures.length > 0 && (
            <div className="border border-red-500/20 rounded-lg bg-red-500/5 p-3 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-red-600">
                <span>⚠️ 좌표 수집 실패 목록 ({batchProgress.failures.length}건)</span>
              </div>
              <div className="overflow-y-auto max-h-[140px] border border-normal rounded bg-elevated text-[10px]">
                <table className="w-full text-left border-collapse border-spacing-0">
                  <thead>
                    <tr className="bg-alternative text-neutral border-b border-normal">
                      <th className="p-1.5 font-bold">단지명</th>
                      <th className="p-1.5 font-bold">검색 주소</th>
                      <th className="p-1.5 font-bold">실패 사유</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchProgress.failures.map((fail, idx) => (
                      <tr key={idx} className="border-b border-normal/30 last:border-b-0 hover:bg-alternative/30">
                        <td className="p-1.5 font-semibold text-strong max-w-[120px] truncate" title={fail.name}>
                          {fail.name}
                        </td>
                        <td className="p-1.5 text-neutral truncate max-w-[150px]" title={fail.query}>
                          {fail.query}
                        </td>
                        <td className="p-1.5 text-red-500 max-w-[150px] truncate" title={fail.reason}>
                          {fail.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {batchResult && !batchLoading && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 font-bold space-y-1">
              <p>✓ Geocoding 수집 배치 완료 {shouldStopBatch && "(사용자 요청으로 중단됨)"}</p>
              <p>
                - 대상: {batchResult.total}건 / 성공: {batchResult.success}건 / 실패: {batchResult.failed}건
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 단지 좌표 수동 관리 */}
      <SectionCard title="단지 좌표 수동 관리">
        <div className="space-y-4">
          <p className="text-xs text-neutral">
            Geocoding이 잘못되었거나 지도가 엉뚱한 위치를 가리키는 아파트 단지의 좌표를 수동으로 수정하거나 리셋할 수
            있습니다.
          </p>

          <div className="space-y-2">
            <span className="text-xs font-bold text-strong flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
              {t.geocodePendingListTitle} ({pendingComplexes.length}건)
            </span>

            {pendingComplexes.length === 0 ? (
              <p className="text-[11px] text-emerald-500 font-semibold bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                ✓ {t.noGeocodePendingComplexes}
              </p>
            ) : (
              <div className="overflow-y-auto max-h-[160px] border border-normal rounded-lg bg-alternative/20 p-1.5 space-y-1">
                {pendingComplexes.map((complex) => (
                  <button
                    key={complex.id}
                    type="button"
                    onClick={() => handleSelectCoordsComplex(complex)}
                    className={classNames(
                      "w-full text-left p-2 rounded-md text-xs transition-colors flex flex-col gap-0.5 border",
                      selectedComplex?.id === complex.id
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-sm"
                        : "bg-normal border-normal hover:bg-alternative/40 text-strong"
                    )}
                  >
                    <span className="font-bold flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-neutral" />
                      {complex.name}
                    </span>
                    <span className="text-[10px] text-neutral pl-4">
                      {complex.regionName || complex.lawdCode} {complex.dongName ? `· ${complex.dongName}` : ""}{" "}
                      {complex.jibun ? ` ${complex.jibun}` : ""}
                    </span>
                    {complex.geocodeError && (
                      <span className="text-[9px] text-red-500 pl-4 font-normal italic">
                        Error: {complex.geocodeError}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 p-3 rounded-lg border border-normal bg-alternative/30">
            <span className="text-xs font-bold text-strong flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-neutral shrink-0" />
              단지 검색 및 좌표 설정
            </span>
            <div className="relative flex gap-2 items-center mt-1">
              <div className="flex-1 relative">
                <input
                  type="text"
                  className="w-full h-[38px] rounded-lg border border-normal bg-normal pl-3 pr-8 text-xs font-semibold text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  value={coordsQuery}
                  onChange={(e) => {
                    setCoordsQuery(e.target.value);
                    setShowCoordsDropdown(true);
                    if (selectedComplex && e.target.value !== selectedComplex.name) {
                      setSelectedComplex(null);
                    }
                  }}
                  onFocus={() => setShowCoordsDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowCoordsDropdown(false);
                      setActiveCoordsIndex(-1);
                    }, 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (
                        showCoordsDropdown &&
                        activeCoordsIndex >= 0 &&
                        activeCoordsIndex < coordsApartments.length
                      ) {
                        handleSelectCoordsComplex(coordsApartments[activeCoordsIndex]);
                      }
                    } else if (showCoordsDropdown && coordsApartments.length > 0) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setActiveCoordsIndex((prev) => (prev < coordsApartments.length - 1 ? prev + 1 : prev));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveCoordsIndex((prev) => (prev > 0 ? prev - 1 : -1));
                      } else if (e.key === "Escape") {
                        setShowCoordsDropdown(false);
                        setActiveCoordsIndex(-1);
                      }
                    }
                  }}
                  placeholder="좌표를 수정할 단지명 검색..."
                  autoComplete="off"
                />
                {searchingCoords && (
                  <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-neutral" />
                )}

                {showCoordsDropdown && coordsApartments.length > 0 && (
                  <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-40 overflow-auto rounded-lg border border-normal bg-elevated py-1 shadow-lg">
                    {coordsApartments.map((complex, index) => (
                      <li key={`${complex.id}-${index}`}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectCoordsComplex(complex)}
                          className={classNames(
                            "w-full text-left px-3 py-1.5 text-xs transition-colors",
                            index === activeCoordsIndex
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-alternative text-strong"
                          )}
                        >
                          {complex.name}{" "}
                          <span className="text-[10px] text-neutral">
                            ({complex.regionName || complex.lawdCode})
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {selectedComplex && (
              <div className="mt-3 space-y-3 pt-3 border-t border-normal/50">
                <div className="mb-2">
                  <CoordPickerMap
                    lat={editLat && !isNaN(parseFloat(editLat)) ? parseFloat(editLat) : null}
                    lng={editLng && !isNaN(parseFloat(editLng)) ? parseFloat(editLng) : null}
                    regionName={selectedComplex.regionName || ""}
                    complexName={selectedComplex.name}
                    onSelectCoords={(lat, lng) => {
                      setEditLat(String(lat));
                      setEditLng(String(lng));
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral mb-1">위도 (Latitude)</label>
                    <input
                      type="text"
                      className="w-full h-[36px] rounded-lg border border-normal bg-normal px-3 text-xs font-semibold text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="예: 37.123456"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral mb-1">경도 (Longitude)</label>
                    <input
                      type="text"
                      className="w-full h-[36px] rounded-lg border border-normal bg-normal px-3 text-xs font-semibold text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="예: 127.123456"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    disabled={coordsUpdating}
                    onClick={handleResetCoords}
                    className="rounded-lg bg-orange-500/10 hover:bg-orange-500/20 px-3.5 py-2 text-xs font-bold text-orange-600 disabled:opacity-50 transition-all"
                  >
                    좌표 초기화(재수집)
                  </button>
                  <button
                    type="button"
                    disabled={coordsUpdating || !editLat.trim() || !editLng.trim()}
                    onClick={handleUpdateCoords}
                    className="rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50 transition-all"
                  >
                    좌표 저장
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
