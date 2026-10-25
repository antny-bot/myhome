import React from "react";
import { X, ArrowRight, Bell } from "lucide-react";
import type { RegionMapComplexItem } from "@myhome/shared";
import { ComplexMetaBadges } from "../../components/common/ComplexMetaBadges";
import { useLocale } from "../../lib/i18n";

export interface SelectedComplexCardProps {
  complex: RegionMapComplexItem;
  onClose: () => void;
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
}

export function SelectedComplexCard({
  complex,
  onClose,
  onSelectComplex,
  onNavigateToRules
}: SelectedComplexCardProps) {
  const { t } = useLocale();

  return (
    <div className="absolute bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-96 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-primary/20 dark:border-primary/30 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              {complex.name}
            </h3>
            {complex.dongName && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {complex.dongName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {complex.regionName} {complex.jibun || complex.roadName || ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          title="닫기"
        >
          <X size={16} />
        </button>
      </div>

      {/* 건축물대장 4대 메타 뱃지 */}
      <ComplexMetaBadges
        totalHouseholds={complex.totalHouseholds}
        totalParking={complex.totalParking}
        parkingPerHousehold={complex.parkingPerHousehold}
        useApprovalDate={complex.useApprovalDate}
        size="md"
        className="mb-2"
      />

      {/* 가격 및 거래 정보 그리드 */}
      <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-100 dark:border-slate-800 text-center">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">{t.latestDealPrice || "최근 거래"}</span>
          <span className="text-xs font-black text-primary">
            {complex.latestPriceEok !== null ? `${complex.latestPriceEok}억` : "-"}
          </span>
        </div>
        <div className="flex flex-col border-x border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400">{t.avgDealPrice || "평균 가격"}</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {complex.avgPriceEok !== null ? `${complex.avgPriceEok}억` : "-"}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">{t.dealCountLabel || "총 거래건수"}</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {complex.txCount}건
          </span>
        </div>
      </div>

      {/* 하단 액션 버튼 */}
      <div className="flex items-center gap-2 mt-3 pt-1">
        {onNavigateToRules && (
          <button
            type="button"
            onClick={() => {
              onNavigateToRules({
                regionName: complex.regionName,
                regionCode: complex.lawdCode,
                apartmentKeywords: [complex.name]
              });
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all active:scale-98"
          >
            <Bell size={13} className="text-amber-500" />
            <span>알림 등록</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelectComplex(complex.name, complex.lawdCode)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-98"
        >
          <span>심층 분석</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
export default SelectedComplexCard;
