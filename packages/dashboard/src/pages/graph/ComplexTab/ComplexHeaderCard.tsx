import React from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { useLocale } from "../../../lib/i18n.js";
import type { ComplexMetaFilter } from "@myhome/shared";

interface ComplexHeaderCardProps {
  complexName: string;
  detailData: any;
  metaFilter?: ComplexMetaFilter;
  selectedArea?: number;
  setSelectedArea: (area?: number) => void;
  availableSizes: string[];
  formatSizeString: (size: string, unit: "pyeong" | "m2") => string;
  areaUnit: "pyeong" | "m2";
  showDetailInfras: boolean;
  setShowDetailInfras: (show: boolean) => void;
  setShowInfoModal: (show: boolean) => void;
}

export function ComplexHeaderCard({
  complexName,
  detailData,
  metaFilter,
  selectedArea,
  setSelectedArea,
  availableSizes,
  formatSizeString,
  areaUnit,
  showDetailInfras,
  setShowDetailInfras,
  setShowInfoModal,
}: ComplexHeaderCardProps) {
  const { t } = useLocale();

  return (
    <div className="bg-elevated border border-normal rounded-xl p-4 md:p-5 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* 좌측: 단지 기본 정보 + 통합 입지 등급 & 점수 */}
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl md:text-2xl font-black text-strong tracking-tight">
              {complexName}
            </h2>
            <span className="text-xs text-neutral font-medium">{t.detailReport}</span>

            {/* 통합 입지 등급 배지 */}
            {detailData?.infraRating && (
              <button
                type="button"
                onClick={() => setShowDetailInfras(!showDetailInfras)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer hover:opacity-90 ${
                  detailData.infraRating.grade === "S"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    : detailData.infraRating.grade === "A"
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                    : detailData.infraRating.grade === "B"
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                    : detailData.infraRating.grade === "C"
                    ? "bg-orange-500/10 text-orange-500 border-orange-500/30"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/30"
                }`}
                title="클릭하여 반경 1km 주변 인프라 상세 지표 펼치기/접기"
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black bg-current/20">
                  {detailData.infraRating.grade}
                </span>
                <span>{detailData.infraRating.grade}등급</span>
                <span className="font-mono font-bold">({detailData.infraRating.totalScore}점)</span>
                <span className="text-[10px] opacity-75 font-semibold">인프라</span>
                {showDetailInfras ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}

            {/* 산출 기준 모달 도움말 버튼 */}
            {detailData?.infraRating && (
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="text-assistive hover:text-primary transition-colors p-1 rounded-full hover:bg-alternative"
                title="산출 기준 보기"
              >
                <HelpCircle size={15} />
              </button>
            )}

            {/* 필터 조건 일치 여부 배지 */}
            {(() => {
              if (
                !metaFilter ||
                (!metaFilter.minHouseholds &&
                  !metaFilter.minParkingPerHousehold &&
                  !metaFilter.minBuildYear &&
                  !metaFilter.maxBuildYear)
              ) {
                return null;
              }
              if (!detailData?.complexInfo) return null;
              const info = detailData.complexInfo;
              const reasons: string[] = [];
              if (
                metaFilter.minHouseholds &&
                (info.totalHouseholds ?? 0) < metaFilter.minHouseholds
              ) {
                reasons.push(`${metaFilter.minHouseholds}세대 미만`);
              }
              if (
                metaFilter.minParkingPerHousehold &&
                (info.parkingPerHousehold ?? 0) < metaFilter.minParkingPerHousehold
              ) {
                reasons.push(`주차 ${metaFilter.minParkingPerHousehold}대 미만`);
              }
              const buildYear = info.useApprovalDate
                ? parseInt(info.useApprovalDate.substring(0, 4))
                : null;
              if (metaFilter.minBuildYear && (!buildYear || buildYear < metaFilter.minBuildYear)) {
                reasons.push(`${metaFilter.minBuildYear}년 이전 준공`);
              }
              if (metaFilter.maxBuildYear && (!buildYear || buildYear > metaFilter.maxBuildYear)) {
                reasons.push(`${metaFilter.maxBuildYear}년 이후 준공`);
              }
              if (reasons.length === 0) {
                return (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    ✓ 필터 조건 일치
                  </span>
                );
              }
              return (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-amber-500/10 text-amber-500 border-amber-500/20"
                  title={reasons.join(", ")}
                >
                  ⚠ 필터 조건 미부합 ({reasons.join(", ")})
                </span>
              );
            })()}
          </div>

          {/* 단지 스펙: 세대수 / 주차 / 준공년차 */}
          {detailData?.complexInfo &&
            (detailData.complexInfo.totalHouseholds ||
              detailData.complexInfo.parkingPerHousehold ||
              detailData.complexInfo.useApprovalDate) && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-neutral">
                {detailData.complexInfo.totalHouseholds && (
                  <span className="inline-flex items-center gap-1 bg-alternative border border-normal px-2.5 py-0.5 rounded-md">
                    🏠 {detailData.complexInfo.totalHouseholds.toLocaleString()}세대
                  </span>
                )}
                {detailData.complexInfo.parkingPerHousehold && (
                  <span
                    className="inline-flex items-center gap-1 bg-alternative border border-normal px-2.5 py-0.5 rounded-md"
                    title={`총 주차대수: ${detailData.complexInfo.totalParking}대`}
                  >
                    🚗 주차 {detailData.complexInfo.parkingPerHousehold}대
                  </span>
                )}
                {detailData.complexInfo.useApprovalDate && (
                  <span className="inline-flex items-center gap-1 bg-alternative border border-normal px-2.5 py-0.5 rounded-md">
                    📅 {detailData.complexInfo.useApprovalDate.substring(0, 7)} 준공
                    {(() => {
                      const year = parseInt(detailData.complexInfo.useApprovalDate.substring(0, 4));
                      const age = isNaN(year) ? null : new Date().getFullYear() - year + 1;
                      return age !== null ? ` (${age}년차)` : "";
                    })()}
                  </span>
                )}
              </div>
            )}
        </div>

        {/* 우측: 크기(평수) 선택 탭 바 */}
        <div className="flex bg-alternative p-1 rounded-lg border border-normal self-start lg:self-center gap-0.5 overflow-x-auto max-w-full shrink-0">
          <button
            onClick={() => setSelectedArea(undefined)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap ${
              selectedArea === undefined
                ? "bg-primary text-[var(--color-semantic-background-normal-normal)] shadow-sm"
                : "text-neutral hover:text-strong"
            }`}
          >
            {t.allArea}
          </button>
          {availableSizes.map((size) => {
            const areaNum = parseInt(size);
            const isActive = selectedArea === areaNum;
            return (
              <button
                key={size}
                onClick={() => setSelectedArea(areaNum)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-[var(--color-semantic-background-normal-normal)] shadow-sm"
                    : "text-neutral hover:text-strong"
                }`}
              >
                {formatSizeString(size, areaUnit)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
