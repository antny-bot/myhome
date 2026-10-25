import React from "react";
import { Map as MapIcon, ArrowRight, Bell } from "lucide-react";
import type { RegionMapComplexItem } from "@myhome/shared";
import { ComplexMetaBadges } from "../../components/common/ComplexMetaBadges";
import { useLocale } from "../../lib/i18n";

export interface ComplexListItemProps {
  complex: RegionMapComplexItem;
  isSelected: boolean;
  onFocus: (complex: RegionMapComplexItem) => void;
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
}

export function ComplexListItem({
  complex: c,
  isSelected,
  onFocus,
  onSelectComplex,
  onNavigateToRules
}: ComplexListItemProps) {
  const { t } = useLocale();
  const hasCoords = c.lat !== null && c.lng !== null;

  return (
    <div
      onClick={() => onFocus(c)}
      className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "bg-primary/10 border-primary/40 dark:border-primary/60 shadow-sm"
          : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px] sm:max-w-none">
              {c.name}
            </span>
            {c.dongName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 shrink-0">
                {c.dongName}
              </span>
            )}
            {!hasCoords && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 shrink-0 font-medium">
                좌표미등록
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
            <span>
              {t.latestDealPrice || "최근"}:{" "}
              <strong className="text-primary font-black">
                {c.latestPriceEok !== null ? `${c.latestPriceEok}억` : "-"}
              </strong>
            </span>
            {c.avgPriceEok !== null && (
              <span>
                {t.avgDealPrice || "평균"}: {c.avgPriceEok}억
              </span>
            )}
            <span>{c.txCount}건 거래</span>
          </div>

          {c.latestDealDate && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              최근 거래일: {c.latestDealDate}
            </div>
          )}

          <ComplexMetaBadges
            totalHouseholds={c.totalHouseholds}
            totalParking={c.totalParking}
            parkingPerHousehold={c.parkingPerHousehold}
            useApprovalDate={c.useApprovalDate}
            size="sm"
            className="mt-1.5"
          />
        </div>

        {/* 단지 분석 및 지도 바로가기 액션 버튼 */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFocus(c);
              }}
              className="flex lg:hidden items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 shadow-xs transition-all active:scale-95 whitespace-nowrap"
              title={t.viewOnMap || "지도 보기"}
            >
              <MapIcon size={11} className="text-primary" />
              <span>{t.viewOnMap || "지도 보기"}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectComplex(c.name, c.lawdCode);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-sm transition-all active:scale-95 whitespace-nowrap"
              title={t.viewComplexAnalysisBtn || "단지 분석 바로가기"}
            >
              <span>단지 분석</span>
              <ArrowRight size={12} />
            </button>
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
              className="text-[10px] text-slate-400 hover:text-primary flex items-center gap-0.5 transition-colors"
            >
              <Bell size={10} />
              <span>알림 등록</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComplexListItem;
