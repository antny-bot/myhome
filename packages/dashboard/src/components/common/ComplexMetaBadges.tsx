import React from "react";
import { Users, Car, Calendar, ShieldCheck } from "lucide-react";
import { classNames } from "../../lib/format";

export interface ComplexMetaBadgesProps {
  totalHouseholds?: number | null;
  totalParking?: number | null;
  parkingPerHousehold?: number | null;
  useApprovalDate?: string | null;
  className?: string;
  size?: "sm" | "md";
}

/**
 * 건축물대장 4대 메타정보 (세대수, 주차대수, 세대당 주차, 준공연차) 시각 뱃지 바
 */
export function ComplexMetaBadges({
  totalHouseholds,
  totalParking,
  parkingPerHousehold,
  useApprovalDate,
  className = "",
  size = "md"
}: ComplexMetaBadgesProps) {
  // 준공 연도 및 연차 계산
  const buildYear = useApprovalDate ? parseInt(useApprovalDate.substring(0, 4), 10) : null;
  const currentYear = new Date().getFullYear();
  const buildingAge = buildYear ? currentYear - buildYear + 1 : null;

  // 연차 배지 스타일 (5년 이내: 신축, 30년 이상: 재건축 연한)
  const isNew = buildingAge !== null && buildingAge <= 5;
  const isOld = buildingAge !== null && buildingAge >= 30;

  // 세대당 주차대수 여유도 판별 (1.5대+: 여유, 1.1~1.5대: 양호, 0.9~1.1: 보통, 0.9 미만: 혼잡)
  const getParkingStatus = (val?: number | null) => {
    if (val === null || val === undefined || isNaN(val) || val <= 0) return null;
    if (val >= 1.5) return { label: "여유", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    if (val >= 1.1) return { label: "양호", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
    if (val >= 0.9) return { label: "보통", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    return { label: "혼잡", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
  };

  const parkingStatus = getParkingStatus(parkingPerHousehold);
  const isSmall = size === "sm";

  const badgeBaseClass = classNames(
    "inline-flex items-center gap-1 rounded-md border font-medium",
    isSmall ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"
  );

  return (
    <div className={classNames("flex flex-wrap items-center gap-1.5", className)}>
      {/* 1. 세대수 */}
      {totalHouseholds !== null && totalHouseholds !== undefined && totalHouseholds > 0 && (
        <span
          className={classNames(badgeBaseClass, "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700")}
          title="총 세대수"
        >
          <Users size={isSmall ? 11 : 13} className="text-slate-400" />
          <span>{totalHouseholds.toLocaleString()}세대</span>
          {totalHouseholds >= 1000 && (
            <span className="ml-0.5 rounded bg-blue-500/10 px-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              대단지
            </span>
          )}
        </span>
      )}

      {/* 2. 세대당 주차대수 */}
      {parkingPerHousehold !== null && parkingPerHousehold !== undefined && parkingPerHousehold > 0 && parkingStatus && (
        <span
          className={classNames(badgeBaseClass, parkingStatus.color)}
          title={`총 ${totalParking?.toLocaleString() || "-"}대 주차`}
        >
          <Car size={isSmall ? 11 : 13} />
          <span>세대당 {parkingPerHousehold.toFixed(2)}대</span>
          <span className="font-bold opacity-80">({parkingStatus.label})</span>
        </span>
      )}

      {/* 3. 총 주차대수 (필요시 보조 표시) */}
      {totalParking !== null && totalParking !== undefined && totalParking > 0 && !parkingPerHousehold && (
        <span className={classNames(badgeBaseClass, "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700")}>
          <Car size={isSmall ? 11 : 13} className="text-slate-400" />
          <span>총 {totalParking.toLocaleString()}대</span>
        </span>
      )}

      {/* 4. 준공연도 / 연차 */}
      {buildYear && buildingAge && (
        <span
          className={classNames(
            badgeBaseClass,
            isNew
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : isOld
              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
          )}
          title={`사용승인일: ${useApprovalDate}`}
        >
          <Calendar size={isSmall ? 11 : 13} />
          <span>
            {buildYear}년 ({buildingAge}년차)
          </span>
          {isNew && <span className="font-bold">신축</span>}
          {isOld && <span className="font-bold">구축</span>}
        </span>
      )}
    </div>
  );
}
