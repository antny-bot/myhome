import React from "react";
import { Users, Car, Calendar, RotateCcw } from "lucide-react";
import type { ComplexMetaFilter } from "@myhome/shared";
import { classNames } from "../../lib/format";

export interface ComplexMetaFilterBarProps {
  filter: ComplexMetaFilter;
  onChange: (newFilter: ComplexMetaFilter) => void;
  className?: string;
  isCompact?: boolean;
}

export function ComplexMetaFilterBar({
  filter,
  onChange,
  className = "",
  isCompact = false
}: ComplexMetaFilterBarProps) {
  const currentYear = new Date().getFullYear();

  const handleHouseholdChange = (val?: number) => {
    onChange({
      ...filter,
      minHouseholds: filter.minHouseholds === val ? undefined : val
    });
  };

  const handleParkingChange = (val?: number) => {
    onChange({
      ...filter,
      minParkingPerHousehold: filter.minParkingPerHousehold === val ? undefined : val
    });
  };

  const handleAgeChange = (preset: "all" | "under5" | "under10" | "over15" | "over30") => {
    if (preset === "all") {
      onChange({
        ...filter,
        minBuildYear: undefined,
        maxBuildYear: undefined
      });
      return;
    }
    if (preset === "under5") {
      // 최근 5년 이내 (신축)
      const minYear = currentYear - 4;
      if (filter.minBuildYear === minYear) {
        onChange({ ...filter, minBuildYear: undefined, maxBuildYear: undefined });
      } else {
        onChange({ ...filter, minBuildYear: minYear, maxBuildYear: undefined });
      }
      return;
    }
    if (preset === "under10") {
      // 최근 10년 이내
      const minYear = currentYear - 9;
      if (filter.minBuildYear === minYear) {
        onChange({ ...filter, minBuildYear: undefined, maxBuildYear: undefined });
      } else {
        onChange({ ...filter, minBuildYear: minYear, maxBuildYear: undefined });
      }
      return;
    }
    if (preset === "over15") {
      // 15년 이상 구축
      const maxYear = currentYear - 15;
      if (filter.maxBuildYear === maxYear) {
        onChange({ ...filter, minBuildYear: undefined, maxBuildYear: undefined });
      } else {
        onChange({ ...filter, minBuildYear: undefined, maxBuildYear: maxYear });
      }
      return;
    }
    if (preset === "over30") {
      // 30년 이상 재건축
      const maxYear = currentYear - 30;
      if (filter.maxBuildYear === maxYear) {
        onChange({ ...filter, minBuildYear: undefined, maxBuildYear: undefined });
      } else {
        onChange({ ...filter, minBuildYear: undefined, maxBuildYear: maxYear });
      }
      return;
    }
  };

  const hasActiveFilters = Boolean(
    filter.minHouseholds ||
    filter.minParkingPerHousehold ||
    filter.minBuildYear ||
    filter.maxBuildYear
  );

  const resetFilters = () => {
    onChange({
      minHouseholds: undefined,
      minTotalParking: undefined,
      minParkingPerHousehold: undefined,
      minBuildYear: undefined,
      maxBuildYear: undefined
    });
  };

  const chipBase = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border";
  const chipActive = "bg-primary text-white border-primary shadow-sm";
  const chipInactive = "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50";

  return (
    <div className={classNames("flex flex-wrap items-center gap-3 py-2", className)}>
      {/* 세대수 필터 */}
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
          <Users size={13} />
          세대수
        </span>
        <button
          type="button"
          onClick={() => handleHouseholdChange(300)}
          className={classNames(chipBase, filter.minHouseholds === 300 ? chipActive : chipInactive)}
        >
          300+
        </button>
        <button
          type="button"
          onClick={() => handleHouseholdChange(500)}
          className={classNames(chipBase, filter.minHouseholds === 500 ? chipActive : chipInactive)}
        >
          500+
        </button>
        <button
          type="button"
          onClick={() => handleHouseholdChange(1000)}
          className={classNames(chipBase, filter.minHouseholds === 1000 ? chipActive : chipInactive)}
        >
          1,000+ (대단지)
        </button>
      </div>

      <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* 세대당 주차 필터 */}
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
          <Car size={13} />
          세대당 주차
        </span>
        <button
          type="button"
          onClick={() => handleParkingChange(1.0)}
          className={classNames(chipBase, filter.minParkingPerHousehold === 1.0 ? chipActive : chipInactive)}
        >
          1.0대+
        </button>
        <button
          type="button"
          onClick={() => handleParkingChange(1.2)}
          className={classNames(chipBase, filter.minParkingPerHousehold === 1.2 ? chipActive : chipInactive)}
        >
          1.2대+ (여유)
        </button>
        <button
          type="button"
          onClick={() => handleParkingChange(1.5)}
          className={classNames(chipBase, filter.minParkingPerHousehold === 1.5 ? chipActive : chipInactive)}
        >
          1.5대+ (광폭)
        </button>
      </div>

      <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" />

      {/* 연차 / 준공연도 필터 */}
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
          <Calendar size={13} />
          연차
        </span>
        <button
          type="button"
          onClick={() => handleAgeChange("under5")}
          className={classNames(
            chipBase,
            filter.minBuildYear === currentYear - 4 ? chipActive : chipInactive
          )}
        >
          5년 이내 (신축)
        </button>
        <button
          type="button"
          onClick={() => handleAgeChange("under10")}
          className={classNames(
            chipBase,
            filter.minBuildYear === currentYear - 9 ? chipActive : chipInactive
          )}
        >
          10년 이내
        </button>
        <button
          type="button"
          onClick={() => handleAgeChange("over15")}
          className={classNames(
            chipBase,
            filter.maxBuildYear === currentYear - 15 ? chipActive : chipInactive
          )}
        >
          15년 이상
        </button>
        <button
          type="button"
          onClick={() => handleAgeChange("over30")}
          className={classNames(
            chipBase,
            filter.maxBuildYear === currentYear - 30 ? chipActive : chipInactive
          )}
        >
          30년+ (재건축)
        </button>
      </div>

      {/* 필터 초기화 버튼 */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          title="필터 초기화"
        >
          <RotateCcw size={12} />
          초기화
        </button>
      )}
    </div>
  );
}
