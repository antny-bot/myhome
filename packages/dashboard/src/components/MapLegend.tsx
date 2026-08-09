import React from "react";
import { MAP_PRICE_TIERS } from "../lib/mapTheme";

interface MapLegendProps {
  className?: string;
  title?: string;
  showSelected?: boolean;
}

export function MapLegend({
  className = "",
  title = "범례 (가격대)",
  showSelected = false,
}: MapLegendProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-normal bg-elevated/95 backdrop-blur-md px-3 py-2 text-[10px] font-bold text-neutral shadow-md max-w-[calc(100%-24px)] md:max-w-md select-none ${className}`}
    >
      <span className="text-[9px] font-extrabold uppercase text-strong border-r border-normal pr-2 flex items-center shrink-0">
        {title}
      </span>
      {MAP_PRICE_TIERS.map((tier) => (
        <div key={tier.label} className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${tier.dotClass} shadow-sm`} />
          <span className="text-strong">{tier.label}</span>
        </div>
      ))}
      {showSelected && (
        <div className="flex items-center gap-1.5 shrink-0 border-l border-normal pl-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-300 shadow-sm" />
          <span className="text-amber-600 dark:text-amber-400 font-extrabold">선택</span>
        </div>
      )}
    </div>
  );
}
