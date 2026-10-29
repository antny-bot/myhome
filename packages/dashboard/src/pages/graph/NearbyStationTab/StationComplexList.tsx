import React from "react";
import {
  Database,
  Zap,
  Bell,
  ArrowRight,
  Download,
  Loader2,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { useLocale } from "../../../lib/i18n.js";
import type { NearbyStationDataState } from "./useNearbyStationData.js";

interface StationComplexListProps {
  state: NearbyStationDataState;
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: {
    regionName: string;
    regionCode?: string;
    apartmentKeywords: string[];
  }) => void;
  onPanTo?: (lat: number, lng: number) => void;
}

export function StationComplexList({
  state,
  onSelectComplex,
  onNavigateToRules,
  onPanTo,
}: StationComplexListProps) {
  const { t } = useLocale();
  const [selectedLiveComplex, setSelectedLiveComplex] = React.useState<any>(null);

  const { mergedComplexes, searchResult, fetchingComplex, fetchResult, fetchError } = state;

  return (
    <div className="bg-elevated border border-normal rounded-xl flex flex-col" style={{ height: "550px" }}>
      {/* 타이틀 헤더 */}
      <div className="flex items-center justify-between border-b border-normal px-4 py-3 shrink-0 select-none">
        <span className="text-xs font-black text-strong flex items-center gap-1.5">
          <Database size={13} className="text-primary" />
          {t.nearbyComplexesTitle || "반경 내 단지 정보"}
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary-200/20">
          {mergedComplexes.length} {t.unitComplex || "개"}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {mergedComplexes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
            <Zap className="text-assistive h-8 w-8 mb-2" />
            <p className="text-xs font-semibold text-neutral">반경 내 단지 정보가 없습니다.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {onNavigateToRules && searchResult && searchResult.complexes.length > 0 && (
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
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] shrink-0"
                title={t.alertRegisterTip || "반경 내 모든 단지를 관심 조건 알림 규칙으로 등록합니다."}
              >
                <Bell size={13} />
                {t.allComplexAlertRegister || "전체 단지 알림 등록"} ({searchResult.complexes.length}
                {t.unitComplex || "개"})
              </button>
            )}

            {/* 통합 스크롤 리스트 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {mergedComplexes.map((c: any, idx: number) => (
                <div
                  key={idx}
                  onClick={() => {
                    if (c.lat && c.lng && onPanTo) {
                      onPanTo(c.lat, c.lng);
                    }
                  }}
                  className="group p-2.5 rounded-xl border border-normal bg-elevated/40 hover:bg-elevated hover:border-primary/50 cursor-pointer transition-all duration-200"
                >
                  <div className="flex justify-between items-center gap-2">
                    <div className="space-y-0.5 min-w-0 pr-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-strong text-xs truncate max-w-[140px] md:max-w-none">
                          {c.name}
                        </h4>
                        {c.hasDbData ? (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            DB ✓
                          </span>
                        ) : (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            실시간
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral truncate">
                        {c.regionName ? `${c.regionName} ` : ""}
                        {c.dongName || ""} {c.jibun || ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-primary tracking-tight">
                          {c.distanceM !== null ? `${c.distanceM}m` : "-"}
                        </span>
                        <p className="text-[8px] text-neutral uppercase font-bold tracking-wider mt-0.5">
                          {t.distance || "거리"}
                        </p>
                      </div>

                      {c.hasDbData ? (
                        <>
                          {onNavigateToRules && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToRules({
                                  regionName: c.regionName || `${c.dongName}`,
                                  regionCode: c.lawdCode,
                                  apartmentKeywords: [c.name],
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
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={!!fetchingComplex}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLiveComplex(c);
                            state.handleFetchComplexData(c);
                          }}
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500 hover:text-white transition-all active:scale-90 text-blue-500 disabled:opacity-50"
                          title="실거래 데이터 수집 (최근 12개월)"
                        >
                          {fetchingComplex === c.name ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Download size={13} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 온디맨드 적재 패널 */}
      {selectedLiveComplex && (
        <div className="m-3 p-3 bg-alternative border border-normal rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-strong text-xs flex items-center gap-1.5">
              <Download className="text-blue-500 h-3.5 w-3.5" />
              실거래 데이터 수집
            </h4>
            <button
              type="button"
              onClick={() => setSelectedLiveComplex(null)}
              className="text-neutral hover:text-strong p-0.5"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-[11px] text-neutral">
            <span className="font-bold text-strong">{selectedLiveComplex.name}</span> 단지의 최근 12개월
            실거래 데이터를 수집합니다.
          </p>

          {fetchingComplex === selectedLiveComplex.name && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />
              <span className="text-xs font-semibold text-blue-600">국토부 API 호출 및 DB 적재 중...</span>
            </div>
          )}

          {fetchResult && (
            <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
              <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                수집 완료! ({fetchResult.inserted}건 적재)
              </p>
              <button
                type="button"
                onClick={() =>
                  onSelectComplex(selectedLiveComplex.name, selectedLiveComplex.lawdCode)
                }
                className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
              >
                <ChevronRight size={13} />
                단지 분석으로 이동
              </button>
            </div>
          )}

          {fetchError && (
            <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/20">
              <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                {fetchError}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
