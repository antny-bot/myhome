import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart
} from "recharts";
import { SectionCard } from "../../components/SectionCard";
import { StatCard } from "../../components/StatCard";
import { useBreakpoint } from "../../useBreakpoint";
import { TrendingUp, DollarSign, Home, Activity } from "lucide-react";

interface OverviewTabProps {
  data: any[]; // searchTransactions 결과
  onSelectComplex?: (complexName: string) => void;
}

const tooltipContentStyle = {
  backgroundColor: "var(--color-semantic-background-elevated-normal)",
  border: "1px solid var(--color-semantic-line-normal-normal)",
  borderRadius: "8px",
  color: "var(--color-semantic-label-strong)",
  fontSize: "12px",
};

// 중위값 계산 헬퍼 함수
function getMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// 프리미엄 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // ComposedChart 전체 메타 데이터
    const metaRecord = payload.find(
      (p: any) => p.dataKey === "최대가" || p.dataKey === "최소가" || p.dataKey === "거래량"
    )?.payload;

    const maxVal = metaRecord?.최대가;
    const avgVal = metaRecord?.평균가;
    const medVal = metaRecord?.중위값;
    const minVal = metaRecord?.최소가;
    const volume = metaRecord?.거래량;

    return (
      <div className="rounded-xl border border-normal bg-elevated p-3.5 shadow-xl text-xs space-y-2 min-w-[180px]">
        <p className="font-black text-strong border-b border-normal pb-1.5 mb-1.5 text-[13px]">{label}</p>
        
        <div className="space-y-1.5">
          {volume !== undefined && (
            <p className="text-neutral flex justify-between gap-4">
              <span>총 거래량:</span>
              <span className="font-bold text-strong">{volume} 건</span>
            </p>
          )}
          {maxVal !== undefined && (
            <p className="text-red-500 flex justify-between gap-4">
              <span>최고가:</span>
              <span className="font-bold">{maxVal.toFixed(2)} 억</span>
            </p>
          )}
          {avgVal !== undefined && (
            <p className="text-blue-500 flex justify-between gap-4">
              <span>평균가:</span>
              <span className="font-bold">{avgVal.toFixed(2)} 억</span>
            </p>
          )}
          {medVal !== undefined && (
            <p className="text-violet-500 flex justify-between gap-4">
              <span>중위값:</span>
              <span className="font-bold">{medVal.toFixed(2)} 억</span>
            </p>
          )}
          {minVal !== undefined && (
            <p className="text-emerald-500 flex justify-between gap-4">
              <span>최저가:</span>
              <span className="font-bold">{minVal.toFixed(2)} 억</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function OverviewTab({ data, onSelectComplex }: OverviewTabProps) {
  const { isNarrow } = useBreakpoint();
  const [sizeFilter, setSizeFilter] = React.useState<"all" | "under20" | "20s" | "30s" | "over40">("all");

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral">
        <Home size={48} className="mb-3 opacity-30" />
        <p className="text-sm">조회된 실거래 데이터가 없습니다.</p>
        <p className="text-xs mt-1 text-assistive">필터 조건을 설정하고 분석 실행 버튼을 눌러주세요.</p>
      </div>
    );
  }

  // 평형 필터 적용 데이터 가공 (전용면적 기준 평수대로 구분)
  const filteredData = React.useMemo(() => {
    return data.filter((d) => {
      if (sizeFilter === "all") return true;
      const area = d.areaM2 || 0;
      if (sizeFilter === "under20") return area < 50;                     // 20평 미만 (50㎡ 미만)
      if (sizeFilter === "20s") return area >= 50 && area < 80;           // 20평대 (50㎡ ~ 80㎡ 미만, ex: 59㎡)
      if (sizeFilter === "30s") return area >= 80 && area < 110;          // 30평대 (80㎡ ~ 110㎡ 미만, ex: 84㎡)
      if (sizeFilter === "over40") return area >= 110;                    // 40평 이상 (110㎡ 이상, ex: 114㎡)
      return true;
    });
  }, [data, sizeFilter]);

  // 1. 통계 데이터 가공 (필터링된 데이터 기준)
  const totalCount = filteredData.length;
  const prices = filteredData.map((d) => d.priceEok);
  const avgPrice = totalCount > 0 ? prices.reduce((sum, p) => sum + p, 0) / totalCount : 0;
  const maxPrice = totalCount > 0 ? Math.max(...prices) : 0;
  const minPrice = totalCount > 0 ? Math.min(...prices) : 0;

  // 2. 월별 시계열 데이터 가공 (최대, 최소, 평균, 중위, 거래량)
  const monthlyDataMap = new Map<string, { count: number; prices: number[] }>();
  filteredData.forEach((d) => {
    const month = d.dealDate.substring(0, 7);
    const current = monthlyDataMap.get(month) || { count: 0, prices: [] };
    current.count += 1;
    current.prices.push(d.priceEok);
    monthlyDataMap.set(month, current);
  });

  const monthlyChartData = Array.from(monthlyDataMap.entries())
    .map(([month, val]) => {
      const maxVal = Math.max(...val.prices);
      const minVal = Math.min(...val.prices);
      const sumVal = val.prices.reduce((sum, p) => sum + p, 0);
      const avgVal = sumVal / val.count;
      const medVal = getMedian(val.prices);

      return {
        name: month,
        거래량: val.count,
        최대가: Number(maxVal.toFixed(2)),
        최소가: Number(minVal.toFixed(2)),
        평균가: Number(avgVal.toFixed(2)),
        중위값: Number(medVal.toFixed(2)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 개별 실거래가 점용 데이터셋 (Scatter용 x/y 사용)
  const scatterData = filteredData.map((d) => ({
    x: d.dealDate.substring(0, 7),
    y: Number(d.priceEok.toFixed(2)),
    aptName: d.apartmentName,
    dealDate: d.dealDate,
    floor: d.floor,
    areaM2: d.areaM2,
  })).sort((a, b) => a.x.localeCompare(b.x));

  // 3. 지역별 평균 가격 비교 (상위 10개)
  const regionDataMap = new Map<string, { count: number; sum: number }>();
  filteredData.forEach((d) => {
    const region = d.regionName || "기타";
    const current = regionDataMap.get(region) || { count: 0, sum: 0 };
    current.count += 1;
    current.sum += d.priceEok;
    regionDataMap.set(region, current);
  });

  const regionChartData = Array.from(regionDataMap.entries())
    .map(([name, val]) => ({
      name,
      평균가: Number((val.sum / val.count).toFixed(2)),
      거래량: val.count,
    }))
    .sort((a, b) => b.평균가 - a.평균가)
    .slice(0, 10);

  // 4. 단지별 거래량 순위 (상위 10개)
  const complexDataMap = new Map<string, number>();
  filteredData.forEach((d) => {
    complexDataMap.set(d.apartmentName, (complexDataMap.get(d.apartmentName) || 0) + 1);
  });

  const complexChartData = Array.from(complexDataMap.entries())
    .map(([name, count]) => ({ name, 거래수: count }))
    .sort((a, b) => b.거래수 - a.거래수)
    .slice(0, 10);

  // 실제 평수 기준 필터 버튼 옵션
  const sizeOptions = [
    { key: "all", label: "전체" },
    { key: "under20", label: "20평 미만" },
    { key: "20s", label: "20평대" },
    { key: "30s", label: "30평대" },
    { key: "over40", label: "40평 이상" },
  ] as const;

  const sizeFilterSelector = (
    <div className="flex items-center gap-0.5 rounded-lg bg-alternative p-0.5 border border-normal">
      {sizeOptions.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setSizeFilter(opt.key)}
          className={`px-2 md:px-3 py-1 text-[9px] md:text-[10px] font-bold rounded-md transition-colors ${
            sizeFilter === opt.key
              ? "bg-primary text-white shadow-sm"
              : "text-neutral hover:text-strong"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 4개의 KPI 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="총 거래량"
          value={`${totalCount} 건`}
          icon={Activity}
          tone="default"
        />
        <StatCard
          label="평균 거래가"
          value={`${avgPrice.toFixed(2)} 억`}
          icon={DollarSign}
          tone="good"
        />
        <StatCard
          label="최고가 거래"
          value={`${maxPrice.toFixed(1)} 억`}
          icon={TrendingUp}
          tone="warn"
        />
        <StatCard
          label="최저가 거래"
          value={`${minPrice.toFixed(1)} 억`}
          icon={Home}
          tone="default"
        />
      </div>

      {/* 시계열 메인 차트 */}
      <SectionCard title="📈 월별 실거래가 & 거래량 추이" right={sizeFilterSelector}>
        {/* 커스텀 범례 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm opacity-60" style={{ backgroundColor: "#3b82f6" }} />
            <span className="text-xs text-neutral">거래량 (보조)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            <span className="text-xs text-neutral">최고가</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm opacity-60" style={{ backgroundColor: "#3b82f6" }} />
            <span className="text-xs text-neutral">평균가 (배경)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
            <span className="text-xs text-neutral">중위값</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#10b981" }} />
            <span className="text-xs text-neutral">최소가</span>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyChartData} margin={{ top: 10, right: -5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" />
              {/* 좌측 Y축: 금액(억) */}
              <YAxis yAxisId="left" width={52} stroke="#64748b" fontSize={11} tickLine={false} label={{ value: "가격(억)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10, offset: 6 }} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
              {/* 우측 Y축: 거래수(건) */}
              <YAxis yAxisId="right" orientation="right" width={52} stroke="#64748b" fontSize={11} tickLine={false} label={{ value: "거래수(건)", angle: 90, position: "insideRight", fill: "#64748b", fontSize: 10, offset: 6 }} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              {/* 우측 Y축(거래량) 기준의 투명 Bar */}
              <Bar yAxisId="right" dataKey="거래량" fill="#3b82f6" fillOpacity={0.15} radius={[4, 4, 0, 0]} barSize={24} />
              
              {/* 평균가를 배경 반투명 Area 스타일로 뒷배경에 깔아줌 */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="평균가"
                name="평균가 (배경)"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.08}
                connectNulls={true}
              />
              
              {/* 좌측 Y축(가격) 기준의 최고, 중위, 최소 시계열 라인 */}
              <Line yAxisId="left" type="monotone" dataKey="최대가" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls={true} />
              <Line yAxisId="left" type="monotone" dataKey="중위값" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls={true} />
              <Line yAxisId="left" type="monotone" dataKey="최소가" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} connectNulls={true} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* 서브 차트 2개 나란히 */}
      <div className="grid gap-6" style={{ gridTemplateColumns: isNarrow ? '1fr' : 'repeat(2, 1fr)' }}>
        {/* 지역별 평균가 비교 */}
        <SectionCard title="🏘️ 주요 지역별 평균 거래가 (상위 10개)">
          {/* 커스텀 범례 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#10b981" }} />
              <span className="text-xs text-neutral">평균가</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval="preserveStartEnd" tickFormatter={(v) => v.split(" ").slice(-1)[0]} />
                <YAxis width={52} stroke="#64748b" fontSize={11} tickLine={false} domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Bar dataKey="평균가" fill="#10b981" radius={[4, 4, 0, 0]} label={{ position: "top", fill: "#94a3b8", fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* 거래 상위 10개 단지 */}
        <SectionCard title="🏢 거래가 활발한 아파트 단지 (상위 10개)">
          {/* 커스텀 범례 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
              <span className="text-xs text-neutral">거래수</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complexChartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" domain={[(dataMin) => Math.max(0, Math.floor(dataMin * 0.9)), "auto"]} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={80} />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Bar
                  dataKey="거래수"
                  fill="#f59e0b"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(data) => {
                    if (data && data.name && onSelectComplex) {
                      onSelectComplex(data.name);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
