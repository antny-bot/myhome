import { ArrowDownRight, ArrowUpRight, ChevronRight, ChevronDown, LayoutGrid, TableProperties, RefreshCw, Search, MapPin } from "lucide-react";
import React, { useMemo, useState } from "react";
import { searchTransactions, getApartments } from "../api";

import { RegionSearchInput } from "../components/RegionSearchInput";
import { SectionCard } from "../components/SectionCard";
import { ComplexGroupView } from "../components/ComplexGroupView";
import { KakaoMap } from "../components/KakaoMap";
import { classNames } from "../lib/format";
import type { RegionSearchResult, TransactionRecord } from "../types";
import { PYEONG_M2, getDefaultMonth } from "../lib/constants";
import { copy } from "../locales/ko";
import { useBreakpoint } from "../useBreakpoint";

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
      <p className="mt-2 text-[22px] font-black tracking-tight text-strong leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] text-assistive">{hint}</p>
    </div>
  );
}

export function ExplorePage() {
  const { isMobile } = useBreakpoint();
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
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped");

  // 아파트 단지 연동 및 탭 상태
  const [selectedApartment, setSelectedApartment] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<"map" | "list">("list");

  // 아파트 단지 드롭다운용 상태
  const [apartments, setApartments] = useState<string[]>([]);
  const [loadingApartments, setLoadingApartments] = useState(false);

  // Autocomplete 콤보박스용 상태
  const [complexQuery, setComplexQuery] = useState("");
  const [showComplexDropdown, setShowComplexDropdown] = useState(false);
  const [activeAptIndex, setActiveAptIndex] = useState(-1);

  const filteredApartments = useMemo(() => {
    const q = complexQuery.trim().toLowerCase();
    if (!q) return apartments;
    return apartments.filter((apt) => apt.toLowerCase().includes(q));
  }, [apartments, complexQuery]);

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

  async function selectRegion(item: RegionSearchResult) {
    setRegionName(item.displayName);
    setLawdCode(item.lawdCode);
    setNameFilter("");
    setComplexQuery("");
    setError("");
    setApartments([]);
    setSelectedApartment(null);

    if (item.lawdCode) {
      setLoadingApartments(true);
      try {
        const list = await getApartments(item.lawdCode);
        setApartments(list);
      } catch (err) {
        console.error("Failed to load apartments for dropdown", err);
      } finally {
        setLoadingApartments(false);
      }
    }
  }

  function resetFilters() {
    setNameFilter("");
    setAreaMin("");
    setAreaMax("");
    setPriceMin("");
    setPriceMax("");
    setSelectedApartment(null);
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
    setSelectedApartment(null);

    try {
      const records = isRange
        ? await searchTransactions(lawdCode, regionName, { startMonth, endMonth })
        : await searchTransactions(lawdCode, regionName, { dealMonth });
      setResults(records);
      setSearchedRegion(regionName);
      resetFilters();

      // 검색 성공 시, 모바일 기기라면 바로 지도 탭으로 전환하여 시각적 정보를 먼저 제공
      if (isMobile) {
        setMobileActiveTab("map");
      }
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : t.searchFailed);
    } finally {
      setLoading(false);
    }
  }

  const showList = !isMobile || mobileActiveTab === "list";
  const showMap = !isMobile || mobileActiveTab === "map";

  return (
    <div className="space-y-4 flex flex-col min-h-0">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs text-assistive font-bold">
            <span>{t.breadcrumb}</span>
            <ChevronRight className="h-3 w-3" />
            <span>{t.subBreadcrumb}</span>
          </p>
          <h2 className="text-2xl font-black tracking-tight text-strong">{t.title}</h2>
          <p className="mt-1 max-w-3xl text-xs text-neutral">{t.subtitle}</p>
        </div>
      </header>

      <SectionCard className="p-3 md:p-4">
        <div className="space-y-3">
          <div className="rounded-xl border border-normal bg-normal p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold tracking-wide text-neutral">{t.tradeType}</span>
                <div className="inline-flex gap-1 rounded-lg bg-alternative p-0.5">
                  <button type="button" className="rounded-md bg-elevated px-3 py-1.5 text-xs font-bold text-strong shadow-sm">
                    {t.sale}
                  </button>
                  <button type="button" disabled title={t.notReady} className="cursor-not-allowed rounded-md px-3 py-1.5 text-xs font-semibold text-assistive">
                    {t.jeonse}
                  </button>
                </div>
              </div>

              <div className="min-w-[200px] flex-1 space-y-1">
                <span className="text-[11px] font-bold tracking-wide text-neutral">{t.region}</span>
                <RegionSearchInput
                  value={regionName}
                  onChange={setRegionName}
                  onSelect={selectRegion}
                  placeholder={t.regionPlaceholder}
                />
              </div>

              {lawdCode && (apartments.length > 0 || loadingApartments) && (
                <div className="min-w-[180px] flex-1 space-y-1 relative">
                  <span className="text-[11px] font-bold tracking-wide text-neutral">아파트 단지</span>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full h-[38px] rounded-lg border border-normal bg-normal pl-3 pr-8 text-xs font-semibold text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                      value={complexQuery}
                      onChange={(e) => {
                        setComplexQuery(e.target.value);
                        if (e.target.value === "") {
                          setNameFilter("");
                        }
                        setShowComplexDropdown(true);
                      }}
                      onFocus={() => setShowComplexDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowComplexDropdown(false);
                          setActiveAptIndex(-1);
                        }, 200);
                      }}
                      onKeyDown={(e) => {
                        if (!showComplexDropdown || filteredApartments.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setActiveAptIndex((prev) => (prev < filteredApartments.length - 1 ? prev + 1 : prev));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setActiveAptIndex((prev) => (prev > 0 ? prev - 1 : -1));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          if (activeAptIndex >= 0 && activeAptIndex < filteredApartments.length) {
                            const selected = filteredApartments[activeAptIndex];
                            setComplexQuery(selected);
                            setNameFilter(selected);
                            setShowComplexDropdown(false);
                          }
                        } else if (e.key === "Escape") {
                          setShowComplexDropdown(false);
                          setActiveAptIndex(-1);
                        }
                      }}
                      placeholder={loadingApartments ? "단지 로딩 중..." : "전체 단지 (직접 입력)"}
                      disabled={loadingApartments}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => !loadingApartments && setShowComplexDropdown((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-2 text-neutral hover:text-strong"
                      disabled={loadingApartments}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>

                    {showComplexDropdown && filteredApartments.length > 0 && (
                      <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-lg border border-normal bg-elevated py-1 shadow-lg">
                        {complexQuery && (
                          <li>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setComplexQuery("");
                                setNameFilter("");
                                setShowComplexDropdown(false);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-primary font-semibold hover:bg-alternative transition-colors"
                            >
                              전체 아파트 선택 해제
                            </button>
                          </li>
                        )}
                        {filteredApartments.map((apt, index) => (
                          <li key={`${apt}-${index}`}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setComplexQuery(apt);
                                setNameFilter(apt);
                                setShowComplexDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs text-strong transition-colors ${
                                index === activeAptIndex ? "bg-primary/10 text-primary font-semibold" : "hover:bg-alternative"
                              }`}
                            >
                               {apt}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold tracking-wide text-neutral">{t.period}</span>
                  <label className="flex cursor-pointer select-none items-center gap-1 text-[11px] text-neutral">
                    <input type="checkbox" className="rounded" checked={isRange} onChange={(event) => setIsRange(event.target.checked)} />
                    {t.rangeSearch}
                  </label>
                </div>
                {isRange ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      className="w-24 h-[38px] rounded-lg border border-normal bg-normal px-2.5 text-xs text-strong outline-none focus:border-primary"
                      value={startMonth}
                      onChange={(event) => setStartMonth(event.target.value)}
                      placeholder={t.startMonth}
                    />
                    <span className="text-xs text-assistive">~</span>
                    <input
                      className="w-24 h-[38px] rounded-lg border border-normal bg-normal px-2.5 text-xs text-strong outline-none focus:border-primary"
                      value={endMonth}
                      onChange={(event) => setEndMonth(event.target.value)}
                      placeholder={t.endMonth}
                    />
                  </div>
                ) : (
                  <input
                    className="w-32 h-[38px] rounded-lg border border-normal bg-normal px-2.5 text-xs text-strong outline-none focus:border-primary"
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
                className="flex items-center gap-1.5 h-[38px] rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                {t.search}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-3 grid gap-2 border-t border-dashed border-normal pt-3 md:grid-cols-[minmax(140px,1.2fr)_repeat(2,minmax(0,1fr))_auto]">
                <input
                  className="rounded-lg h-[36px] border border-normal bg-normal px-2.5 text-xs text-strong outline-none focus:border-primary"
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  placeholder={t.complexFilter}
                />
                <div className="flex items-center gap-1.5">
                  <input
                    className="w-full rounded-lg h-[36px] border border-normal bg-normal px-2 text-xs text-strong outline-none focus:border-primary"
                    value={areaMin}
                    onChange={(event) => setAreaMin(event.target.value)}
                    placeholder={t.areaMin}
                    inputMode="decimal"
                  />
                  <span className="text-xs text-assistive">~</span>
                  <input
                    className="w-full rounded-lg h-[36px] border border-normal bg-normal px-2 text-xs text-strong outline-none focus:border-primary"
                    value={areaMax}
                    onChange={(event) => setAreaMax(event.target.value)}
                    placeholder={t.areaMax}
                    inputMode="decimal"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    className="w-full rounded-lg h-[36px] border border-normal bg-normal px-2 text-xs text-strong outline-none focus:border-primary"
                    value={priceMin}
                    onChange={(event) => setPriceMin(event.target.value)}
                    placeholder={t.priceMin}
                    inputMode="decimal"
                  />
                  <span className="text-xs text-assistive">~</span>
                  <input
                    className="w-full rounded-lg h-[36px] border border-normal bg-normal px-2 text-xs text-strong outline-none focus:border-primary"
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
                    className="h-[36px] rounded-lg border border-normal bg-normal px-2 text-xs font-semibold text-strong outline-none"
                    disabled={viewMode === "grouped"}
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
                      onClick={() => resetFilters()}
                      className="rounded-lg border border-normal px-2.5 h-[36px] text-xs font-semibold text-neutral transition-colors hover:bg-alternative hover:text-strong"
                    >
                      {t.resetFilters}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
        </div>
      </SectionCard>

      {/* KPI 카드 섹션 */}
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <KpiCard label={t.recordCount} value={`${kpis.count}${t.unitCount}`} hint={t.searchScope} />
        <KpiCard label={t.averagePrice} value={`${kpis.avgPrice.toFixed(1)}${t.unitDeal}`} hint={searchedRegion || t.prompt} />
        <KpiCard label={t.averagePpy} value={kpis.avgPpy > 0 ? `${kpis.avgPpy.toLocaleString()}${t.unitPpy}` : "-"} hint={t.ppyHint} />
        <KpiCard label={t.priceRange} value={kpis.count > 0 ? `${kpis.maxPrice.toFixed(1)} · ${kpis.minPrice.toFixed(1)}${t.unitDeal}` : "-"} hint={t.searchScope} />
      </section>

      {/* 메인 결과 분할 뷰 영역 */}
      <div className="flex-1 min-h-[420px] md:h-[580px] flex gap-4 overflow-hidden">
        {/* 1. 결과 리스트 패널 */}
        {showList && (
          <div className={classNames(
            "flex flex-col min-w-0 border border-normal bg-elevated rounded-2xl overflow-hidden shadow-sm transition-all duration-200",
            isMobile ? "w-full h-full" : "w-[430px] shrink-0"
          )}>
            {/* 리스트 패널 헤더 */}
            <div className="flex-none p-3 border-b border-normal bg-alternative/25 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-strong text-xs">{t.resultTitle}</h3>
                <p className="text-[10px] text-neutral mt-0.5">{t.resultSubtitle}</p>
              </div>
              {results.length > 0 && (
                <div className="flex items-center gap-0.5 rounded-lg border border-normal p-0.5 bg-alternative">
                  <button
                    type="button"
                    onClick={() => setViewMode("grouped")}
                    className={classNames(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
                      viewMode === "grouped" ? "bg-primary text-white" : "text-neutral hover:text-strong"
                    )}
                  >
                    <LayoutGrid className="h-3 w-3" />
                    {t.groupedView}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={classNames(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors",
                      viewMode === "table" ? "bg-primary text-white" : "text-neutral hover:text-strong"
                    )}
                  >
                    <TableProperties className="h-3 w-3" />
                    {t.tableView}
                  </button>
                </div>
              )}
            </div>

            {/* 리스트 패널 리스트 (내부 스크롤) */}
            <div className="flex-1 overflow-y-auto p-3">
              {results.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center justify-between text-xs text-neutral">
                  <span>
                    {t.showing} <b className="font-bold text-strong">{viewMode === "grouped" ? filtered.length : sorted.length}</b>
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

              {filtered.length > 0 ? (
                viewMode === "grouped" ? (
                  <ComplexGroupView
                    records={filtered}
                    selectedApartment={selectedApartment}
                    onSelectApartment={(aptName) => {
                      setSelectedApartment(aptName);
                      // 지도로 포커스도 주고, 원한다면 검색 필터를 고정
                    }}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="border-b border-normal bg-alternative/80">
                          <th className="px-3 py-2 text-left font-bold text-neutral">{t.apartmentName}</th>
                          <th className="px-3 py-2 text-left font-bold text-neutral">{t.area}</th>
                          <th className="px-3 py-2 text-right font-bold text-neutral">{t.floor}</th>
                          <th className="px-3 py-2 text-right font-bold text-neutral">{t.price}</th>
                          <th className="px-3 py-2 text-right font-bold text-neutral">{t.ppy}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((item, index) => {
                          const isSelected = selectedApartment === item.apartmentName;
                          return (
                            <tr
                              key={`${item.apartmentName}-${item.dealDate}-${index}`}
                              onClick={() => setSelectedApartment(item.apartmentName)}
                              className={classNames(
                                "border-b border-normal/50 last:border-b-0 cursor-pointer transition-colors duration-150",
                                isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-alternative/40"
                              )}
                            >
                              <td className="px-3 py-2.5">
                                <p className="font-bold text-strong text-xs">{item.apartmentName}</p>
                                <p className="text-[10px] text-assistive mt-0.5">{item.dealDate}</p>
                              </td>
                              <td className="px-3 py-2.5 text-neutral">{formatArea(item)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-strong">{item.floor ? `${item.floor}층` : "-"}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-strong font-extrabold text-primary">{item.priceEok.toFixed(2)}{t.unitDeal}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-neutral">{item.ppy > 0 ? `${item.ppy.toLocaleString()}` : "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                <p className="py-16 text-center text-xs text-neutral">{loading ? t.loading : results.length > 0 ? t.noResults : t.prompt}</p>
              )}
            </div>
          </div>
        )}

        {/* 2. 카카오 지도 패널 */}
        {showMap && (
          <div className="flex-1 h-full min-h-[350px]">
            <KakaoMap
              searchedRegion={searchedRegion}
              records={filtered}
              selectedApartment={selectedApartment}
              onSelectApartment={(aptName) => {
                setSelectedApartment(aptName);
                setNameFilter(aptName);
                if (isMobile) {
                  setMobileActiveTab("list");
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 모바일 탭 전환 플로팅 버튼 */}
      {isMobile && results.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 rounded-full border border-normal bg-elevated/95 backdrop-blur-sm p-1.5 shadow-lg shadow-black/10">
          <button
            type="button"
            onClick={() => setMobileActiveTab("list")}
            className={classNames(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200",
              mobileActiveTab === "list" ? "bg-primary text-white shadow-sm" : "text-neutral hover:text-strong"
            )}
          >
            <TableProperties className="h-3.5 w-3.5" />
            {t.listView}
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveTab("map")}
            className={classNames(
              "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200",
              mobileActiveTab === "map" ? "bg-primary text-white shadow-sm" : "text-neutral hover:text-strong"
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            {t.mapView}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-amber-200/50 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-900 flex-none">
        {t.sourceNote}
      </div>
    </div>
  );
}
