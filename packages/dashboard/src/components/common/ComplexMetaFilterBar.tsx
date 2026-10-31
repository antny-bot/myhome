import React, { useRef, useState, useEffect, useCallback } from "react";
import { Users, Car, Calendar, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import type { ComplexMetaFilter } from "@myhome/shared";
import { classNames } from "../../lib/format";
import { useLocale } from "../../lib/i18n";

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
  const { locale } = useLocale();
  const isEn = locale === "en";

  const labels = isEn
    ? {
        households: "Households",
        parking: "Parking/Unit",
        age: "Age",
        largeComplex: "1,000+ (Large)",
        relaxParking: "1.2+ (Spacious)",
        wideParking: "1.5+ (Wide)",
        under5: "Under 5 yrs (New)",
        under10: "Under 10 yrs",
        over15: "15+ yrs",
        over30: "30+ yrs (Rebuild)",
        reset: "Reset",
        prevFilter: "Previous filters (scroll left)",
        nextFilter: "Next filters (scroll right)"
      }
    : {
        households: "세대수",
        parking: "세대당 주차",
        age: "연차",
        largeComplex: "1,000+ (대단지)",
        relaxParking: "1.2대+ (여유)",
        wideParking: "1.5대+ (광폭)",
        under5: "5년 이내 (신축)",
        under10: "10년 이내",
        over15: "15년 이상",
        over30: "30년+ (재건축)",
        reset: "초기화",
        prevFilter: "이전 필터 (좌로 이동)",
        nextFilter: "다음 필터 (우로 이동)"
      };

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

  // 스크롤 및 다이얼 상태 관리
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftPosRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 2;
    const canRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 2;
    setCanScrollLeft(canLeft);
    setCanScrollRight(canRight);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();

    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);

    // 마우스 휠 다이얼 회전 이벤트 바인딩
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) || e.deltaX !== 0) {
        const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
        if (el.scrollWidth > el.clientWidth) {
          const atLeft = el.scrollLeft <= 0 && delta < 0;
          const atRight = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 && delta > 0;
          if (!atLeft && !atRight) {
            e.preventDefault();
            el.scrollLeft += delta;
            checkScroll();
          }
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("resize", handleResize);
      el.removeEventListener("wheel", onWheel);
    };
  }, [checkScroll]);

  // 좌우 다이얼 버튼 이동
  const scrollDial = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = 180;
    el.scrollBy({
      left: direction === "left" ? -offset : offset,
      behavior: "smooth"
    });
  };

  // 마우스 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return;
    isDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftPosRef.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDownRef.current || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.4;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
      if (!isDragging) setIsDragging(true);
    }
    scrollRef.current.scrollLeft = scrollLeftPosRef.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isDownRef.current = false;
    setIsDragging(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  // 드래그 중 실수 클릭 방지 래퍼
  const onChipClick = (action: () => void) => {
    if (hasDraggedRef.current) return;
    action();
  };

  const chipBase =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border whitespace-nowrap shrink-0 select-none cursor-pointer";
  const chipActive = "bg-primary text-white border-primary shadow-sm font-semibold";
  const chipInactive =
    "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60";

  return (
    <div className={classNames("relative w-full group/filter-dial", className)}>
      {/* 좌측 다이얼 버튼 & 페이드 그라디언트 */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 bg-gradient-to-r from-white via-white/90 dark:from-slate-900 dark:via-slate-900/90 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={() => scrollDial("left")}
            className="pointer-events-auto p-1 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/50 transition-all active:scale-90 flex items-center justify-center -ml-0.5"
            title={labels.prevFilter}
            aria-label={labels.prevFilter}
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      )}

      {/* 우측 다이얼 버튼 & 페이드 그라디언트 */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-3 bg-gradient-to-l from-white via-white/90 dark:from-slate-900 dark:via-slate-900/90 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={() => scrollDial("right")}
            className="pointer-events-auto p-1 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary hover:border-primary/50 transition-all active:scale-90 flex items-center justify-center -mr-0.5"
            title={labels.nextFilter}
            aria-label={labels.nextFilter}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* 가로 스크롤 다이얼 컨테이너 (한 줄로 표시) */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={classNames(
          "flex items-center gap-2.5 overflow-x-auto scrollbar-none py-1.5 px-0.5 select-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        {/* 세대수 필터 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap shrink-0">
            <Users size={13} />
            {labels.households}
          </span>
          <button
            type="button"
            onClick={() => onChipClick(() => handleHouseholdChange(300))}
            className={classNames(chipBase, filter.minHouseholds === 300 ? chipActive : chipInactive)}
          >
            300+
          </button>
          <button
            type="button"
            onClick={() => onChipClick(() => handleHouseholdChange(500))}
            className={classNames(chipBase, filter.minHouseholds === 500 ? chipActive : chipInactive)}
          >
            500+
          </button>
          <button
            type="button"
            onClick={() => onChipClick(() => handleHouseholdChange(1000))}
            className={classNames(chipBase, filter.minHouseholds === 1000 ? chipActive : chipInactive)}
          >
            {labels.largeComplex}
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

        {/* 세대당 주차 필터 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap shrink-0">
            <Car size={13} />
            {labels.parking}
          </span>
          <button
            type="button"
            onClick={() => onChipClick(() => handleParkingChange(1.0))}
            className={classNames(chipBase, filter.minParkingPerHousehold === 1.0 ? chipActive : chipInactive)}
          >
            1.0대+
          </button>
          <button
            type="button"
            onClick={() => onChipClick(() => handleParkingChange(1.2))}
            className={classNames(chipBase, filter.minParkingPerHousehold === 1.2 ? chipActive : chipInactive)}
          >
            {labels.relaxParking}
          </button>
          <button
            type="button"
            onClick={() => onChipClick(() => handleParkingChange(1.5))}
            className={classNames(chipBase, filter.minParkingPerHousehold === 1.5 ? chipActive : chipInactive)}
          >
            {labels.wideParking}
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

        {/* 연차 / 준공연도 필터 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap shrink-0">
            <Calendar size={13} />
            {labels.age}
          </span>
          <button
            type="button"
            onClick={() => onChipClick(() => handleAgeChange("under5"))}
            className={classNames(
              chipBase,
              filter.minBuildYear === currentYear - 4 ? chipActive : chipInactive
            )}
          >
            {labels.under5}
          </button>
          <button
            type="button"
            onClick={() => onChipClick(() => handleAgeChange("under10"))}
            className={classNames(
              chipBase,
              filter.minBuildYear === currentYear - 9 ? chipActive : chipInactive
            )}
          >
            {labels.under10}
          </button>
          <button
            type="button"
            onClick={() => onChipClick(() => handleAgeChange("over15"))}
            className={classNames(
              chipBase,
              filter.maxBuildYear === currentYear - 15 ? chipActive : chipInactive
            )}
          >
            {labels.over15}
          </button>
          <button
            type="button"
            onClick={() => onChipClick(() => handleAgeChange("over30"))}
            className={classNames(
              chipBase,
              filter.maxBuildYear === currentYear - 30 ? chipActive : chipInactive
            )}
          >
            {labels.over30}
          </button>
        </div>

        {/* 필터 초기화 버튼 */}
        {hasActiveFilters && (
          <>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
            <button
              type="button"
              onClick={() => onChipClick(resetFilters)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors whitespace-nowrap shrink-0 border border-rose-200 dark:border-rose-900/40 select-none cursor-pointer"
              title={labels.reset}
            >
              <RotateCcw size={12} />
              {labels.reset}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
