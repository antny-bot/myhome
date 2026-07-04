import { ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, RefreshCw, Search, TableProperties, X } from "lucide-react";
import { useMemo, useState } from "react";
import { searchTransactions } from "../api";
import { ComplexGroupView } from "../components/ComplexGroupView";
import { ConstraintBanner } from "../components/ConstraintBanner";
import { RegionSearchInput } from "../components/RegionSearchInput";
import { SectionCard } from "../components/SectionCard";
import { classNames } from "../lib/format";
import type { RegionSearchResult, TransactionRecord } from "../types";
import { getDefaultMonth } from "../lib/constants";

const defaultMonth = getDefaultMonth();

type SortKey = "apartmentName" | "floor" | "areaM2" | "priceEok" | "dealMonth" | "dealDate";

const columns: Array<{ key: SortKey; label: string }> = [
  { key: "apartmentName", label: "아파트명" },
  { key: "floor", label: "층수" },
  { key: "areaM2", label: "평수" },
  { key: "priceEok", label: "가격" },
  { key: "dealMonth", label: "거래월" },
  { key: "dealDate", label: "거래일자" }
];

function sortValue(item: TransactionRecord, key: SortKey): string | number | undefined {
  switch (key) {
    case "apartmentName":
      return item.apartmentName;
    case "floor":
      return item.floor;
    case "areaM2":
      return item.areaM2;
    case "priceEok":
      return item.priceEok;
    case "dealMonth":
      return item.dealDate.slice(0, 7);
    case "dealDate":
      return item.dealDate;
  }
}

export function ExplorePage() {
  const [searchParams, setSearchParams] = useState({
    regionName: "",
    lawdCode: "",
    isRange: false,
    dealMonth: defaultMonth,
    startMonth: defaultMonth,
    endMonth: defaultMonth
  });

  const [filters, setFilters] = useState({
    name: "",
    areaMin: "",
    areaMax: "",
    priceMin: "",
    priceMax: "",
    month: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TransactionRecord[]>([]);
  const [searchedRegion, setSearchedRegion] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grouped">("grouped");

  const filteredResults = useMemo(() => {
    const name = filters.name.trim();
    const month = filters.month.trim();
    const aMin = filters.areaMin ? Number(filters.areaMin) : undefined;
    const aMax = filters.areaMax ? Number(filters.areaMax) : undefined;
    const pMin = filters.priceMin ? Number(filters.priceMin) : undefined;
    const pMax = filters.priceMax ? Number(filters.priceMax) : undefined;

    return results.filter((item) => {
      if (name && !item.apartmentName.includes(name)) return false;
      if (aMin !== undefined && (item.areaM2 === undefined || item.areaM2 < aMin)) return false;
      if (aMax !== undefined && (item.areaM2 === undefined || item.areaM2 > aMax)) return false;
      if (pMin !== undefined && item.priceEok < pMin) return false;
      if (pMax !== undefined && item.priceEok > pMax) return false;
      if (month && !item.dealDate.replace(/-/g, "").startsWith(month)) return false;
      return true;
    });
  }, [results, filters]);

  function resetFilters() {
    setFilters({
      name: "",
      areaMin: "",
      areaMax: "",
      priceMin: "",
      priceMax: "",
      month: ""
    });
    setSort(null);
  }

  const hasActiveFilters = Boolean(
    filters.name ||
    filters.areaMin ||
    filters.areaMax ||
    filters.priceMin ||
    filters.priceMax ||
    filters.month
  );

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  const sortedResults = useMemo(() => {
    if (!sort) return filteredResults;
    const { key, direction } = sort;
    const factor = direction === "asc" ? 1 : -1;
    return [...filteredResults].sort((a, b) => {
      const av = sortValue(a, key);
      const bv = sortValue(b, key);
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [filteredResults, sort]);

  function selectRegion(item: RegionSearchResult) {
    setSearchParams((prev) => ({
      ...prev,
      regionName: item.displayName,
      lawdCode: item.lawdCode
    }));
    setError("");
  }

  async function handleSearch() {
    if (!searchParams.lawdCode) {
      setError("지역을 먼저 검색해서 선택해 주세요.");
      return;
    }
    const monthPattern = /^\d{6}$/;
    if (searchParams.isRange 
      ? (!monthPattern.test(searchParams.startMonth) || !monthPattern.test(searchParams.endMonth)) 
      : !monthPattern.test(searchParams.dealMonth)) {
      setError("기간을 YYYYMM 형식으로 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const records = searchParams.isRange
        ? await searchTransactions(searchParams.lawdCode, { startMonth: searchParams.startMonth, endMonth: searchParams.endMonth })
        : await searchTransactions(searchParams.lawdCode, { dealMonth: searchParams.dealMonth });
      setResults(records);
      setSearchedRegion(searchParams.regionName);
      resetFilters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "실거래 조회에 실패했습니다.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-strong tracking-tight">실거래 탐색</h2>
        <p className="text-sm text-neutral">관심 지역의 과거 실거래 이력을 기간별로 조회합니다. 알림 조건과는 별개로 동작하며 저장되지 않습니다.</p>
      </header>

      <SectionCard>
        <div className="space-y-4">
          <ConstraintBanner compact />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-sm font-semibold text-strong">지역명 검색</span>
              <RegionSearchInput
                value={searchParams.regionName}
                onChange={(val) => setSearchParams((prev) => ({ ...prev, regionName: val }))}
                onSelect={selectRegion}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-strong">조회 기간</span>
                <label className="flex items-center gap-1.5 text-xs text-neutral cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={searchParams.isRange}
                    onChange={(e) => setSearchParams((prev) => ({ ...prev, isRange: e.target.checked }))}
                  />
                  기간 조회
                </label>
              </div>
              {searchParams.isRange ? (
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
                    value={searchParams.startMonth}
                    onChange={(event) => setSearchParams((prev) => ({ ...prev, startMonth: event.target.value }))}
                    placeholder="시작 YYYYMM"
                  />
                  <span className="text-neutral text-xs">~</span>
                  <input
                    className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
                    value={searchParams.endMonth}
                    onChange={(event) => setSearchParams((prev) => ({ ...prev, endMonth: event.target.value }))}
                    placeholder="종료 YYYYMM"
                  />
                </div>
              ) : (
                <input
                  className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
                  value={searchParams.dealMonth}
                  onChange={(event) => setSearchParams((prev) => ({ ...prev, dealMonth: event.target.value }))}
                  placeholder="YYYYMM"
                />
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm shadow-blue-500/20"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            조회
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="조회 결과"
        subtitle={
          searchedRegion
            ? hasActiveFilters
              ? `${searchedRegion} · 전체 ${results.length}건 중 ${filteredResults.length}건`
              : `${searchedRegion} · ${results.length}건`
            : "지역과 기간을 선택해 조회하세요"
        }
        right={
          results.length > 0 ? (
            <div className="flex items-center gap-1 rounded-lg border border-normal p-1">
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={classNames(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors",
                  viewMode === "grouped" ? "bg-primary text-white" : "text-neutral hover:bg-alternative hover:text-strong"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                단지별 시계열
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={classNames(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors",
                  viewMode === "table" ? "bg-primary text-white" : "text-neutral hover:bg-alternative hover:text-strong"
                )}
              >
                <TableProperties className="h-3.5 w-3.5" />
                표
              </button>
            </div>
          ) : undefined
        }
      >
        {results.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input
                className="rounded-lg border border-normal bg-normal px-3 py-2 text-xs text-strong focus:border-primary outline-none"
                value={filters.name}
                onChange={(e) => setFilters((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="단지명 검색"
              />
              <div className="flex items-center gap-1.5">
                <input
                  className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-xs text-strong focus:border-primary outline-none"
                  value={filters.areaMin}
                  onChange={(e) => setFilters((prev) => ({ ...prev, areaMin: e.target.value }))}
                  placeholder="최소 평수(㎡)"
                  inputMode="decimal"
                />
                <span className="text-neutral text-xs shrink-0">~</span>
                <input
                  className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-xs text-strong focus:border-primary outline-none"
                  value={filters.areaMax}
                  onChange={(e) => setFilters((prev) => ({ ...prev, areaMax: e.target.value }))}
                  placeholder="최대 평수(㎡)"
                  inputMode="decimal"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-xs text-strong focus:border-primary outline-none"
                  value={filters.priceMin}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priceMin: e.target.value }))}
                  placeholder="최소 가격(억)"
                  inputMode="decimal"
                />
                <span className="text-neutral text-xs shrink-0">~</span>
                <input
                  className="w-full rounded-lg border border-normal bg-normal px-3 py-2 text-xs text-strong focus:border-primary outline-none"
                  value={filters.priceMax}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priceMax: e.target.value }))}
                  placeholder="최대 가격(억)"
                  inputMode="decimal"
                />
              </div>
              <input
                className="rounded-lg border border-normal bg-normal px-3 py-2 text-xs text-strong focus:border-primary outline-none"
                value={filters.month}
                onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
                placeholder="거래월 (YYYYMM)"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center justify-center gap-1 rounded-lg border border-normal px-3 py-2 text-xs font-bold text-neutral hover:bg-alternative hover:text-strong transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  필터 초기화
                </button>
              )}
            </div>
          </div>
        )}
        {filteredResults.length > 0 ? (
          viewMode === "grouped" ? (
            <ComplexGroupView records={filteredResults} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-normal">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="px-3 py-2 text-left text-xs font-bold text-neutral cursor-pointer select-none hover:text-strong transition-colors whitespace-nowrap"
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sort?.key === col.key ? (
                            sort.direction === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((item, idx) => (
                    <tr key={idx} className="border-b border-normal/30 hover:bg-normal/30 transition-colors">
                      <td className="px-3 py-2 font-bold text-strong whitespace-nowrap">{item.apartmentName}</td>
                      <td className="px-3 py-2 text-neutral whitespace-nowrap">{item.floor ? `${item.floor}층` : "-"}</td>
                      <td className="px-3 py-2 text-neutral whitespace-nowrap">{item.areaM2 ? `${item.areaM2}㎡` : "-"}</td>
                      <td className="px-3 py-2 font-bold text-primary whitespace-nowrap">{item.priceEok.toFixed(2)}억</td>
                      <td className="px-3 py-2 text-neutral whitespace-nowrap">{item.dealDate.slice(0, 7)}</td>
                      <td className="px-3 py-2 text-assistive text-[11px] whitespace-nowrap">{item.dealDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="text-center py-10 text-sm text-neutral">
            {loading ? "조회 중..." : hasActiveFilters && results.length > 0 ? "필터 조건에 맞는 결과가 없습니다." : "조회 결과가 없습니다."}
          </p>
        )}
      </SectionCard>
    </div>
  );
}
