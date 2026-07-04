import { ArrowDownRight, ArrowUpRight, ChevronRight, Coins, Receipt, RefreshCw, Ruler, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { searchTransactions } from "../api";
import { ConstraintBanner } from "../components/ConstraintBanner";
import { RegionSearchInput } from "../components/RegionSearchInput";
import { SectionCard } from "../components/SectionCard";
import { classNames } from "../lib/format";
import type { RegionSearchResult, TransactionRecord } from "../types";
import { PYEONG_M2, getDefaultMonth } from "../lib/constants";
import { copy } from "../locales/ko";

const defaultMonth = getDefaultMonth();

type Locale = keyof typeof copy;
type SortMode = "date" | "price-d" | "price-a" | "area-d" | "ppy-d";

const locale: Locale = "ko";
const t = copy[locale];

type EnrichedRecord = TransactionRecord & {
  pyeong: number;
  ppy: number;
  deltaEok?: number;
};

const sortOptions: Array<{ value: SortMode; label: string }> = [
  { value: "date", label: t.latestSort },
  { value: "price-d", label: t.highPriceSort },
  { value: "price-a", label: t.lowPriceSort },
  { value: "area-d", label: t.largeAreaSort },
  { value: "ppy-d", label: t.highPpySort }
];

function enrichRecords(records: TransactionRecord[]): EnrichedRecord[] {
  const groups = new Map<string, TransactionRecord[]>();
  for (const item of records) {
    const key = `${item.apartmentName}__${item.areaM2 ?? "?"}`;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const deltaByRef = new Map<TransactionRecord, number | undefined>();
  for (const items of groups.values()) {
    const sorted = [...items].sort((a, b) => a.dealDate.localeCompare(b.dealDate));
    sorted.forEach((item, idx) => {
      deltaByRef.set(item, idx === 0 ? undefined : item.priceEok - sorted[idx - 1].priceEok);
    });
  }

  return records.map((item) => {
    const pyeong = item.areaM2 !== undefined ? item.areaM2 / PYEONG_M2 : 0;
    const ppy = pyeong > 0 ? Math.round((item.priceEok * 10000) / pyeong) : 0;
    return { ...item, pyeong, ppy, deltaEok: deltaByRef.get(item) };
  });
}

function sortValue(item: EnrichedRecord, mode: SortMode): number | string {
  switch (mode) {
    case "date":
      return item.dealDate;
    case "price-d":
    case "price-a":
      return item.priceEok;
    case "area-d":
      return item.areaM2 ?? 0;
    case "ppy-d":
      return item.ppy;
  }
}

function sortRecords(items: EnrichedRecord[], mode: SortMode) {
  const direction = mode === "price-a" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = sortValue(a, mode);
    const bv = sortValue(b, mode);
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
    return String(av).localeCompare(String(bv)) * direction;
  });
}

function formatArea(item: EnrichedRecord) {
  if (item.areaM2 === undefined) return "-";
  if (item.pyeong <= 0) return `${item.areaM2}㎡`;
  return `${item.areaM2}㎡ · ${item.pyeong.toFixed(1)}평`;
}

function DeltaTag({ value }: { value?: number }) {
  if (value === undefined) return <span className="text-assistive">-</span>;
  if (value === 0) return <span className="text-neutral">{t.noChange}</span>;
  const up = value > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={classNames("inline-flex items-center gap-1 font-bold text-[13px]", up ? "text-red-500" : "text-blue-500")}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toFixed(2)}
      {t.unitDeal}
    </span>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-alternative px-4 py-3.5">
      <p className="text-[12px] font-semibold text-neutral">{label}</p>
      <p className="mt-2 text-[24px] font-black tracking-tight text-strong">{value}</p>
      <p className="mt-1 text-[11px] text-assistive">{hint}</p>
    </div>
  );
}

export function ExploreV2Page() {
  const [regionName, setRegionName] = useState("");
  const [lawdCode, setLawdCode] = useState("");
  const [isRange, setIsRange] = useState(true);
  const [dealMonth, setDealMonth] = useState(defaultMonth);
  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [endMonth, setEndMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TransactionRecord[]>([]);
  const [searchedRegion, setSearchedRegion] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [areaMin, setAreaMin] = useState("");
  const [areaMax, setAreaMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("date");

  const enriched = useMemo(() => enrichRecords(results), [results]);

  const filtered = useMemo(() => {
    const name = nameFilter.trim();
    const minArea = areaMin ? Number(areaMin) : undefined;
    const maxArea = areaMax ? Number(areaMax) : undefined;
    const minPrice = priceMin ? Number(priceMin) : undefined;
    const maxPrice = priceMax ? Number(priceMax) : undefined;

    return enriched.filter((item) => {
      if (name && !item.apartmentName.includes(name)) return false;
      if (minArea !== undefined && (item.areaM2 === undefined || item.areaM2 < minArea)) return false;
      if (maxArea !== undefined && (item.areaM2 === undefined || item.areaM2 > maxArea)) return false;
      if (minPrice !== undefined && item.priceEok < minPrice) return false;
      if (maxPrice !== undefined && item.priceEok > maxPrice) return false;
      return true;
    });
  }, [enriched, nameFilter, areaMin, areaMax, priceMin, priceMax]);

  const sorted = useMemo(() => sortRecords(filtered, sortMode), [filtered, sortMode]);

  const kpis = useMemo(() => {
    const prices = filtered.map((item) => item.priceEok);
    const ppys = filtered.filter((item) => item.ppy > 0).map((item) => item.ppy);
    return {
      count: filtered.length,
      avgPrice: prices.length > 0 ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0,
      avgPpy: ppys.length > 0 ? Math.round(ppys.reduce((sum, value) => sum + value, 0) / ppys.length) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0
    };
  }, [filtered]);

  const hasActiveFilters = Boolean(nameFilter || areaMin || areaMax || priceMin || priceMax);

  function selectRegion(item: RegionSearchResult) {
    setRegionName(item.displayName);
    setLawdCode(item.lawdCode);
    setError("");
  }

  function resetFilters() {
    setNameFilter("");
    setAreaMin("");
    setAreaMax("");
    setPriceMin("");
    setPriceMax("");
  }

  async function handleSearch() {
    if (!lawdCode) {
      setError(t.selectRegionFirst);
      return;
    }

    const monthPattern = /^\d{6}$/;
    if (isRange ? (!monthPattern.test(startMonth) || !monthPattern.test(endMonth)) : !monthPattern.test(dealMonth)) {
      setError(t.monthFormatError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const records = isRange
        ? await searchTransactions(lawdCode, { startMonth, endMonth })
        : await searchTransactions(lawdCode, { dealMonth });
      setResults(records);
      setSearchedRegion(regionName);
      resetFilters();
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : t.searchFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs text-assistive">
            <span>{t.breadcrumb}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{t.subBreadcrumb}</span>
          </p>
          <h2 className="text-2xl font-black tracking-tight text-strong">{t.title}</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-neutral">{t.subtitle}</p>
        </div>
      </header>

      <SectionCard className="overflow-hidden">
        <div className="space-y-4">
          <ConstraintBanner compact />

          <div className="rounded-2xl border border-normal bg-normal p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold tracking-wide text-neutral">{t.tradeType}</span>
                <div className="inline-flex gap-1 rounded-xl bg-alternative p-1">
                  <button type="button" className="rounded-lg bg-elevated px-4 py-2 text-sm font-bold text-strong shadow-sm">
                    {t.sale}
                  </button>
                  <button type="button" disabled title={t.notReady} className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold text-assistive">
                    {t.jeonse}
                  </button>
                  <button type="button" disabled title={t.notReady} className="cursor-not-allowed rounded-lg px-4 py-2 text-sm font-semibold text-assistive">
                    {t.monthlyRent}
                  </button>
                </div>
                <p className="text-[11px] text-assistive">{t.allTradeTypeNote}</p>
              </div>

              <div className="min-w-[240px] flex-1 space-y-1.5">
                <span className="text-xs font-bold tracking-wide text-neutral">{t.region}</span>
                <RegionSearchInput value={regionName} onChange={setRegionName} onSelect={selectRegion} placeholder={t.regionPlaceholder} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold tracking-wide text-neutral">{t.period}</span>
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-neutral">
                    <input type="checkbox" checked={isRange} onChange={(event) => setIsRange(event.target.checked)} />
                    {t.rangeSearch}
                  </label>
                </div>
                {isRange ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="w-28 rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                      value={startMonth}
                      onChange={(event) => setStartMonth(event.target.value)}
                      placeholder={t.startMonth}
                    />
                    <span className="text-xs text-assistive">~</span>
                    <input
                      className="w-28 rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                      value={endMonth}
                      onChange={(event) => setEndMonth(event.target.value)}
                      placeholder={t.endMonth}
                    />
                  </div>
                ) : (
                  <input
                    className="w-40 rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                    value={dealMonth}
                    onChange={(event) => setDealMonth(event.target.value)}
                    placeholder={t.singleMonth}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t.search}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-4 grid gap-2 border-t border-dashed border-normal pt-4 md:grid-cols-[minmax(180px,1.4fr)_repeat(2,minmax(0,1fr))_auto]">
                <input
                  className="rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder={t.complexFilter}
                />
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                    value={areaMin}
                    onChange={(event) => setAreaMin(event.target.value)}
                    placeholder={t.areaMin}
                    inputMode="decimal"
                  />
                  <span className="text-xs text-assistive">~</span>
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                    value={areaMax}
                    onChange={(event) => setAreaMax(event.target.value)}
                    placeholder={t.areaMax}
                    inputMode="decimal"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                    value={priceMin}
                    onChange={(event) => setPriceMin(event.target.value)}
                    placeholder={t.priceMin}
                    inputMode="decimal"
                  />
                  <span className="text-xs text-assistive">~</span>
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-sm text-strong outline-none focus:border-primary"
                    value={priceMax}
                    onChange={(event) => setPriceMax(event.target.value)}
                    placeholder={t.priceMax}
                    inputMode="decimal"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="h-[42px] rounded-lg border border-normal bg-normal px-3 text-sm font-semibold text-strong outline-none"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-lg border border-normal px-3 py-2 text-sm font-semibold text-neutral transition-colors hover:bg-alternative hover:text-strong"
                    >
                      {t.resetFilters}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>
      </SectionCard>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={t.recordCount} value={`${kpis.count}${t.unitCount}`} hint={t.searchScope} />
        <KpiCard label={t.averagePrice} value={`${kpis.avgPrice.toFixed(1)}${t.unitDeal}`} hint={searchedRegion || t.prompt} />
        <KpiCard label={t.averagePpy} value={kpis.avgPpy > 0 ? `${kpis.avgPpy.toLocaleString()}${t.unitPpy}` : "-"} hint={t.ppyHint} />
        <KpiCard label={t.priceRange} value={kpis.count > 0 ? `${kpis.maxPrice.toFixed(1)} · ${kpis.minPrice.toFixed(1)}${t.unitDeal}` : "-"} hint={t.searchScope} />
      </section>

      <SectionCard title={t.resultTitle} subtitle={t.resultSubtitle} className="overflow-hidden">
        {results.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-neutral">
            <span>
              {t.showing} <b className="font-bold text-strong">{sorted.length}</b>
              {t.unitCount}
              {searchedRegion ? ` · ${searchedRegion}` : ""}
            </span>
            {hasActiveFilters && (
              <span>
                {t.filteredResults} / {t.allResults} {results.length}
                {t.unitCount}
              </span>
            )}
          </div>
        )}

        {sorted.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-normal bg-alternative/80">
                  <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-neutral">{t.apartmentName}</th>
                  <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-neutral">{t.area}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold tracking-wide text-neutral">{t.floor}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold tracking-wide text-neutral">{t.price}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold tracking-wide text-neutral">{t.ppy}</th>
                  <th className="px-4 py-3 text-left text-xs font-bold tracking-wide text-neutral">{t.dealDate}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold tracking-wide text-neutral">{t.delta}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, index) => (
                  <tr key={`${item.apartmentName}-${item.dealDate}-${index}`} className="border-b border-normal/50 last:border-b-0 hover:bg-alternative/40">
                    <td className="px-4 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-strong">{item.apartmentName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-neutral">{formatArea(item)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-strong">{item.floor ? `${item.floor}층` : "-"}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-strong">{item.priceEok.toFixed(2)}{t.unitDeal}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-neutral">{item.ppy > 0 ? `${item.ppy.toLocaleString()}${t.unitPpy}` : "-"}</td>
                    <td className="px-4 py-3.5 tabular-nums text-strong">{item.dealDate}</td>
                    <td className="px-4 py-3.5 text-right">
                      <DeltaTag value={item.deltaEok} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-neutral">{loading ? t.loading : results.length > 0 ? t.noResults : t.prompt}</p>
        )}
      </SectionCard>

      <div className="rounded-xl border border-amber-200/50 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
        {t.sourceNote}
      </div>
    </div>
  );
}
