import React from "react";
import { createPortal } from "react-dom";
import { SectionCard } from "../../../components/SectionCard.js";
import { interpolateHeatColor } from "../../../components/charts/index.js";
import { useLocale } from "../../../lib/i18n.js";

interface PivotTableSectionProps {
  sizeCategories: string[];
  floorCategories: string[];
  activeRegions: string[];
  pivotData: {
    data: Record<string, any>;
    maxCount: number;
    minAvg: number;
    maxAvg: number;
  };
}

export function PivotTableSection({
  sizeCategories,
  floorCategories,
  activeRegions,
  pivotData,
}: PivotTableSectionProps) {
  const { t } = useLocale();
  const [expandedRegions, setExpandedRegions] = React.useState<Set<string>>(new Set());

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const [pivotTooltip, setPivotTooltip] = React.useState<{
    x: number;
    y: number;
    direction: "up" | "down";
    visible: boolean;
    cell: {
      avg: number;
      median: number;
      min?: number;
      max?: number;
      count: number;
      complexesSummary: string;
    };
    label: string;
  } | null>(null);

  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    cell: any,
    label: string
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipHeight = 150;
    const fitsDown = rect.bottom + tooltipHeight + 10 < window.innerHeight;
    setPivotTooltip({
      x: rect.left + rect.width / 2,
      y: fitsDown ? rect.bottom + 8 : rect.top - 8,
      direction: fitsDown ? "down" : "up",
      visible: true,
      cell,
      label,
    });
  };

  const handleCellMouseLeave = () => setPivotTooltip(null);
  const cells = pivotData.data || {};

  return (
    <>
      <SectionCard title={t.pivotTableTitle} subtitle={t.pivotTableLegend}>
        <div className="w-full overflow-x-auto scrollbar-none md:scrollbar-thin mt-4">
          <div
            className="grid min-w-[800px] p-1.5"
            style={{
              gridTemplateColumns: `auto repeat(${sizeCategories.length}, minmax(0, 1fr))`,
              gap: "4px",
            }}
          >
            {/* 좌상단 코너 */}
            <div className="flex items-end justify-start pl-3 pb-1.5">
              <span className="text-[10px] font-bold text-assistive">지역 / 평형</span>
            </div>
            {/* 헤더 컬럼들 */}
            {sizeCategories.map((cat) => (
              <div
                key={cat}
                className="text-center text-[9px] md:text-[10px] font-bold text-neutral pb-1.5 leading-tight flex items-end justify-center"
              >
                {cat.replace("평 이하", "이하").replace("평 초과", "초과")}
              </div>
            ))}

            {/* 데이터 행들 */}
            {activeRegions.map((regionKey) => {
              const isExpanded = expandedRegions.has(regionKey);
              return (
                <React.Fragment key={regionKey}>
                  <div
                    className="flex items-center justify-start pl-3 py-1 cursor-pointer hover:text-primary transition-colors group select-none"
                    onClick={() => toggleRegion(regionKey)}
                  >
                    <span
                      className={`inline-block mr-1.5 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    >
                      <svg
                        className="w-3 h-3 text-assistive group-hover:text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="3"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    <span className="text-[10px] md:text-[11px] font-extrabold text-strong whitespace-nowrap">
                      {regionKey}
                    </span>
                  </div>

                  {sizeCategories.map((sizeCat) => {
                    const cellKey = `${sizeCat}|${regionKey}`;
                    const cell = cells[cellKey];
                    const isEmpty = !cell || cell.count === 0;
                    const tooltipLabel = `${regionKey} (${sizeCat})`;

                    const bgColor = isEmpty
                      ? "rgba(100,116,139,0.08)"
                      : interpolateHeatColor(cell.avg, pivotData.minAvg, pivotData.maxAvg);
                    const textColor = isEmpty ? "var(--color-semantic-label-assistive)" : "#fff";

                    return (
                      <div
                        key={sizeCat}
                        className={`relative rounded-lg flex flex-col items-center justify-center py-2 px-1 transition-transform hover:scale-105 hover:z-10 ${
                          isEmpty ? "cursor-default" : "cursor-help select-none"
                        }`}
                        style={{
                          backgroundColor: bgColor,
                          minHeight: "56px",
                          border: isEmpty
                            ? "1px dashed rgba(100,116,139,0.2)"
                            : "1px solid transparent",
                        }}
                        onMouseEnter={
                          isEmpty ? undefined : (e) => handleCellMouseEnter(e, cell, tooltipLabel)
                        }
                        onMouseLeave={isEmpty ? undefined : handleCellMouseLeave}
                      >
                        {isEmpty ? (
                          <span className="text-[9px]" style={{ color: textColor }}>
                            -
                          </span>
                        ) : (
                          <>
                            <span
                              className="text-[11px] md:text-[12px] font-black leading-none"
                              style={{
                                color: textColor,
                                textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                              }}
                            >
                              {cell.avg}억
                            </span>
                            <span
                              className="text-[9px] mt-0.5 font-medium leading-none"
                              style={{ color: textColor, opacity: 0.8 }}
                            >
                              {cell.count}건
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* 층수 상세 아코디언 행들 */}
                  {isExpanded &&
                    [...floorCategories].reverse().map((floorCat) => (
                      <React.Fragment key={`${regionKey}|${floorCat}`}>
                        <div className="flex items-center justify-start pl-6 py-1 select-none">
                          <span className="text-[9px] text-assistive mr-1 font-bold">└</span>
                          <span className="text-[10px] font-bold text-neutral whitespace-nowrap">
                            {floorCat}
                          </span>
                        </div>

                        {sizeCategories.map((sizeCat) => {
                          const cellKey = `${sizeCat}|${floorCat}|${regionKey}`;
                          const cell = cells[cellKey];
                          const isEmpty = !cell || cell.count === 0;
                          const tooltipLabel = `${regionKey} (${floorCat}) - ${sizeCat}`;

                          const bgColor = isEmpty
                            ? "rgba(100,116,139,0.08)"
                            : interpolateHeatColor(cell.avg, pivotData.minAvg, pivotData.maxAvg);
                          const textColor = isEmpty
                            ? "var(--color-semantic-label-assistive)"
                            : "#fff";

                          return (
                            <div
                              key={sizeCat}
                              className={`relative rounded-lg flex flex-col items-center justify-center py-2 px-1 transition-transform hover:scale-105 hover:z-10 ${
                                isEmpty ? "cursor-default" : "cursor-help select-none"
                              }`}
                              style={{
                                backgroundColor: bgColor,
                                minHeight: "56px",
                                border: isEmpty
                                  ? "1px dashed rgba(100,116,139,0.2)"
                                  : "1px solid transparent",
                              }}
                              onMouseEnter={
                                isEmpty
                                  ? undefined
                                  : (e) => handleCellMouseEnter(e, cell, tooltipLabel)
                              }
                              onMouseLeave={isEmpty ? undefined : handleCellMouseLeave}
                            >
                              {isEmpty ? (
                                <span className="text-[9px]" style={{ color: textColor }}>
                                  -
                                </span>
                              ) : (
                                <>
                                  <span
                                    className="text-[11px] md:text-[12px] font-black leading-none"
                                    style={{
                                      color: textColor,
                                      textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                                    }}
                                  >
                                    {cell.avg}억
                                  </span>
                                  <span
                                    className="text-[9px] mt-0.5 font-medium leading-none"
                                    style={{ color: textColor, opacity: 0.8 }}
                                  >
                                    {cell.count}건
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* 피벗/히트맵 공용 툴팁 */}
      {pivotTooltip?.visible &&
        createPortal(
          <div
            className="fixed z-[9999] min-w-[180px] max-w-[240px] p-3.5 rounded-xl border border-normal bg-elevated shadow-xl text-left text-xs space-y-2 pointer-events-none opacity-100"
            style={{
              left: Math.max(110, Math.min(pivotTooltip.x, window.innerWidth - 110)),
              top: pivotTooltip.direction === "down" ? pivotTooltip.y : undefined,
              bottom:
                pivotTooltip.direction === "up"
                  ? window.innerHeight - pivotTooltip.y
                  : undefined,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-black text-strong border-b border-normal pb-1.5 mb-1.5 text-[13px] truncate text-center">
              {pivotTooltip.label}
            </p>
            <div className="space-y-1.5">
              <p className="text-neutral flex justify-between gap-4">
                <span>총 거래량:</span>
                <span className="font-bold text-strong">{pivotTooltip.cell.count} 건</span>
              </p>
              <p
                className="flex justify-between gap-4"
                style={{ color: "var(--color-chart-primary)" }}
              >
                <span>평균가:</span>
                <span className="font-bold">{pivotTooltip.cell.avg} 억</span>
              </p>
              <p
                className="flex justify-between gap-4"
                style={{ color: "var(--color-chart-median)" }}
              >
                <span>중위값:</span>
                <span className="font-bold">{pivotTooltip.cell.median} 억</span>
              </p>
              {pivotTooltip.cell.min !== undefined && pivotTooltip.cell.max !== undefined && (
                <div className="space-y-1.5">
                  <p
                    className="flex justify-between gap-4"
                    style={{ color: "var(--color-chart-min)" }}
                  >
                    <span>최저가:</span>
                    <span className="font-bold">{pivotTooltip.cell.min} 억</span>
                  </p>
                  <p
                    className="flex justify-between gap-4"
                    style={{ color: "var(--color-chart-max)" }}
                  >
                    <span>최고가:</span>
                    <span className="font-bold">{pivotTooltip.cell.max} 억</span>
                  </p>
                </div>
              )}
            </div>
            {pivotTooltip.cell.complexesSummary && (
              <div className="border-t border-normal pt-1.5 mt-1 text-[10px]">
                <span className="text-neutral block font-bold mb-0.5">주요 단지:</span>
                <span className="text-strong block truncate font-medium">
                  {pivotTooltip.cell.complexesSummary}
                </span>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
