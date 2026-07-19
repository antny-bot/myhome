import React, { useState, useEffect, useRef } from "react";
import { useKakaoMap } from "../../useKakaoMap";
import { SectionCard } from "../../components/SectionCard";
import { StatCard } from "../../components/StatCard";
import { loadNearbyStation, triggerGeocodeBatch, loadGeocodeStats } from "../../api";
import { MapPin, Search, Map, Compass, Play, RefreshCw, AlertTriangle, ArrowRight, Bell } from "lucide-react";
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
  const [stationName, setStationName] = useState("판교역");
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
      setErrorMsg(err.message || "지하철역 조회에 실패했습니다.");
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드 시 판교역 500m 자동 검색
  useEffect(() => {
    handleSearch();
  }, []);

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
      setErrorMsg(err.message || "Geocoding 배치 실행에 실패했습니다.");
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
      {/* 검색 & 정보 패널 */}
      <div className="space-y-6">
        {/* 역세권 검색 카드 */}
        <div>
          <SectionCard
            title="🚇 역세권 아파트 검색"
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
                <span>⚙️ 좌표 캐싱 설정</span>
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
                    placeholder="지하철역 이름 입력 (예: 판교역, 강남역)"
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
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  <Search size={18} />
                  <span>{loading ? "검색 중..." : "단지 검색"}</span>
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
          <SectionCard title="⚙️ Geocoding 좌표 캐싱 관리">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold">
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
                    검색 속도 향상을 위해 국토부 지번 주소 기반으로 카카오 Geocoding 일괄 수집을 실행할 수 있습니다.
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
                    <span>{batchLoading ? "좌표 수집 중..." : "좌표 미확보 단지 일괄 수집"}</span>
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1.5 py-2">
                  ✓ 모든 아파트 단지의 위도·경도 좌표가 확보되었습니다.
                </p>
              )}

              {batchResult && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 font-bold space-y-1">
                  <p>✓ Geocoding 수집 배치 완료</p>
                  <p>- 대상: {batchResult.total}건 / 성공: {batchResult.success}건 / 실패: {batchResult.failed}건</p>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="지하철역 좌표"
              value={`${searchResult.station.lat.toFixed(4)}, ${searchResult.station.lng.toFixed(4)}`}
              icon={MapPin}
              tone="default"
            />
            <StatCard
              label="반경 내 단지 수"
              value={`${searchResult.complexes.length} 개`}
              icon={Map}
              tone="good"
            />
            <StatCard
              label="검색 반경"
              value={`${searchResult.radiusM} m`}
              icon={Compass}
              tone="warn"
            />
            <StatCard
              label="Geocoding 완료"
              value={`${geocodePercentage}%`}
              icon={RefreshCw}
              tone="default"
            />
          </div>

          {/* 메인 결과 뷰 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* 단지 목록 */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <SectionCard title={`📍 반경 내 단지 정보 (${searchResult.complexes.length}개)`}>
                {searchResult.complexes.length === 0 ? (
                  <div className="py-12 text-center text-xs font-semibold text-neutral">
                    반경 {searchResult.radiusM}m 이내에 등록된 아파트 단지가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
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
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-emerald-500/20"
                        title="반경 내 모든 단지를 관심 조건 알림 규칙으로 등록합니다."
                      >
                        <Bell size={13} />
                        전체 단지 알림 등록 ({searchResult.complexes.length}개)
                      </button>
                    )}
                    <div className="space-y-3.5 max-h-[470px] overflow-y-auto pr-1">
                    {searchResult.complexes.map((c, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (mapRef.current) {
                            const pos = new window.kakao.maps.LatLng(c.lat, c.lng);
                            mapRef.current.panTo(pos);
                          }
                        }}
                        className="group p-3.5 rounded-xl border border-normal bg-elevated/40 hover:bg-elevated hover:border-indigo-500/50 cursor-pointer transition-all duration-200 flex justify-between items-center"
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <h4 className="font-bold text-strong text-sm truncate">{c.name}</h4>
                          <p className="text-[10px] text-neutral truncate">
                            {c.regionName} {c.dongName || ""} {c.jibun || ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-black text-indigo-500 tracking-tight">{c.distanceM}m</span>
                            <p className="text-[8px] text-neutral uppercase font-bold tracking-wider mt-0.5">거리</p>
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
                              className="p-2 rounded-lg bg-alternative hover:bg-emerald-500 hover:text-white transition-all active:scale-90 text-neutral"
                              title="알림 규칙 등록"
                            >
                              <Bell size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectComplex(c.name, c.lawdCode);
                            }}
                            className="p-2 rounded-lg bg-alternative hover:bg-primary hover:text-white transition-all active:scale-90 text-neutral"
                            title="단지 분석으로 이동"
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </SectionCard>
            </div>

            {/* 지도 */}
            <div className="lg:col-span-2 order-1 lg:order-2 h-full">
              <div className="bg-elevated border border-normal rounded-xl p-3 flex flex-col" style={{ height: "550px" }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-neutral">✓ 단지 위치를 클릭하면 단지 상세 분석으로 이동합니다.</span>
                  <button
                    type="button"
                    onClick={handleResetCenter}
                    className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-normal bg-alternative hover:bg-opacity-95 text-strong flex items-center gap-1"
                  >
                    <Compass size={12} />
                    지하철역 중심으로
                  </button>
                </div>
                <div className="flex-1 w-full relative rounded-lg overflow-hidden border border-normal">
                  {mapError ? (
                    <div className="w-full h-full bg-red-500/5 flex flex-col items-center justify-center text-center p-6">
                      <MapPin className="text-red-500 animate-bounce mb-2" size={32} />
                      <p className="text-xs font-bold text-red-500">카카오 지도를 로드하지 못했습니다.</p>
                    </div>
                  ) : !mapLoaded ? (
                    <div className="w-full h-full bg-alternative flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2" />
                      <p className="text-xs font-bold text-neutral">카카오 지도 준비 중...</p>
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

