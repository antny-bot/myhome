import React from "react";
import { Calendar } from "lucide-react";
import { SectionCard } from "../../../components/SectionCard.js";
import { useLocale } from "../../../lib/i18n.js";

interface ComplexRecentTradesTableProps {
  groupedTx: Array<{ dealDate: string; items: any[] }>;
  recentTxStats: {
    maxPrice: number;
    minPrice: number;
    avgPrice: number;
    totalCount: number;
  } | null;
  areaUnit: "pyeong" | "m2";
}

export function ComplexRecentTradesTable({
  groupedTx,
  recentTxStats,
  areaUnit,
}: ComplexRecentTradesTableProps) {
  const { t } = useLocale();

  if (groupedTx.length === 0) return null;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          <span>최근 실거래 내역 ({recentTxStats?.totalCount || 0}건)</span>
        </span>
      }
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-normal text-neutral font-semibold">
              <th className="py-2.5 px-3">계약일</th>
              <th className="py-2.5 px-3">면적</th>
              <th className="py-2.5 px-3">층</th>
              <th className="py-2.5 px-3">거래금액</th>
              <th className="py-2.5 px-3">동</th>
              <th className="py-2.5 px-3">거래구분</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-normal/50 text-strong font-medium">
            {groupedTx.map((group) =>
              group.items.map((tx: any, idx: number) => {
                const pyeong = Math.round((tx.areaM2 || 0) / 3.305785);
                const isCancel = !!tx.cancelDate;
                const isDirect = tx.dealType === "직거래";

                return (
                  <tr
                    key={`${tx.dealDate}-${idx}`}
                    className={`hover:bg-alternative/50 transition-colors ${
                      isCancel ? "opacity-40 line-through" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap text-neutral font-mono text-[11px]">
                      {tx.dealDate}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {areaUnit === "pyeong"
                        ? `${pyeong}평 (${Math.round(tx.areaM2)}㎡)`
                        : `${tx.areaM2}㎡`}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{tx.floor}층</td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-primary">
                      {tx.priceEok}억
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-neutral">
                      {tx.aptDong || "-"}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isCancel ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                          해제 ({tx.cancelDate})
                        </span>
                      ) : isDirect ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          직거래
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-alternative text-neutral border border-normal">
                          중개
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
