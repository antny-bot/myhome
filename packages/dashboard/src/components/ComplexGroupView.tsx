import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { classNames } from "../lib/format";
import type { TransactionRecord } from "../types";

type ComplexGroup = {
  key: string;
  apartmentName: string;
  areaM2?: number;
  items: TransactionRecord[];
  count: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  changeEok: number;
  changePct?: number;
};

function buildGroups(records: TransactionRecord[]): ComplexGroup[] {
  const map = new Map<string, TransactionRecord[]>();
  for (const item of records) {
    const areaKey = item.areaM2 !== undefined ? item.areaM2.toFixed(1) : "?";
    const key = `${item.apartmentName}__${areaKey}`;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }

  const groups: ComplexGroup[] = [];
  for (const items of map.values()) {
    const sorted = [...items].sort((a, b) => a.dealDate.localeCompare(b.dealDate));
    const prices = sorted.map((item) => item.priceEok);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const changeEok = latest.priceEok - first.priceEok;

    groups.push({
      key: `${first.apartmentName}__${first.areaM2 ?? "?"}`,
      apartmentName: first.apartmentName,
      areaM2: first.areaM2,
      items: sorted,
      count: sorted.length,
      minPrice,
      maxPrice,
      avgPrice,
      changeEok,
      changePct: first.priceEok !== 0 ? (changeEok / first.priceEok) * 100 : undefined
    });
  }

  return groups.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.items[b.items.length - 1].dealDate.localeCompare(a.items[a.items.length - 1].dealDate);
  });
}

function Sparkline({ prices }: { prices: number[] }) {
  if (prices.length < 2) {
    return <div className="flex h-12 w-full max-w-[260px] items-center text-xs text-neutral">거래 1건 — 추이 없음</div>;
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

export function ComplexGroupView({ records }: { records: TransactionRecord[] }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const groups = useMemo(() => buildGroups(records), [records]);

  if (groups.length === 0) {
    return <p className="text-center py-10 text-sm text-neutral">표시할 거래가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const TrendIcon = group.changeEok > 0 ? TrendingUp : group.changeEok < 0 ? TrendingDown : Minus;
        const trendTone = group.changeEok > 0 ? "text-emerald-500" : group.changeEok < 0 ? "text-red-500" : "text-neutral";
        const latest = group.items[group.items.length - 1];

        return (
          <div key={group.key} className="rounded-xl border border-normal/50 bg-normal/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-strong truncate">{group.apartmentName}</p>
                <p className="mt-0.5 text-xs text-neutral">
                  {group.areaM2 !== undefined ? `${group.areaM2}㎡` : "평수 미상"} · 거래 {group.count}건 · {group.items[0].dealDate} ~ {latest.dealDate}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-primary">최근 {latest.priceEok.toFixed(2)}억</p>
                <p className={classNames("flex items-center justify-end gap-1 text-xs font-bold", trendTone)}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {group.changeEok === 0
                    ? "변동 없음"
                    : `${group.changeEok > 0 ? "+" : ""}${group.changeEok.toFixed(2)}억${
                        group.changePct !== undefined ? ` (${group.changePct > 0 ? "+" : ""}${group.changePct.toFixed(1)}%)` : ""
                      }`}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-6">
              <Sparkline prices={group.items.map((item) => item.priceEok)} />
              <div className="flex gap-4 text-xs">
                <div>
                  <p className="text-assistive">최저</p>
                  <p className="font-bold text-strong">{group.minPrice.toFixed(2)}억</p>
                </div>
                <div>
                  <p className="text-assistive">평균</p>
                  <p className="font-bold text-strong">{group.avgPrice.toFixed(2)}억</p>
                </div>
                <div>
                  <p className="text-assistive">최고</p>
                  <p className="font-bold text-strong">{group.maxPrice.toFixed(2)}억</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExpandedKey(expandedKey === group.key ? null : group.key)}
              className="mt-3 text-[11px] font-bold text-primary hover:underline"
            >
              {expandedKey === group.key ? "거래 내역 닫기" : `거래 내역 ${group.count}건 보기`}
            </button>

            {expandedKey === group.key && (
              <div className="mt-2 space-y-1.5">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border border-normal bg-elevated px-3 py-1.5 text-xs">
                    <span className="text-neutral">
                      {item.dealDate}
                      {item.floor ? ` · ${item.floor}층` : ""}
                    </span>
                    <span className="font-bold text-strong">{item.priceEok.toFixed(2)}억</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
