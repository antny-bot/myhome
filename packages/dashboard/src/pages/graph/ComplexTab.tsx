import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar
} from "recharts";
import { loadComplexDetail } from "../../api";
import { SectionCard } from "../../components/SectionCard";
import { useBreakpoint } from "../../useBreakpoint";
import { Home, Calendar, DollarSign, Layers } from "lucide-react";

const i18n = {
  ko: {
    selectComplex: "상위 필터에서 분석할 단지를 선택해 주세요.",
    noData: "선택한 면적대 조건의 실거래 데이터가 없습니다.",
    detailReport: "단지 전용 분석 리포트",
    allArea: "전체",
    monthlyTrendTitle: "📈 월별 평균 가격 추이 (평균 억)",
    overallAvg: "전체 평균",
    complexOverallAvg: "단지 전체 평균",
    areaAnalysisTitle: "📐 평형별 거래 분석 (평균가 & 거래량)",
    floorAnalysisTitle: "🏢 층별 거래 분석 (거래량 & 평균가)",
    avgPrice: "평균가",
    txCount: "거래량",
    eokUnit: "억",
    countUnit: "건",
    floorUnit: "층",
    recentTxTitle: "📋 최근 실거래 내역 (최대 10건)",
    dealDate: "거래일",
    dealPrice: "거래가",
    exclusiveArea: "전용면적",
    floor: "층",
  },
  en: {
    selectComplex: "Please select a complex to analyze in the filter panel above.",
    noData: "No transaction data found for the selected area filter.",
    detailReport: "Complex Analysis Report",
    allArea: "All",
    monthlyTrendTitle: "📈 Monthly Average Price Trend (Avg in 100M KRW)",
    overallAvg: "Overall Avg",
    complexOverallAvg: "Complex Overall Avg",
    areaAnalysisTitle: "📐 Size Analysis (Avg Price & Volume)",
    floorAnalysisTitle: "🏢 Floor Analysis (Volume & Avg Price)",
    avgPrice: "Avg Price",
    txCount: "Volume",
    eokUnit: "100M",
    countUnit: "deals",
    floorUnit: "F",
    recentTxTitle: "📋 Recent Transactions (Max 10)",
    dealDate: "Deal Date",
    dealPrice: "Deal Price",
    exclusiveArea: "Size",
    floor: "Floor",
  }
};

const currentLang: "ko" | "en" = (navigator.language.startsWith("ko") ? "ko" : "en") as "ko" | "en";
const t = (key: keyof typeof i18n["ko"]) => i18n[currentLang][key];

const tooltipContentStyle = {
  backgroundColor: "var(--color-semantic-background-elevated-normal)",
  border: "1px solid var(--color-semantic-line-normal-normal)",
  borderRadius: "8px",
  color: "var(--color-semantic-label-strong)",
  fontSize: "12px",
};

const lineColors = [
  "var(--color-chart-min)",
  "var(--color-chart-primary)",
  "var(--color-chart-accent)",
  "var(--color-chart-floor)",
  "var(--color-chart-median)",
  "var(--color-semantic-primary-normal)",
  "var(--color-chart-max)"
];

interface ComplexTabProps {
  initialComplexName?: string;
  lawdCode?: string;
  areaUnit?: "pyeong" | "m2";
}

export default function ComplexTab({ initialComplexName = "", lawdCode, areaUnit = "pyeong" }: ComplexTabProps) {
  const formatSizeString = (sizeStr: string, unit: "pyeong" | "m2") => {
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return sizeStr;
    if (unit === "pyeong") {
      return `${Math.round(num / 3.305785)}평`;
    }
    return `${Math.round(num)}㎡`;
  };
  const { isNarrow } = useBreakpoint();
  const [complexName, setComplexName] = useState(initialComplexName);
  const [selectedArea, setSelectedArea] = useState<number | undefined>(undefined);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [error, setError] = useState("");
  const [cache, setCache] = useState<Record<string, any>>({});
  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>({});

  const toggleKey = (key: string) => {
    setHiddenKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 트렌드 데이터 내 존재하는 모든 평수 키 수집
  const trendSizes = React.useMemo(() => {
    if (!detailData?.trend || detailData.trend.length === 0) return [];
    const keys = new Set<string>();
    detailData.trend.forEach((item: any) => {
      Object.keys(item).forEach((key) => {
        if (key.endsWith("㎡")) {
          keys.add(key);
        }
      });
    });
    return Array.from(keys).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [detailData]);

  const fetchDetail = async (name: string, area?: number) => {
    if (!name.trim()) return;
    const cacheKey = `${name}_${area !== undefined ? area : "all"}`;

    if (cache[cacheKey]) {
      setDetailData(cache[cacheKey]);
      setComplexName(name);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await loadComplexDetail(name, lawdCode, area);
      setCache((prev) => ({ ...prev, [cacheKey]: res }));
      setDetailData(res);
      setComplexName(name);

      // "전체" 조회인 경우 실제 존재하는 모든 평수 목록 수집
      if (area === undefined) {
        const sizes = res.areaBreakdown.map((b: any) => b.area);
        // 숫자 오름차순 정렬 (예: "59㎡" -> 59, "114㎡" -> 114)
        sizes.sort((a: string, b: string) => {
          const numA = parseInt(a) || 0;
          const numB = parseInt(b) || 0;
          return numA - numB;
        });
        setAvailableSizes(sizes);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "단지 상세 데이터를 불러오지 못했습니다.");
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  };

  // 단지명 변경 시 필터, 사이즈 목록 및 캐시 초기화
  useEffect(() => {
    setSelectedArea(undefined);
    setAvailableSizes([]);
    setCache({});
  }, [initialComplexName]);

  // 단지명 또는 면적 필터 변경 시 상세 데이터 로드
  useEffect(() => {
    if (initialComplexName) {
      fetchDetail(initialComplexName, selectedArea);
    } else {
      setDetailData(null);
      setComplexName("");
    }
  }, [initialComplexName, selectedArea, lawdCode]);

  // 빈 상태
  if (!initialComplexName && !loading && !detailData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-elevated border border-normal rounded-xl text-neutral">
        <Home size={48} className="mb-3 opacity-30" />
        <p className="text-sm">{t("selectComplex")}</p>
      </div>
    );
  }

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-elevated border border-normal rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-elevated border border-normal rounded-xl text-neutral">
        <Home size={48} className="mb-3 opacity-30" />
        <p className="text-sm text-warn">{error}</p>
      </div>
    );
  }

  if (!detailData) return null;

  return (
    <div className="space-y-6">
      {/* 단지 정보 & 크기 퀵 필터 탭 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-primary pl-4 py-1">
        <div>
          <h2 className="text-lg font-bold text-strong">{complexName}</h2>
          <p className="text-xs text-neutral mt-0.5">{t("detailReport")}</p>
        </div>

        {/* 크기 선택 탭 바 (실제 단지 평수 목록으로 가로 스크롤 대응) */}
        <div className="flex bg-alternative p-1 rounded-lg border border-normal self-start md:self-auto gap-0.5 overflow-x-auto max-w-full">
          <button
            onClick={() => setSelectedArea(undefined)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap ${
              selectedArea === undefined
                ? "bg-primary text-[var(--color-semantic-background-normal-normal)] shadow-sm"
                : "text-neutral hover:text-strong"
            }`}
          >
            {t("allArea")}
          </button>
          {availableSizes.map((size) => {
            const areaNum = parseInt(size);
            const isActive = selectedArea === areaNum;
            return (
              <button
                key={size}
                onClick={() => setSelectedArea(areaNum)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-[var(--color-semantic-background-normal-normal)] shadow-sm"
                    : "text-neutral hover:text-strong"
                }`}
              >
                {formatSizeString(size, areaUnit)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 데이터가 전혀 없을 경우 */}
      {detailData.recentTx.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-elevated border border-normal rounded-xl text-neutral">
          <Home size={48} className="mb-3 opacity-30" />
          <p className="text-sm">{t("noData")}</p>
        </div>
      ) : (
        <>
          {/* 1. 월별 거래 트렌드 시계열 */}
          <SectionCard title={t("monthlyTrendTitle")}>
            {/* 커스텀 범례 (클릭 시 토글 가능) */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {[
                { key: "최대가", label: "최대가", color: "var(--color-chart-max)", type: "line" },
                { key: "평균가", label: "평균가", color: "var(--color-chart-primary)", type: "area" },
                { key: "중위값", label: "중위값", color: "var(--color-chart-median)", type: "line" },
                { key: "최소가", label: "최소가", color: "var(--color-chart-min)", type: "line" },
                { key: "거래량", label: "거래량", color: "var(--color-chart-primary)", type: "bar" }
              ].map((item) => {
                const isHidden = hiddenKeys[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleKey(item.key)}
                    className={`flex items-center gap-1.5 transition-opacity duration-200 ${
                      isHidden ? "opacity-30 line-through" : "opacity-100 hover:opacity-80"
                    }`}
                  >
                    <span
                      className={`inline-block w-3 h-3 ${item.type === "line" ? "rounded-full" : "rounded-sm"}`}
                      style={{ backgroundColor: item.color, opacity: item.type === "line" ? 1.0 : 0.6 }}
                    />
                    <span className="text-xs text-neutral select-none">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={detailData.trend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" />
                  {/* 좌측 Y축: 가격 */}
                  <YAxis yAxisId="left" width={52} stroke="#64748b" fontSize={11} tickLine={false} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                  {/* 우측 Y축: 거래량 */}
                  <YAxis yAxisId="right" orientation="right" width={35} stroke="#64748b" fontSize={11} tickLine={false} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                  <Tooltip contentStyle={tooltipContentStyle} />
                  
                  {/* 우측 Y축 기준의 거래량 Bar (뒷배경) */}
                  {!hiddenKeys["거래량"] && (
                    <Bar yAxisId="right" dataKey="거래량" name="거래량" fill="var(--color-chart-primary)" fillOpacity={0.15} radius={[4, 4, 0, 0]} barSize={24} />
                  )}

                  {/* 평균가를 배경 반투명 Area 스타일로 뒷배경에 깔아줌 */}
                  {!hiddenKeys["평균가"] && (
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="평균가"
                      name="평균가 (배경)"
                      stroke="none"
                      fill="var(--color-chart-primary)"
                      fillOpacity={0.08}
                      connectNulls={true}
                    />
                  )}
                  
                  {/* 최대가, 중위값, 최소가 선 그래프 드로잉 (평균가 Line 제거) */}
                  {!hiddenKeys["최대가"] && (
                    <Line yAxisId="left" type="monotone" dataKey="최대가" name="최대가" stroke="var(--color-chart-max)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls={true} />
                  )}
                  {!hiddenKeys["중위값"] && (
                    <Line yAxisId="left" type="monotone" dataKey="중위값" name="중위값" stroke="var(--color-chart-median)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls={true} />
                  )}
                  {!hiddenKeys["최소가"] && (
                    <Line yAxisId="left" type="monotone" dataKey="최소가" name="최소가" stroke="var(--color-chart-min)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls={true} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <div className="grid gap-6" style={{ gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)' }}>
            {/* 2. 평수별 통계 (이중 Y축 적용 ComposedChart) */}
            <SectionCard title={t("areaAnalysisTitle")}>
              {/* 커스텀 범례 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-[var(--color-chart-primary)]" />
                  <span className="text-xs text-neutral">{`${t("avgPrice")} (${t("eokUnit")})`}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-0.5 bg-[var(--color-chart-min)]" />
                  <span className="text-xs text-neutral">{`${t("txCount")} (${t("countUnit")})`}</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={detailData.areaBreakdown} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="area" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" tickFormatter={(v) => formatSizeString(v, areaUnit)} />
                    {/* Y축 1: 평균 거래가 (억 원) */}
                    <YAxis yAxisId="left" width={52} stroke="#64748b" fontSize={11} tickLine={false} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                    {/* Y축 2: 거래 건수 (건) */}
                    <YAxis yAxisId="right" orientation="right" width={35} stroke="#64748b" fontSize={11} tickLine={false} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                    <Tooltip contentStyle={tooltipContentStyle} labelFormatter={(label) => formatSizeString(label, areaUnit)} />
                    <Bar yAxisId="left" dataKey="avgPriceEok" name={`${t("avgPrice")} (${t("eokUnit")})`} fill="var(--color-chart-primary)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="count" name={`${t("txCount")} (${t("countUnit")})`} stroke="var(--color-chart-min)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* 3. 층별 분포 (이중 Y축 적용 ComposedChart) */}
            <SectionCard title={t("floorAnalysisTitle")}>
              {/* 커스텀 범례 */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-[var(--color-chart-accent)]" />
                  <span className="text-xs text-neutral">{`${t("txCount")} (${t("countUnit")})`}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3.5 h-0.5 bg-[var(--color-chart-floor)]" />
                  <span className="text-xs text-neutral">{`${t("avgPrice")} (${t("eokUnit")})`}</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={detailData.floorDist} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="floor" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" tickFormatter={(v) => `${v}${t("floorUnit")}`} />
                    {/* Y축 1: 거래 건수 (건) */}
                    <YAxis yAxisId="left" width={52} stroke="#64748b" fontSize={11} tickLine={false} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                    {/* Y축 2: 평균 거래가 (억 원) */}
                    <YAxis yAxisId="right" orientation="right" width={35} stroke="#64748b" fontSize={11} tickLine={false} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                    <Tooltip contentStyle={tooltipContentStyle} />
                    <Bar yAxisId="left" dataKey="count" name={`${t("txCount")} (${t("countUnit")})`} fill="var(--color-chart-accent)" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="avgPriceEok" name={`${t("avgPrice")} (${t("eokUnit")})`} stroke="var(--color-chart-floor)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* 4. 최근 실거래 목록 */}
          <SectionCard title={t("recentTxTitle")}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-neutral tabular-nums">
                <thead className="text-xs uppercase bg-alternative/60 text-neutral">
                  <tr>
                    <th scope="col" className="px-4 py-3">{t("dealDate")}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("dealPrice")}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("exclusiveArea")}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("floor")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.recentTx.map((tx: any) => (
                    <tr key={tx.dedupeKey} className="border-b border-normal hover:bg-normal/50">
                      <td className="px-4 py-3.5 flex items-center gap-1.5 font-medium text-strong">
                        <Calendar size={13} className="text-assistive" />
                        {tx.dealDate}
                      </td>
                      <td className="px-4 py-3.5 text-primary font-bold text-right">
                        <span className="inline-flex items-center gap-0.5 justify-end">
                          <DollarSign size={13} />
                          {tx.priceEok.toFixed(2)}{t("eokUnit")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {tx.areaM2 ? formatSizeString(String(tx.areaM2), areaUnit) : "-"}
                      </td>
                      <td className="px-4 py-3.5 text-neutral text-right">
                        <span className="inline-flex items-center gap-1 justify-end">
                          <Layers size={13} />
                          {tx.floor ? `${tx.floor}${t("floorUnit")}` : "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
