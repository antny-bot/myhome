import React from "react";
import { createPortal } from "react-dom";
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
  BarChart,
} from "recharts";
import { SectionCard } from "../../components/SectionCard";
import { StatCard } from "../../components/StatCard";
import { useBreakpoint } from "../../useBreakpoint";
import { TrendingUp, DollarSign, Home, Activity } from "lucide-react";
import { copy } from "../../locales/ko";

interface OverviewTabProps {
  data: any[]; // searchTransactions 결과
  onSelectComplex?: (complexName: string) => void;
  areaUnit?: "pyeong" | "m2";
  locale?: "ko" | "en";
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

// 백분위수 계산 헬퍼 함수 (Q1, Q3용)
function getPercentile(arr: number[], percentile: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

// 박스 플롯 중위값 커스텀 수평선 렌더러
const RenderBoxPlotMedian = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <line
      x1={cx - 14}
      y1={cy}
      x2={cx + 14}
      y2={cy}
      stroke="var(--color-chart-median)"
      strokeWidth={3}
      strokeLinecap="round"
    />
  );
};

// 박스 플롯 평균값 커스텀 다이아몬드 렌더러
const RenderBoxPlotAvg = (props: any) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  const s = 6;
  return (
    <path
      d={`M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`}
      fill="var(--color-chart-max)"
      stroke="var(--color-semantic-background-elevated-normal)"
      strokeWidth={1.5}
    />
  );
};

// 박스 플롯용 커스텀 툴팁 컴포넌트
const BoxPlotTooltip = ({ active, payload, label, t }: any) => {
  if (active && payload && payload.length) {
    const metaRecord = payload[0]?.payload;
    if (!metaRecord) return null;

    const { min, q1, median, q3, max, avg, volume } = metaRecord;

    return (
      <div className="rounded-xl border border-normal bg-elevated p-3.5 shadow-xl text-xs space-y-2 min-w-[180px]">
        <p className="font-black text-strong border-b border-normal pb-1.5 mb-1.5 text-[13px]">
          {metaRecord.name || label}
        </p>

        <div className="space-y-1.5">
          <p className="text-neutral flex justify-between gap-4">
            <span>{t?.tradeCount || "거래량"}:</span>
            <span className="font-bold text-strong">{volume} 건</span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-max)" }}
          >
            <span>{t?.maxPriceLabel || "최고가"} (Max):</span>
            <span className="font-bold">
              {max !== null && max !== undefined ? `${max.toFixed(2)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-median)" }}
          >
            <span>Q3 (75%):</span>
            <span className="font-bold">
              {q3 !== null && q3 !== undefined ? `${q3.toFixed(2)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-primary)" }}
          >
            <span>{t?.avgPriceLabel || "평균가"} (Avg):</span>
            <span className="font-bold">
              {avg !== null && avg !== undefined ? `${avg.toFixed(2)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-median)" }}
          >
            <span>
              {t?.boxPlotMedian?.replace(" (Median)", "") || "중위값"}:
            </span>
            <span className="font-bold">
              {median !== null && median !== undefined
                ? `${median.toFixed(2)} 억`
                : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-median)" }}
          >
            <span>Q1 (25%):</span>
            <span className="font-bold">
              {q1 !== null && q1 !== undefined ? `${q1.toFixed(2)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-min)" }}
          >
            <span>최저가 (Min):</span>
            <span className="font-bold">
              {min !== null && min !== undefined ? `${min.toFixed(2)} 억` : "-"}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// 프리미엄 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // ComposedChart 전체 메타 데이터
    const metaRecord = payload.find(
      (p: any) =>
        p.dataKey === "최대가" ||
        p.dataKey === "최소가" ||
        p.dataKey === "거래량",
    )?.payload;

    const maxVal = metaRecord?.최대가;
    const avgVal = metaRecord?.평균가;
    const medVal = metaRecord?.중위값;
    const minVal = metaRecord?.최소가;
    const volume = metaRecord?.거래량;

    return (
      <div className="rounded-xl border border-normal bg-elevated p-3.5 shadow-xl text-xs space-y-2 min-w-[180px]">
        <p className="font-black text-strong border-b border-normal pb-1.5 mb-1.5 text-[13px]">
          {label}
        </p>

        <div className="space-y-1.5">
          {volume !== undefined && (
            <p className="text-neutral flex justify-between gap-4">
              <span>총 거래량:</span>
              <span className="font-bold text-strong">{volume} 건</span>
            </p>
          )}
          {maxVal !== undefined && (
            <p
              className="flex justify-between gap-4"
              style={{ color: "var(--color-chart-max)" }}
            >
              <span>최고가:</span>
              <span className="font-bold">{maxVal.toFixed(2)} 억</span>
            </p>
          )}
          {avgVal !== undefined && (
            <p
              className="flex justify-between gap-4"
              style={{ color: "var(--color-chart-primary)" }}
            >
              <span>평균가:</span>
              <span className="font-bold">{avgVal.toFixed(2)} 억</span>
            </p>
          )}
          {medVal !== undefined && (
            <p
              className="flex justify-between gap-4"
              style={{ color: "var(--color-chart-median)" }}
            >
              <span>중위값:</span>
              <span className="font-bold">{medVal.toFixed(2)} 억</span>
            </p>
          )}
          {minVal !== undefined && (
            <p
              className="flex justify-between gap-4"
              style={{ color: "var(--color-chart-min)" }}
            >
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

export default function OverviewTab({
  data,
  onSelectComplex,
  areaUnit = "pyeong",
  locale = "ko",
}: OverviewTabProps) {
  const { isNarrow } = useBreakpoint();
  const [sizeFilter, setSizeFilter] = React.useState<
    "all" | "under20" | "20s" | "30s" | "over40"
  >("all");
  const t = copy[locale];

  // 피벗 매트릭스 툴팁 상태 (fixed 포지셔닝)
  const [pivotTooltip, setPivotTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    direction: "up" | "down";
    cell: {
      avg: number; median: number; min: number; max: number;
      count: number; complexesSummary: string;
    };
    label: string;
  } | null>(null);

  const handleCellMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    cell: any,
    label: string,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipH = 170; // 예상 툴팁 높이
    const spaceBelow = window.innerHeight - rect.bottom;
    const direction: "up" | "down" = spaceBelow >= tooltipH ? "down" : "up";
    setPivotTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: direction === "down" ? rect.bottom + 6 : rect.top - 6,
      direction,
      cell,
      label,
    });
  };

  const handleCellMouseLeave = () => setPivotTooltip(null);

  // 범례 On/Off 필터 상태 (차트별 독립 설정)
  // 박스플롯 범례 토글 상태 (차트별 독립)
  type BoxVisible = { volume: boolean; whisker: boolean; box: boolean; median: boolean; avg: boolean };
  const defaultVisible: BoxVisible = { volume: true, whisker: true, box: true, median: true, avg: true };
  const [monthlyVisible, setMonthlyVisible] = React.useState<BoxVisible>(defaultVisible);
  const [sizeVisible, setSizeVisible]       = React.useState<BoxVisible>(defaultVisible);
  const [floorVisible, setFloorVisible]     = React.useState<BoxVisible>(defaultVisible);

  const makeToggle = (setter: React.Dispatch<React.SetStateAction<BoxVisible>>) =>
    (key: keyof BoxVisible) => setter(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleMonthly = makeToggle(setMonthlyVisible);
  const toggleSize    = makeToggle(setSizeVisible);
  const toggleFloor   = makeToggle(setFloorVisible);

  const legendItems = [
    { key: "volume"  as const, label: t.boxPlotVolume,  icon: <span className="inline-block w-3.5 h-2.5 rounded-sm" style={{ backgroundColor: "var(--color-chart-primary)", opacity: 0.6 }} /> },
    { key: "whisker" as const, label: t.boxPlotWhisker, icon: <span className="inline-block w-0.5 h-3.5" style={{ backgroundColor: "var(--color-semantic-label-neutral)" }} /> },
    { key: "box"     as const, label: t.boxPlotBox,     icon: <span className="inline-block w-3.5 h-2.5 rounded-sm border" style={{ backgroundColor: "var(--color-chart-primary)", borderColor: "var(--color-chart-primary)", opacity: 0.5 }} /> },
    { key: "median"  as const, label: t.boxPlotMedian,  icon: <span className="inline-block w-3.5 h-0.5 rounded" style={{ backgroundColor: "var(--color-chart-median)" }} /> },
    { key: "avg"     as const, label: t.boxPlotAvg,     icon: <span className="inline-block w-2.5 h-2.5 rotate-45" style={{ backgroundColor: "var(--color-chart-max)", border: "1.5px solid white" }} /> },
  ];

  const renderLegendHeader = (visible: BoxVisible, onToggle: (k: keyof BoxVisible) => void) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3 select-none">
      {legendItems.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-all text-[10px] ${
            visible[key]
              ? "bg-slate-100 dark:bg-slate-800 text-strong font-bold"
              : "opacity-35 text-neutral"
          }`}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral">
        <Home size={48} className="mb-3 opacity-30" />
        <p className="text-sm">조회된 실거래 데이터가 없습니다.</p>
        <p className="text-xs mt-1 text-assistive">
          필터 조건을 설정하고 분석 실행 버튼을 눌러주세요.
        </p>
      </div>
    );
  }

  // 평형 필터 적용 데이터 가공 (전용면적 기준 평수대로 구분)
  const filteredData = React.useMemo(() => {
    return data.filter((d) => {
      if (sizeFilter === "all") return true;
      const area = d.areaM2 || 0;
      if (sizeFilter === "under20") return area < 50; // 20평 미만 (50㎡ 미만)
      if (sizeFilter === "20s") return area >= 50 && area < 80; // 20평대 (50㎡ ~ 80㎡ 미만, ex: 59㎡)
      if (sizeFilter === "30s") return area >= 80 && area < 110; // 30평대 (80㎡ ~ 110㎡ 미만, ex: 84㎡)
      if (sizeFilter === "over40") return area >= 110; // 40평 이상 (110㎡ 이상, ex: 114㎡)
      return true;
    });
  }, [data, sizeFilter]);

  // 1. 통계 데이터 가공 (필터링된 데이터 기준)
  const totalCount = filteredData.length;
  const prices = filteredData.map((d) => d.priceEok);
  const avgPrice =
    totalCount > 0 ? prices.reduce((sum, p) => sum + p, 0) / totalCount : 0;
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
      const count = val.count;
      if (count === 0) {
        return {
          name: month,
          volume: 0,
          min: null,
          q1: null,
          median: null,
          q3: null,
          max: null,
          avg: null,
          whiskerRange: null,
          boxRange: null,
        };
      }
      const maxVal = Math.max(...val.prices);
      const minVal = Math.min(...val.prices);
      const sumVal = val.prices.reduce((sum, p) => sum + p, 0);
      const avgVal = sumVal / count;
      const medVal = getMedian(val.prices);
      const q1Val = getPercentile(val.prices, 0.25);
      const q3Val = getPercentile(val.prices, 0.75);

      return {
        name: month,
        volume: count,
        min: Number(minVal.toFixed(2)),
        q1: Number(q1Val.toFixed(2)),
        median: Number(medVal.toFixed(2)),
        q3: Number(q3Val.toFixed(2)),
        max: Number(maxVal.toFixed(2)),
        avg: Number(avgVal.toFixed(2)),
        whiskerRange: [
          Number(minVal.toFixed(2)),
          Number(maxVal.toFixed(2)),
        ] as [number, number],
        boxRange: [Number(q1Val.toFixed(2)), Number(q3Val.toFixed(2))] as [
          number,
          number,
        ],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 개별 실거래가 점용 데이터셋 (Scatter용 x/y 사용)
  const scatterData = filteredData
    .map((d) => ({
      x: d.dealDate.substring(0, 7),
      y: Number(d.priceEok.toFixed(2)),
      aptName: d.apartmentName,
      dealDate: d.dealDate,
      floor: d.floor,
      areaM2: d.areaM2,
    }))
    .sort((a, b) => a.x.localeCompare(b.x));

  // 3-2. 지역별 & 평형대별 실거래 피벗 매트릭스 데이터 가공
  const activeRegions = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredData.forEach((d) => {
      const rName = d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타";
      counts.set(rName, (counts.get(rName) || 0) + 1);
    });
    
    const top7Names = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name]) => name);
      
    const regionAvgPrices = top7Names.map((name) => {
      const regionTransactions = filteredData.filter(
        (d) => (d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타") === name
      );
      const avg = regionTransactions.length > 0 
        ? regionTransactions.reduce((sum, d) => sum + d.priceEok, 0) / regionTransactions.length 
        : 0;
      return { name, avg };
    });

    return regionAvgPrices
      .sort((a, b) => a.avg - b.avg)
      .map((item) => item.name);
  }, [filteredData]);

  const sizeRows = React.useMemo(() => [
    { key: "over40", label: areaUnit === "pyeong" ? "40평 이상" : "110㎡ 이상" },
    { key: "30s", label: areaUnit === "pyeong" ? "30평대" : "80㎡ ~ 110㎡" },
    { key: "20s", label: areaUnit === "pyeong" ? "20평대" : "50㎡ ~ 80㎡" },
    { key: "under20", label: areaUnit === "pyeong" ? "20평 미만" : "50㎡ 미만" },
  ], [areaUnit]);

  const pivotData = React.useMemo(() => {
    const cellMap = new Map<string, {
      prices: number[];
      complexes: Set<string>;
    }>();

    filteredData.forEach((d) => {
      const colKey = d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타";
      if (!activeRegions.includes(colKey)) return;

      const areaVal = d.areaM2 || 0;
      let rowKey = "under20";
      if (areaVal >= 50 && areaVal < 80) rowKey = "20s";
      else if (areaVal >= 80 && areaVal < 110) rowKey = "30s";
      else if (areaVal >= 110) rowKey = "over40";

      const key = `${rowKey}|${colKey}`;
      const cell = cellMap.get(key) || { prices: [], complexes: new Set<string>() };
      cell.prices.push(d.priceEok);
      if (d.apartmentName) {
        cell.complexes.add(d.apartmentName);
      }
      cellMap.set(key, cell);
    });

    const data: Record<string, {
      avg: number;
      median: number;
      min: number;
      max: number;
      count: number;
      complexesSummary: string;
    }> = {};

    let maxCount = 0;

    activeRegions.forEach((colKey) => {
      sizeRows.forEach((row) => {
        const key = `${row.key}|${colKey}`;
        const cell = cellMap.get(key);
        if (!cell || cell.prices.length === 0) {
          data[key] = { avg: 0, median: 0, min: 0, max: 0, count: 0, complexesSummary: "" };
          return;
        }

        const pricesArr = cell.prices;
        const count = pricesArr.length;
        if (count > maxCount) {
          maxCount = count;
        }

        const sum = pricesArr.reduce((s, p) => s + p, 0);
        const avg = sum / count;
        const median = getMedian(pricesArr);
        const min = Math.min(...pricesArr);
        const max = Math.max(...pricesArr);

        const complexesArr = Array.from(cell.complexes);
        const complexesSummary = complexesArr.slice(0, 2).join(", ") + 
          (complexesArr.length > 2 ? ` 외 ${complexesArr.length - 2}개` : "");

        data[key] = {
          avg: Number(avg.toFixed(2)),
          median: Number(median.toFixed(2)),
          min: Number(min.toFixed(2)),
          max: Number(max.toFixed(2)),
          count,
          complexesSummary
        };
      });
    });

    return {
      cells: data,
      maxCount
    };
  }, [filteredData, activeRegions, sizeRows]);

  // 4. 단지별 거래량 순위 (상위 10개)
  const complexDataMap = new Map<string, number>();
  filteredData.forEach((d) => {
    complexDataMap.set(
      d.apartmentName,
      (complexDataMap.get(d.apartmentName) || 0) + 1,
    );
  });

  const complexChartData = Array.from(complexDataMap.entries())
    .map(([name, count]) => ({ name, 거래수: count }))
    .sort((a, b) => b.거래수 - a.거래수)
    .slice(0, 10);

  // 5. 평형별 Box Plot 데이터 가공
  const boxPlotChartData = React.useMemo(() => {
    const pyeongGroups = [
      {
        key: "under20",
        labelPyeong: "20평 미만",
        labelM2: "50㎡ 미만",
        minArea: 0,
        maxArea: 50,
      },
      {
        key: "20s",
        labelPyeong: "20평대",
        labelM2: "50㎡ ~ 80㎡",
        minArea: 50,
        maxArea: 80,
      },
      {
        key: "30s",
        labelPyeong: "30평대",
        labelM2: "80㎡ ~ 110㎡",
        minArea: 80,
        maxArea: 110,
      },
      {
        key: "over40",
        labelPyeong: "40평 이상",
        labelM2: "110㎡ 이상",
        minArea: 110,
        maxArea: Infinity,
      },
    ];

    return pyeongGroups.map((group) => {
      const groupTransactions = data.filter((d) => {
        const area = d.areaM2 || 0;
        return area >= group.minArea && area < group.maxArea;
      });

      const count = groupTransactions.length;
      const label = areaUnit === "pyeong" ? group.labelPyeong : group.labelM2;

      if (count === 0) {
        return {
          name: label,
          min: null,
          q1: null,
          median: null,
          q3: null,
          max: null,
          avg: null,
          volume: 0,
          whiskerRange: null,
          boxRange: null,
        };
      }

      const groupPrices = groupTransactions.map((d) => d.priceEok);
      const minVal = Math.min(...groupPrices);
      const maxVal = Math.max(...groupPrices);
      const avgVal = groupPrices.reduce((sum, p) => sum + p, 0) / count;
      const medVal = getMedian(groupPrices);
      const q1Val = getPercentile(groupPrices, 0.25);
      const q3Val = getPercentile(groupPrices, 0.75);

      return {
        name: label,
        min: Number(minVal.toFixed(2)),
        q1: Number(q1Val.toFixed(2)),
        median: Number(medVal.toFixed(2)),
        q3: Number(q3Val.toFixed(2)),
        max: Number(maxVal.toFixed(2)),
        avg: Number(avgVal.toFixed(2)),
        volume: count,
        whiskerRange: [
          Number(minVal.toFixed(2)),
          Number(maxVal.toFixed(2)),
        ] as [number, number],
        boxRange: [Number(q1Val.toFixed(2)), Number(q3Val.toFixed(2))] as [
          number,
          number,
        ],
      };
    });
  }, [data, areaUnit]);

  // 6. 층별 Box Plot 데이터 가공
  const floorBoxPlotChartData = React.useMemo(() => {
    const floorGroups = [
      {
        key: "low",
        labelKey: "floorLow" as const,
        minFloor: -Infinity,
        maxFloor: 5,
      },
      { key: "mid", labelKey: "floorMid" as const, minFloor: 6, maxFloor: 15 },
      {
        key: "high",
        labelKey: "floorHigh" as const,
        minFloor: 16,
        maxFloor: 25,
      },
      {
        key: "super",
        labelKey: "floorSuper" as const,
        minFloor: 26,
        maxFloor: Infinity,
      },
    ];

    return floorGroups.map((group) => {
      const groupTransactions = data.filter((d) => {
        const floorNum = Number(d.floor);
        if (isNaN(floorNum)) return false;
        return floorNum >= group.minFloor && floorNum <= group.maxFloor;
      });

      const count = groupTransactions.length;
      const label = t[group.labelKey];

      if (count === 0) {
        return {
          name: label,
          min: null,
          q1: null,
          median: null,
          q3: null,
          max: null,
          avg: null,
          volume: 0,
          whiskerRange: null,
          boxRange: null,
        };
      }

      const groupPrices = groupTransactions.map((d) => d.priceEok);
      const minVal = Math.min(...groupPrices);
      const maxVal = Math.max(...groupPrices);
      const avgVal = groupPrices.reduce((sum, p) => sum + p, 0) / count;
      const medVal = getMedian(groupPrices);
      const q1Val = getPercentile(groupPrices, 0.25);
      const q3Val = getPercentile(groupPrices, 0.75);

      return {
        name: label,
        min: Number(minVal.toFixed(2)),
        q1: Number(q1Val.toFixed(2)),
        median: Number(medVal.toFixed(2)),
        q3: Number(q3Val.toFixed(2)),
        max: Number(maxVal.toFixed(2)),
        avg: Number(avgVal.toFixed(2)),
        volume: count,
        whiskerRange: [
          Number(minVal.toFixed(2)),
          Number(maxVal.toFixed(2)),
        ] as [number, number],
        boxRange: [Number(q1Val.toFixed(2)), Number(q3Val.toFixed(2))] as [
          number,
          number,
        ],
      };
    });
  }, [data, t]);

  // 실제 평수 기준 필터 버튼 옵션
  const sizeOptions = [
    { key: "all", label: "전체" },
    {
      key: "under20",
      label: areaUnit === "pyeong" ? "20평 미만" : "50㎡ 미만",
    },
    { key: "20s", label: areaUnit === "pyeong" ? "20평대" : "50㎡ ~ 80㎡" },
    { key: "30s", label: areaUnit === "pyeong" ? "30평대" : "80㎡ ~ 110㎡" },
    {
      key: "over40",
      label: areaUnit === "pyeong" ? "40평 이상" : "110㎡ 이상",
    },
  ] as const;

  const sizeFilterSelector = (
    <div className="flex items-center gap-0.5 rounded-lg bg-alternative p-0.5 border border-normal">
      {sizeOptions.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setSizeFilter(opt.key)}
          className={`px-2 md:px-3 py-1 text-[9px] md:text-[10px] font-bold rounded-md transition-colors ${
            sizeFilter === opt.key
              ? "bg-primary text-[var(--color-semantic-background-normal-normal)] shadow-sm"
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
      {/* 시계열 메인 차트 */}
      <SectionCard
        title="📈 월별 실거래가 & 거래량 추이"
        right={sizeFilterSelector}
      >
        {renderLegendHeader(monthlyVisible, toggleMonthly)}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monthlyChartData}
              margin={{ top: 12, right: 8, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" xAxisId="box" stroke="#64748b" fontSize={11} tickLine={false} interval="preserveStartEnd" />
              <XAxis dataKey="name" xAxisId="whisker" hide />
              <XAxis dataKey="name" xAxisId="volume" hide />
              {/* 좌측 Y축: 가격(억) */}
              <YAxis
                yAxisId="left" width={56} stroke="#64748b" fontSize={11} tickLine={false}
                tickFormatter={(v) => `${v}억`}
                domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin * 0.88)), (dataMax: number) => Math.ceil(dataMax * 1.05)]}
              />
              {/* 우측 Y축: 거래수(건) */}
              <YAxis
                yAxisId="right" orientation="right" width={40} stroke="#64748b" fontSize={11} tickLine={false}
                tickFormatter={(v) => `${v}건`}
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]}
              />
              <Tooltip content={<BoxPlotTooltip t={t} />} />
              {/* 거래량 배경 Bar */}
              <Bar yAxisId="right" xAxisId="volume" dataKey="volume"
                fill="var(--color-chart-primary)" fillOpacity={0.12}
                radius={[3, 3, 0, 0]} barSize={24}
                hide={!monthlyVisible.volume} />
              {/* Whisker (최소~최대 세로 Range Bar) */}
              <Bar yAxisId="left" xAxisId="whisker" dataKey="whiskerRange"
                fill="var(--color-semantic-label-neutral)" fillOpacity={0.5}
                barSize={2}
                hide={!monthlyVisible.whisker} />
              {/* Box (Q1~Q3 Range Bar) */}
              <Bar yAxisId="left" xAxisId="box" dataKey="boxRange"
                fill="var(--color-chart-primary)" fillOpacity={0.35}
                stroke="var(--color-chart-primary)" strokeWidth={1.5}
                barSize={14}
                hide={!monthlyVisible.box} />
              {/* 중위값 (Line dot) */}
              <Line yAxisId="left" xAxisId="box" type="monotone" dataKey="median"
                stroke="none" dot={<RenderBoxPlotMedian />} activeDot={false}
                hide={!monthlyVisible.median} />
              {/* 평균값 (Line dot) */}
              <Line yAxisId="left" xAxisId="box" type="monotone" dataKey="avg"
                stroke="none" dot={<RenderBoxPlotAvg />} activeDot={false}
                hide={!monthlyVisible.avg} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* 평형별 & 층별 박스 플롯 차트 */}
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: isNarrow ? "1fr" : "repeat(2, 1fr)" }}
      >
        {/* 평형별 Box Plot */}
        <SectionCard title={t.boxPlotTitleArea}>
          {renderLegendHeader(sizeVisible, toggleSize)}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={boxPlotChartData}
                margin={{ top: 12, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" xAxisId="box" stroke="#64748b" fontSize={11} tickLine={false} />
                <XAxis dataKey="name" xAxisId="whisker" hide />
                <XAxis dataKey="name" xAxisId="volume" hide />
                <YAxis yAxisId="left" width={56} stroke="#64748b" fontSize={11} tickLine={false}
                  tickFormatter={(v) => `${v}억`}
                  domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin * 0.88)), (dataMax: number) => Math.ceil(dataMax * 1.05)]} />
                <YAxis yAxisId="right" orientation="right" width={40} stroke="#64748b" fontSize={11} tickLine={false}
                  tickFormatter={(v) => `${v}건`}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]} />
                <Tooltip content={<BoxPlotTooltip t={t} />} />
                <Bar yAxisId="right" xAxisId="volume" dataKey="volume"
                  fill="var(--color-chart-primary)" fillOpacity={0.12}
                  radius={[3, 3, 0, 0]} barSize={40}
                  hide={!sizeVisible.volume} />
                <Bar yAxisId="left" xAxisId="whisker" dataKey="whiskerRange"
                  fill="var(--color-semantic-label-neutral)" fillOpacity={0.5}
                  barSize={2}
                  hide={!sizeVisible.whisker} />
                <Bar yAxisId="left" xAxisId="box" dataKey="boxRange"
                  fill="var(--color-chart-primary)" fillOpacity={0.35}
                  stroke="var(--color-chart-primary)" strokeWidth={1.5}
                  barSize={22}
                  hide={!sizeVisible.box} />
                <Line yAxisId="left" xAxisId="box" type="monotone" dataKey="median"
                  stroke="none" dot={<RenderBoxPlotMedian />} activeDot={false}
                  hide={!sizeVisible.median} />
                <Line yAxisId="left" xAxisId="box" type="monotone" dataKey="avg"
                  stroke="none" dot={<RenderBoxPlotAvg />} activeDot={false}
                  hide={!sizeVisible.avg} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* 층별 Box Plot */}
        <SectionCard title={t.boxPlotTitleFloor}>
          {renderLegendHeader(floorVisible, toggleFloor)}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={floorBoxPlotChartData}
                margin={{ top: 12, right: 8, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" xAxisId="box" stroke="#64748b" fontSize={11} tickLine={false} />
                <XAxis dataKey="name" xAxisId="whisker" hide />
                <XAxis dataKey="name" xAxisId="volume" hide />
                <YAxis yAxisId="left" width={56} stroke="#64748b" fontSize={11} tickLine={false}
                  tickFormatter={(v) => `${v}억`}
                  domain={[(dataMin: number) => Math.max(0, Math.floor(dataMin * 0.88)), (dataMax: number) => Math.ceil(dataMax * 1.05)]} />
                <YAxis yAxisId="right" orientation="right" width={40} stroke="#64748b" fontSize={11} tickLine={false}
                  tickFormatter={(v) => `${v}건`}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.3)]} />
                <Tooltip content={<BoxPlotTooltip t={t} />} />
                <Bar yAxisId="right" xAxisId="volume" dataKey="volume"
                  fill="var(--color-chart-primary)" fillOpacity={0.12}
                  radius={[3, 3, 0, 0]} barSize={40}
                  hide={!floorVisible.volume} />
                <Bar yAxisId="left" xAxisId="whisker" dataKey="whiskerRange"
                  fill="var(--color-semantic-label-neutral)" fillOpacity={0.5}
                  barSize={2}
                  hide={!floorVisible.whisker} />
                <Bar yAxisId="left" xAxisId="box" dataKey="boxRange"
                  fill="var(--color-chart-primary)" fillOpacity={0.35}
                  stroke="var(--color-chart-primary)" strokeWidth={1.5}
                  barSize={22}
                  hide={!floorVisible.box} />
                <Line yAxisId="left" xAxisId="box" type="monotone" dataKey="median"
                  stroke="none" dot={<RenderBoxPlotMedian />} activeDot={false}
                  hide={!floorVisible.median} />
                <Line yAxisId="left" xAxisId="box" type="monotone" dataKey="avg"
                  stroke="none" dot={<RenderBoxPlotAvg />} activeDot={false}
                  hide={!floorVisible.avg} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* 지역별·평형대별 실거래 요약 매트릭스 (피벗 시트) */}
      <SectionCard 
        title={t.pivotTableTitle}
        subtitle={t.pivotTableLegend}
      >
        <div className="w-full overflow-x-auto scrollbar-thin mt-4">
          <div className="min-w-[800px] p-1">
            {/* 헤더 행 */}
            <div 
              className="grid gap-2 mb-2 items-center text-center font-bold text-xs text-neutral"
              style={{ gridTemplateColumns: `150px repeat(${activeRegions.length}, 1fr)` }}
            >
              <div className="text-left pl-2">구분</div>
              {activeRegions.map((region) => (
                <div key={region} className="py-2 bg-alternative rounded-lg border border-normal truncate px-1">
                  {region}
                </div>
              ))}
            </div>

            {/* 데이터 행들 */}
            <div className="space-y-2">
              {sizeRows.map((row) => (
                <div 
                  key={row.key}
                  className="grid gap-2 items-center text-center"
                  style={{ gridTemplateColumns: `150px repeat(${activeRegions.length}, 1fr)` }}
                >
                  {/* 행 라벨 (평형대) */}
                  <div className="text-left font-bold text-xs text-strong pl-2">
                    {row.label}
                  </div>

                  {/* 지역별 셀 */}
                  {activeRegions.map((colKey, colIdx) => {
                    const cellKey = `${row.key}|${colKey}`;
                    const cell = pivotData.cells[cellKey];
                    const hasData = cell && cell.count > 0;
                    
                    if (!hasData) {
                      return (
                        <div 
                          key={colKey}
                          className="h-20 flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800/20 text-slate-400 dark:text-slate-600 text-xs"
                        >
                          -
                        </div>
                      );
                    }

                    // 거래량 비례 투명도 계산 (최대 거래량 대비 백분율, 최소 10% ~ 최대 100%)
                    const percent = Math.min(100, Math.max(10, Math.round((cell.count / pivotData.maxCount) * 100)));
                    const tooltipLabel = `${colKey} (${row.label})`;

                    return (
                      <div 
                        key={colKey}
                        className="flex flex-col justify-center items-center h-20 p-2 rounded-lg border border-normal transition-all hover:scale-[1.02] hover:shadow-md cursor-help select-none"
                        style={{ 
                          backgroundColor: `color-mix(in srgb, var(--color-chart-primary) ${percent}%, transparent)` 
                        }}
                        onMouseEnter={(e) => handleCellMouseEnter(e, cell, tooltipLabel)}
                        onMouseLeave={handleCellMouseLeave}
                      >
                        {/* 평균 거래가격 */}
                        <span className="text-sm font-extrabold text-strong">
                          {cell.avg}억
                        </span>
                        {/* 거래 건수 */}
                        <span className="text-[10px] text-neutral mt-0.5 font-medium">
                          {cell.count}건 거래
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 피벗 툴팁 (fixed, viewport 기준 React Portal 렌더링) */}
      {pivotTooltip?.visible && createPortal(
        <div
          className="fixed z-[9999] w-52 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-normal shadow-2xl text-left text-[11px] space-y-1.5 pointer-events-none opacity-100"
          style={{
            left: Math.max(110, Math.min(pivotTooltip.x, window.innerWidth - 110)),
            top: pivotTooltip.direction === "down" ? pivotTooltip.y : undefined,
            bottom: pivotTooltip.direction === "up" ? (window.innerHeight - pivotTooltip.y) : undefined,
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-extrabold text-strong text-center border-b border-normal pb-1.5 mb-1 text-[12px] truncate">
            {pivotTooltip.label}
          </p>
          <div className="flex justify-between gap-3">
            <span className="text-neutral">평균 가격:</span>
            <span className="font-bold text-primary">{pivotTooltip.cell.avg}억 원</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-neutral">중위 가격:</span>
            <span className="font-bold text-strong">{pivotTooltip.cell.median}억 원</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-neutral">실거래 범위:</span>
            <span className="font-bold text-strong">{pivotTooltip.cell.min}억 ~ {pivotTooltip.cell.max}억</span>
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

      {/* 거래 상위 10개 단지 (단독 1단 넓은 카드로 재배치) */}
      <SectionCard title="🏢 거래가 활발한 아파트 단지 (상위 10개)">
        {/* 커스텀 범례 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--color-chart-accent)" }}
            />
            <span className="text-xs text-neutral">거래수</span>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={complexChartData}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                interval="preserveStartEnd"
                domain={[
                  (dataMin) => Math.max(0, Math.floor(dataMin * 0.9)),
                  "auto",
                ]}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                width={120}
              />
              <Tooltip contentStyle={tooltipContentStyle} />
              <Bar
                dataKey="거래수"
                fill="var(--color-chart-accent)"
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
  );
}
