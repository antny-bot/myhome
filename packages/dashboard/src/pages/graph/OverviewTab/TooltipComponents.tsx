import { useLocale } from "../../../lib/i18n.js";

interface BoxPlotTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  t?: any;
}

export function BoxPlotTooltip({ active, payload, label }: BoxPlotTooltipProps) {
  const { t } = useLocale();

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
            <span>{t?.recordCount || "거래 건수"}:</span>
            <span className="font-bold text-strong">{volume} 건</span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-max)" }}
          >
            <span>{t?.maxPriceLabelText || "최고가"} (Max):</span>
            <span className="font-bold">
              {max !== null && max !== undefined ? `${max.toFixed(1)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-median)" }}
          >
            <span>Q3 (75%):</span>
            <span className="font-bold">
              {q3 !== null && q3 !== undefined ? `${q3.toFixed(1)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-primary)" }}
          >
            <span>{t?.averagePrice || "평균 거래가"} (Avg):</span>
            <span className="font-bold">
              {avg !== null && avg !== undefined ? `${avg.toFixed(1)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-median)" }}
          >
            <span>{t?.medianPrice || "중위값"}:</span>
            <span className="font-bold">
              {median !== null && median !== undefined ? `${median.toFixed(1)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-median)" }}
          >
            <span>Q1 (25%):</span>
            <span className="font-bold">
              {q1 !== null && q1 !== undefined ? `${q1.toFixed(1)} 억` : "-"}
            </span>
          </p>
          <p
            className="flex justify-between gap-4"
            style={{ color: "var(--color-chart-min)" }}
          >
            <span>{t?.minPriceLabelText || "최저가"} (Min):</span>
            <span className="font-bold">
              {min !== null && min !== undefined ? `${min.toFixed(1)} 억` : "-"}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const metaRecord = payload.find(
      (p: any) =>
        p.dataKey === "최대가" ||
        p.dataKey === "최소가" ||
        p.dataKey === "거래량"
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
              <span className="font-bold">{maxVal.toFixed(1)} 억</span>
            </p>
          )}
          {avgVal !== undefined && (
            <p
              className="flex justify-between gap-4"
              style={{ color: "var(--color-chart-primary)" }}
            >
              <span>평균가:</span>
              <span className="font-bold">{avgVal.toFixed(1)} 억</span>
            </p>
          )}
          {medVal !== undefined && (
            <p
              className="flex justify-between gap-4"
              style={{ color: "var(--color-chart-median)" }}
            >
              <span>중위값:</span>
              <span className="font-bold">{medVal.toFixed(1)} 억</span>
            </p>
          )}
          {minVal !== undefined && (
            <p
              className="flex justify-between gap-4"
              style={{ color: "var(--color-chart-min)" }}
            >
              <span>최저가:</span>
              <span className="font-bold">{minVal.toFixed(1)} 억</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export function ComplexBarTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-normal bg-elevated p-3.5 shadow-xl text-xs space-y-2 min-w-[180px] pointer-events-none">
        <p className="font-black text-strong border-b border-normal pb-1.5 mb-1.5 text-[13px] truncate">
          {d.name}
        </p>
        {d.지역 && (
          <p className="text-[10px] text-assistive font-bold -mt-1">
            지역: {d.지역}
          </p>
        )}
        <div className="space-y-1.5 pt-1">
          <p className="flex justify-between gap-4 text-neutral">
            <span>총 거래수:</span>
            <span className="font-bold text-strong tabular-nums">{d.거래수}건</span>
          </p>
          <p className="flex justify-between gap-4" style={{ color: "var(--color-chart-accent)" }}>
            <span>평균 거래가:</span>
            <span className="font-bold tabular-nums">{d.평균가}억</span>
          </p>
          {d.최고가 !== undefined && (
            <p className="flex justify-between gap-4" style={{ color: "var(--color-chart-max)" }}>
              <span>최고 실거래가:</span>
              <span className="font-bold tabular-nums">{d.최고가}억</span>
            </p>
          )}
          {d.최저가 !== undefined && (
            <p className="flex justify-between gap-4" style={{ color: "var(--color-chart-min)" }}>
              <span>최저 실거래가:</span>
              <span className="font-bold tabular-nums">{d.최저가}억</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
}
