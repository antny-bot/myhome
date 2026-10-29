import React from "react";
import { Train } from "lucide-react";

interface InfraBuildingSummaryProps {
  detailData: any;
  getTravelTime: (distanceM: number) => { walkMin: number; carMin: number };
}

export function InfraBuildingSummary({ detailData, getTravelTime }: InfraBuildingSummaryProps) {
  return (
    <div className="flex flex-col justify-between gap-4 h-[420px] overflow-y-auto pr-1 scrollbar-thin">
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-strong flex items-center gap-1.5">
          <Train size={15} className="text-primary" />
          <span>인근 역세권 (반경 1km 이내)</span>
        </h3>

        {detailData.subways && detailData.subways.length > 0 ? (
          <div className="space-y-2">
            {detailData.subways.map((sub: any, idx: number) => {
              const { walkMin, carMin } = getTravelTime(sub.distanceM);
              return (
                <div
                  key={idx}
                  className="p-3 bg-alternative border border-normal rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-strong">{sub.name}</span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {sub.distanceM}m
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-neutral font-medium">
                    <span>도보 약 {walkMin}분</span>
                    <span>·</span>
                    <span>차량 약 {carMin}분</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-assistive bg-normal/10 border border-normal border-dashed rounded-xl">
            1km 이내에 철도/지하철역이 없습니다.
          </div>
        )}
      </div>

      {/* 건축물대장 요약 */}
      {detailData.complexInfo &&
        (detailData.complexInfo.totalHouseholds ||
          detailData.complexInfo.parkingPerHousehold ||
          detailData.complexInfo.useApprovalDate) && (
          <div className="pt-3 border-t border-normal space-y-1.5 text-xs">
            <span className="font-bold text-primary text-[11px] block">
              건축HUB 대장 정보
            </span>
            {detailData.complexInfo.totalHouseholds && (
              <div className="flex justify-between text-neutral">
                <span>총 세대수</span>
                <span className="font-bold text-strong">
                  {detailData.complexInfo.totalHouseholds.toLocaleString()}세대
                </span>
              </div>
            )}
            {detailData.complexInfo.parkingPerHousehold && (
              <div className="flex justify-between text-neutral">
                <span>주차 대수</span>
                <span className="font-bold text-strong">
                  세대당 {detailData.complexInfo.parkingPerHousehold}대
                </span>
              </div>
            )}
            {detailData.complexInfo.useApprovalDate && (
              <div className="flex justify-between text-neutral">
                <span>사용승인일자</span>
                <span className="font-bold text-strong">
                  {detailData.complexInfo.useApprovalDate}
                </span>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
