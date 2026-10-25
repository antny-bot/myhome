import React from "react";
import { MapPin } from "lucide-react";

export interface RegionSummaryItem {
  lawdCode: string;
  displayName: string;
  transactionCount: number;
  minDealDate: string | null;
  maxDealDate: string | null;
}

export interface RegionChipsProps {
  regions: RegionSummaryItem[];
  selectedLawdCode: string;
  onSelectRegion: (lawdCode: string) => void;
  dragRef: React.RefObject<HTMLDivElement | null>;
  dragEvents: any;
  isDragging: boolean;
  hasDraggedRef: React.RefObject<boolean>;
}

export function RegionChips({
  regions,
  selectedLawdCode,
  onSelectRegion,
  dragRef,
  dragEvents,
  isDragging,
  hasDraggedRef
}: RegionChipsProps) {
  return (
    <div
      ref={dragRef}
      {...dragEvents}
      className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none select-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {regions.map((reg) => {
        const isSelected = reg.lawdCode === selectedLawdCode;
        return (
          <button
            key={reg.lawdCode}
            onClick={() => {
              if (hasDraggedRef.current) return;
              onSelectRegion(reg.lawdCode);
            }}
            className={`flex items-center gap-1.5 sm:gap-2 shrink-0 px-2.5 py-1 sm:px-3 sm:py-2 rounded-xl text-xs font-medium transition-all duration-200 border select-none ${
              isSelected
                ? "bg-primary border-primary text-white font-bold shadow-md shadow-primary/20 scale-[1.02]"
                : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300"
            }`}
          >
            <MapPin size={12} className={isSelected ? "text-amber-300" : "text-slate-400"} />
            <span>{reg.displayName}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                isSelected
                  ? "bg-white/20 text-white font-black"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {reg.transactionCount.toLocaleString()}건
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default RegionChips;
