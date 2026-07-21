import React, { useState, useEffect, useRef } from "react";
import { useKakaoMap } from "../../useKakaoMap";
import { SectionCard } from "../../components/SectionCard";
import { StatCard } from "../../components/StatCard";
import { PageHeader } from "../../components/PageHeader";
import { loadNearbyStation, triggerGeocodeBatch, loadGeocodeStats } from "../../api";
import { MapPin, Search, Map, Compass, Play, RefreshCw, AlertTriangle, ArrowRight, Bell, Settings, CheckCircle2 } from "lucide-react";
import { copy } from "../../locales/ko";

interface NearbyComplex {
  name: string;
  lawdCode: string;
  regionName: string;
  lat: number;
  lng: number;
  distanceM: number;
  dongName: string | null;
  jibun: string | null;
}

interface NearbyStationTabProps {
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
}

export default function NearbyStationTab({ onSelectComplex, onNavigateToRules }: NearbyStationTabProps) {
  const locale = "ko";
  const t = copy[locale];
  const { loaded: mapLoaded, error: mapError } = useKakaoMap();
  const [stationName, setStationName] = useState("");
  const [radiusM, setRadiusM] = useState(500);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showGeocodeAdmin, setShowGeocodeAdmin] = useState(false);

  // API 결과 상태
  const [searchResult, setSearchResult] = useState<{
    station: { name: string; lat: number; lng: number };
    radiusM: number;
    complexes: NearbyComplex[];
  } | null>(null);

  // Geocoding 통계 상태
  const [geocodeStats, setGeocodeStats] = useState<{
    total: number;
    geocoded: number;
    pending: number;
  } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<{ total: number; success: number; failed: number } | null>(null);

  // 지도 레퍼런스
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const stationMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  // 1. Geocoding 통계 조회
  const fetchGeocodeStats = async () => {
    try {
      const stats = await loadGeocodeStats();
      setGeocodeStats(stats);
    } catch (err) {
      console.error("Failed to load geocode stats", err);
    }
  };

  useEffect(() => {
    fetchGeocodeStats();
  }, []);

  // 2. 검색 실행
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stationName.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setBatchResult(null);

    try {
      const result = await loadNearbyStation(stationName.trim(), radiusM);
      setSearchResult(result);
      if (result.geocodeStats) {
        setGeocodeStats(result.geocodeStats);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t.stationSearchFailed || "지하철역 조회에 실패했습니다.");
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 3. 일괄 Geocoding 실행
  const handleGeocodeBatch = async () => {
    if (batchLoading) return;
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await triggerGeocodeBatch();
      setBatchResult(res);
      await fetchGeocodeStats();
      // 검색 결과도 갱신하여 새로운 좌표 단지 반영
      await handleSearch();
    } catch (err: any) {
      setErrorMsg(err.message || t.geocodeBatchFailed || "Geocoding 배치 실행에 실패했습니다.");
    } finally {
      setBatchLoading(false);
    }
  };

  // 4. 카카오 지도 초기화 및 마커 렌더링
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || !searchResult) return;

    const kakao = window.kakao;
    const center = new kakao.maps.LatLng(searchResult.station.lat, searchResult.station.lng);

    // 지도가 없으면 생성, 있으면 중심 이동
    if (!mapRef.current) {
      const options = {
        center,
        level: 4, // 줌 레벨
        draggable: true,
        zoomable: true,
      };
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, options);
    } else {
      mapRef.current.relayout();
      mapRef.current.setCenter(center);
    }

    const map = mapRef.current;

    // 기존 요소 정리
    if (stationMarkerRef.current) stationMarkerRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);
    for (const overlay of overlaysRef.current) {
      overlay.setMap(null);
    }
    overlaysRef.current = [];

    // 지하철역 마커 생성
    const stationContent = document.createElement("div");
    stationContent.className = "relative z-30 select-none";
    stationContent.innerHTML = `
      <div class="flex flex-col items-center">
        <div class="bg-indigo-600 border-2 border-white text-white font-black text-xs px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-yellow-400 animate-ping"></span>
          <span>${searchResult.station.name}</span>
        </div>
        <div class="w-0.5 h-3 bg-indigo-600 shadow-md"></div>
      </div>
    `;

    stationMarkerRef.current = new kakao.maps.CustomOverlay({
      position: center,
      content: stationContent,
      yAnchor: 1.0,
    });
    stationMarkerRef.current.setMap(map);

    // 반경 Circle 생성
    circleRef.current = new kakao.maps.Circle({
      center,
      radius: searchResult.radiusM,
      strokeWeight: 1.5,
      strokeColor: "#6366f1",
      strokeOpacity: 0.7,
      strokeStyle: "dashed",
      fillColor: "#818cf8",
      fillOpacity: 0.08,
    });
    circleRef.current.setMap(map);

    // 아파트 단지 마커(오버레이)들 추가
    const bounds = new kakao.maps.LatLngBounds();
    bounds.extend(center); // 지하철역 포함

    const newOverlays = searchResult.complexes.map((c) => {
      const pos = new kakao.maps.LatLng(c.lat, c.lng);
      bounds.extend(pos);

      const el = document.createElement("div");
      el.className = "relative -translate-y-[100%] select-none pointer-events-auto group";

      el.innerHTML = `
        <div class="flex flex-col items-center cursor-pointer transition-all duration-200 hover:scale-105 hover:z-50 active:scale-95">
          <div class="px-2 py-1.5 rounded-lg bg-emerald-600 border border-emerald-500 text-white font-bold flex flex-col items-center text-center shadow-md">
            <span class="text-[9px] truncate max-w-[100px] leading-tight font-medium opacity-90">${c.name}</span>
            <div class="flex items-baseline gap-0.5 mt-0.5">
              <span class="text-xs font-black tracking-tight">${c.distanceM}</span>
              <span class="text-[8px] font-bold opacity-80">m</span>
            </div>
          </div>
          <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-emerald-600"></div>
        </div>
      `;

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectComplex(c.name, c.lawdCode);
      });

      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: el,
        xAnchor: 0.5,
        yAnchor: 0,
      });

      overlay.setMap(map);
      return overlay;
    });

    overlaysRef.current = newOverlays;

    // 지도를 단지들이 한눈에 보이게 바운즈 재설정
    if (searchResult.complexes.length > 0) {
      map.setBounds(bounds);
      // 너무 줌인되는 방지
      if (map.getLevel() < 3) {
        map.setLevel(3);
      }
    } else {
      map.setLevel(4);
    }

    return () => {
      if (stationMarkerRef.current) stationMarkerRef.current.setMap(null);
      if (circleRef.current) circleRef.current.setMap(null);
      for (const overlay of overlaysRef.current) {
        overlay.setMap(null);
      }
      overlaysRef.current = [];
      mapRef.current = null;
    };
  }, [mapLoaded, searchResult]);

  // 지도 다시 중심으로
  const handleResetCenter = () => {
    if (!mapRef.current || !searchResult) return;
    const center = new window.kakao.maps.LatLng(searchResult.station.lat, searchResult.station.lng);
    mapRef.current.relayout();
    mapRef.current.setCenter(center);
  };

  const geocodePercentage = geocodeStats && geocodeStats.total > 0
    ? Math.round((geocodeStats.geocoded / geocodeStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t.nearbyStationTitle || "역세권 아파트 검색"}
        subtitle={t.nearbyStationSubtitle || "지하철역 주변 관심 반경 내의 아파트 단지 정보와 위치를 검색합니다."}
        icon={Compass}
      />

      {/* 검색 & 정보 패널 */}
      <div className="space-y-6">
        {/* 역세권 검색 카드 */}
        <div>
          <SectionCard
            title={t.nearbyStationTitle || "역세권 아파트 검색"}
            right={
              <button
                type="button"
                onClick={() => setShowGeocodeAdmin(!showGeocodeAdmin)}
                className={`px-3 py-1.5 rounded-lg border border-normal text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
                  showGeocodeAdmin
                    ? "bg-primary text-white border-transparent"
                    : "bg-alternative hover:bg-opacity-90 text-strong"
                }`}
              >
                <Settings size={13} />
                <span>{t.geocodeStatsBtn || "좌표 캐싱 설정"}</span>
              </button>
            }
          >
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-neutral">
                    <MapPin size={18} />
                  </span>
                  <input
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder={t.stationPlaceholder || "예: 판교역, 강남역"}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-normal bg-elevated text-strong font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 min-w-[200px]">
                  <span className="text-xs font-bold text-neutral whitespace-nowrap">{t.nearbyRadiusLabel}</span>
                  <select
                    value={radiusM}
                    onChange={(e) => setRadiusM(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-normal bg-elevated text-strong font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
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
                  disabled={loading}
                  className="flex items-center justify-center gap-1 px-5 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-semibold rounded-lg shadow-lg shadow-primary/20 transition disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  <span>{loading ? (t.loading || "조회 중...") : (t.searchButton || "조회하기")}</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-500 flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>
          </SectionCard>
        </div>

        {/* Geocoding 관리 카드 */}
        {showGeocodeAdmin && (
          <SectionCard
            title={t.geocodeStatsTitle || "Geocoding 좌표 캐싱 관리"}
            right={<Settings size={15} className="text-neutral" />}
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-neutral">{t.geocodePercentageOfTotal || "좌표 데이터 현황"}</span>
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
                    {(t.geocodeRequiredDesc || "현재 DB에 등록된 아파트 중 {pending}개 단지의 위도·경도 좌표가 없습니다...").replace("{pending}", String(geocodeStats.pending))}
                  </p>
                  <button
                    onClick={handleGeocodeBatch}
                    disabled={batchLoading}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {batchLoading ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Play size={15} />
                    )}
                    <span>{batchLoading ? (t.loading || "수집 중...") : (t.runGeocodeBatchBtn || "좌표 미확보 단지 일괄 수집")}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 py-2">
                  ✓ 모든 아파트 단지의 위도·경도 좌표가 확보되었습니다.
                </p>
              )}

              {batchResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 font-bold space-y-1">
                  <p>✓ {t.batchGeocodeCompleted || "Geocoding 수집 배치 완료"}</p>
                  <p>- {(t.batchGeocodeCountInfo || "대상: {total}건 / 성공: {success}건 / 실패: {failed}건").replace("{total}", String(batchResult.total)).replace("{success}", String(batchResult.success)).replace("{failed}", String(batchResult.failed))}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {/* 검색 결과 */}
      {searchResult && (
        <div className="space-y-6">
          {/* 통계 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
              label={t.nearbyComplexesTitle || "반경 내 단지 정보"}
              value={`${searchResult.complexes.length} ${t.unitComplex || "개"}`}
              icon={Map}
              tone="good"
            />
            <StatCard
              label={t.nearbyRadiusLabel || "검색 반경"}
              value={`${searchResult.radiusM} m`}
              icon={Compass}
              tone="warn"
            />
          </div>

          {/* 메인 결과 뷰 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* 단지 목록 */}
            <div className="lg:col-span-1 order-2 lg:order-1 h-full">
              <div className="bg-elevated border border-normal rounded-xl p-4 flex flex-col" style={{ height: "550px" }}>
                <div className="flex items-center justify-between border-b border-normal pb-3 mb-3 shrink-0">
                  <h3 className="font-bold text-strong text-sm flex items-center gap-1.5">
                    <MapPin className="text-primary h-4 w-4 shrink-0" />
                    {t.nearbyComplexesTitle || "반경 내 단지 정보"} ({searchResult.complexes.length}{t.unitComplex || "개"})
                  </h3>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  {searchResult.complexes.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs font-semibold text-neutral">
                      {t.noNearbyComplexes || "반경 이내에 등록된 아파트 단지가 없습니다."}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      {onNavigateToRules && (
                        <button
                          type="button"
                          onClick={() => {
                            const first = searchResult.complexes[0];
                            onNavigateToRules({
                              regionName: first.regionName,
                              regionCode: first.lawdCode,
                              apartmentKeywords: searchResult.complexes.map((c) => c.name),
                            });
                          }}
                          className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-emerald-500/20 mb-3 shrink-0"
                          title={t.alertRegisterTip || "반경 내 모든 단지를 관심 조건 알림 규칙으로 등록합니다."}
                        >
                          <Bell size={13} />
                          {t.allComplexAlertRegister || "전체 단지 알림 등록"} ({searchResult.complexes.length}{t.unitComplex || "개"})
                        </button>
                      )}
                      <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                        {searchResult.complexes.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              if (mapRef.current) {
                                const pos = new window.kakao.maps.LatLng(c.lat, c.lng);
                                mapRef.current.panTo(pos);
                              }
                            }}
                            className="group p-3 rounded-xl border border-normal bg-elevated/40 hover:bg-elevated hover:border-indigo-500/50 cursor-pointer transition-all duration-200 flex justify-between items-center"
                          >
                            <div className="space-y-1 min-w-0 pr-2">
                              <h4 className="font-bold text-strong text-xs truncate">{c.name}</h4>
                              <p className="text-[10px] text-neutral truncate">
                                {c.regionName} {c.dongName || ""} {c.jibun || ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-black text-indigo-500 tracking-tight">{c.distanceM}m</span>
                                <p className="text-[8px] text-neutral uppercase font-bold tracking-wider mt-0.5">{t.distance || "거리"}</p>
                              </div>
                              {onNavigateToRules && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToRules({
                                      regionName: c.regionName,
                                      regionCode: c.lawdCode,
                                      apartmentKeywords: [c.name]
                                    });
                                  }}
                                  className="p-1.5 rounded-lg bg-alternative hover:bg-emerald-500 hover:text-white transition-all active:scale-90 text-neutral"
                                  title={t.alertRegisterBtn || "알림 규칙 등록"}
                                >
                                  <Bell size={13} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectComplex(c.name, c.lawdCode);
                                }}
                                className="p-1.5 rounded-lg bg-alternative hover:bg-primary hover:text-white transition-all active:scale-90 text-neutral"
                                  title={t.complexAnalysisLink || "단지 분석으로 이동"}
                              >
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 지도 */}
            <div className="lg:col-span-2 order-1 lg:order-2 h-full">
              <div className="bg-elevated border border-normal rounded-xl p-3 flex flex-col" style={{ height: "550px" }}>
                <div className="flex justify-between items-center mb-3 shrink-0">
                  <span className="text-xs font-bold text-neutral flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    {t.clickComplexToAnalyze || "단지 위치를 클릭하면 단지 상세 분석으로 이동합니다."}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetCenter}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-normal bg-alternative hover:bg-opacity-95 text-strong flex items-center gap-1"
                  >
                    <Compass size={12} />
                    {t.centerToStation || "지하철역 중심으로"}
                  </button>
                </div>
                <div className="flex-1 w-full relative rounded-lg overflow-hidden border border-normal">
                  {mapError ? (
                    <div className="w-full h-full bg-red-500/5 flex flex-col items-center justify-center text-center p-6">
                      <MapPin className="text-red-500 animate-bounce mb-2" size={32} />
                      <p className="text-xs font-bold text-red-500">{t.mapLoadError || "지도를 로드하지 못했습니다."}</p>
                    </div>
                  ) : !mapLoaded ? (
                    <div className="w-full h-full bg-alternative flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2" />
                      <p className="text-xs font-bold text-neutral">{t.loadingMap || "지도 준비 중..."}</p>
                    </div>
                  ) : (
                    <div ref={mapContainerRef} className="w-full h-full min-h-[350px]" style={{ touchAction: "auto" }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

