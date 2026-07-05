import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { classNames } from "../lib/format";
import type { TransactionRecord } from "../types";

type AreaGroup = {
  areaM2: number | undefined;
  areaLabel: string;
  items: TransactionRecord[];
  count: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  changeEok: number;
  changePct?: number;
};

type ComplexGroup = {
  apartmentName: string;
  areas: AreaGroup[];
  totalCount: number;
};

const copy = {
  ko: {
    noTrend: "거래 1건 — 추이 없음",
    noData: "표시할 거래가 없습니다.",
    unknownArea: "평수 미상",
    unitCount: "건",
    totalCount: "총 {count}건 거래",
    areasCount: "평수 {count}개",
    noChange: "변동 없음",
    unitDeal: "억",
    min: "최저",
    avg: "평균",
    max: "최고",
    closeHistory: "거래 내역 닫기",
    viewHistory: "거래 내역 {count}건 보기",
    recent: "최근"
  },
  en: {
    noTrend: "1 transaction — no trend",
    noData: "No transactions to display.",
    unknownArea: "Unknown Area",
    unitCount: "deals",
    totalCount: "Total {count} deals",
    areasCount: "{count} sizes",
    noChange: "No change",
    unitDeal: "Eok",
    min: "Min",
    avg: "Avg",
    max: "Max",
    closeHistory: "Close History",
    viewHistory: "View {count} deals",
    recent: "Recent"
  }
};

function buildGroups(records: TransactionRecord[]): ComplexGroup[] {
  const complexMap = new Map<string, TransactionRecord[]>();
  for (const item of records) {
    const list = complexMap.get(item.apartmentName);
    if (list) list.push(item);
    else complexMap.set(item.apartmentName, [item]);
  }

  const groups: ComplexGroup[] = [];
  for (const [apartmentName, allItems] of complexMap.entries()) {
    const areaMap = new Map<string, TransactionRecord[]>();
    for (const item of allItems) {
      const areaKey = item.areaM2 !== undefined ? item.areaM2.toFixed(2) : "unknown";
      const list = areaMap.get(areaKey);
      if (list) list.push(item);
      else areaMap.set(areaKey, [item]);
    }

    const areas: AreaGroup[] = [];
    for (const items of areaMap.values()) {
      if (items.length === 0) continue;
      const sorted = [...items].sort((a, b) => a.dealDate.localeCompare(b.dealDate));
      const prices = sorted.map((item) => item.priceEok);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const changeEok = latest.priceEok - first.priceEok;
      
      const areaM2 = items[0].areaM2;
      const areaLabel = areaM2 !== undefined ? `${areaM2.toFixed(2)}㎡` : "unknown";

      areas.push({
        areaM2,
        areaLabel,
        items: sorted,
        count: sorted.length,
        minPrice,
        maxPrice,
        avgPrice,
        changeEok,
        changePct: first.priceEok !== 0 ? (changeEok / first.priceEok) * 100 : undefined
      });
    }

    areas.sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0));

    groups.push({
      apartmentName,
      areas,
      totalCount: allItems.length
    });
  }

  return groups.sort((a, b) => b.totalCount - a.totalCount);
}

function Sparkline({ prices }: { prices: number[] }) {
  if (prices.length < 2) {
    return <div className="flex h-12 w-full max-w-[260px] items-center text-xs text-neutral">{copy.ko.noTrend}</div>;
  }

  const width = 260;
  const height = 48;
  const padding = 5;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = prices.map((price, idx) => {
    const x = padding + (idx / (prices.length - 1)) * (width - padding * 2);
    const y = height - padding - ((price - min) / range) * (height - padding * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], idx) => `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const rising = prices[prices.length - 1] >= prices[0];
  const stroke = rising ? "#10b981" : "#ef4444";

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[260px] shrink-0 overflow-visible"
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map(([x, y], idx) => (
        <circle key={idx} cx={x} cy={y} r={2.5} fill={stroke} />
      ))}
    </svg>
  );
}

function ComplexGroupCard({
  group,
  locale = "ko",
  isSelected,
  onSelect
}: {
  group: ComplexGroup;
  locale?: "ko" | "en";
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const t = copy[locale];
  const activeArea = group.areas[activeIdx] || group.areas[0];
  if (!activeArea) return null;

  const TrendIcon = activeArea.changeEok > 0 ? TrendingUp : activeArea.changeEok < 0 ? TrendingDown : Minus;
  const trendTone = activeArea.changeEok > 0 ? "text-emerald-500" : activeArea.changeEok < 0 ? "text-red-500" : "text-neutral";
  const latest = activeArea.items[activeArea.items.length - 1];

  const areaLabelDisp = activeArea.areaM2 !== undefined ? activeArea.areaLabel : t.unknownArea;

  return (
    // biome-ignore lint/clickEventsHaveKeyEvents: Interactive list card
    // biome-ignore lint/nonInteractiveElementInteractions: UI Selection
    <div
      onClick={onSelect}
      className={classNames(
        "rounded-xl border transition-all duration-200 p-4 space-y-3 cursor-pointer",
        isSelected
          ? "border-primary bg-primary/5 shadow-md shadow-blue-500/5 ring-1 ring-primary/30"
          : "border-normal/50 bg-normal/30 hover:border-normal hover:bg-normal/50"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-strong truncate text-[15px]">{group.apartmentName}</p>
          <p className="mt-0.5 text-xs text-neutral">
            {t.totalCount.replace("{count}", String(group.totalCount))} · {t.areasCount.replace("{count}", String(group.areas.length))}
          </p>
        </div>
      </div>

      {group.areas.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-normal/30 pb-2" onClick={(e) => e.stopPropagation()}>
          {group.areas.map((area, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                setExpanded(false);
              }}
              className={classNames(
                "rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
                idx === activeIdx
                  ? "bg-primary text-white shadow-sm"
                  : "bg-alternative text-neutral hover:text-strong"
              )}
            >
              {area.areaM2 !== undefined ? area.areaLabel : t.unknownArea} ({area.count}{t.unitCount})
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-xs text-neutral">
            {areaLabelDisp} · {activeArea.items[0].dealDate} ~ {latest.dealDate}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-primary">{t.recent} {latest.priceEok.toFixed(2)}{t.unitDeal}</p>
          <p className={classNames("flex items-center justify-end gap-1 text-xs font-bold", trendTone)}>
            <TrendIcon className="h-3.5 w-3.5" />
            {activeArea.changeEok === 0
              ? t.noChange
              : `${activeArea.changeEok > 0 ? "+" : ""}${activeArea.changeEok.toFixed(2)}${t.unitDeal}${
                  activeArea.changePct !== undefined ? ` (${activeArea.changePct > 0 ? "+" : ""}${activeArea.changePct.toFixed(1)}%)` : ""
                }`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <Sparkline prices={activeArea.items.map((item) => item.priceEok)} />
        <div className="flex gap-4 text-xs">
          <div>
            <p className="text-assistive">{t.min}</p>
            <p className="font-bold text-strong">{activeArea.minPrice.toFixed(2)}{t.unitDeal}</p>
          </div>
          <div>
            <p className="text-assistive">{t.avg}</p>
            <p className="font-bold text-strong">{activeArea.avgPrice.toFixed(2)}{t.unitDeal}</p>
          </div>
          <div>
            <p className="text-assistive">{t.max}</p>
            <p className="font-bold text-strong">{activeArea.maxPrice.toFixed(2)}{t.unitDeal}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="text-[11px] font-bold text-primary hover:underline block"
      >
        {expanded ? t.closeHistory : t.viewHistory.replace("{count}", String(activeArea.count))}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150" onClick={(e) => e.stopPropagation()}>
          {activeArea.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg border border-normal bg-elevated px-3 py-1.5 text-xs">
              <span className="text-neutral">
                {item.dealDate}
                {item.floor ? ` · ${item.floor}층` : ""}
              </span>
              <span className="font-bold text-strong">{item.priceEok.toFixed(2)}{t.unitDeal}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComplexGroupView({
  records,
  locale = "ko",
  selectedApartment = null,
  onSelectApartment
}: {
  records: TransactionRecord[];
  locale?: "ko" | "en";
  selectedApartment?: string | null;
  onSelectApartment?: (aptName: string) => void;
}) {
  const groups = useMemo(() => buildGroups(records), [records]);

  if (groups.length === 0) {
    return <p className="text-center py-10 text-sm text-neutral">{copy[locale].noData}</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <ComplexGroupCard
          key={group.apartmentName}
          group={group}
          locale={locale}
          isSelected={selectedApartment === group.apartmentName}
          onSelect={() => onSelectApartment?.(group.apartmentName)}
        />
      ))}
    </div>
  );
}
