import { useLocale } from "../../../lib/i18n.js";
import { ChartStatTooltip, CHART_THEME } from "../../../components/charts/index.js";

interface BoxPlotTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const formatEok = (value: number | null | undefined) =>
  value !== null && value !== undefined ? `${value.toFixed(1)} 억` : "-";

/**
 * 박스플롯(월별 추이 · 단지 비교) 공통 툴팁.
 * ChartTooltip 계열의 ChartStatTooltip 으로 통일된 표면/타이포를 사용한다.
 */
export function BoxPlotTooltip({ active, payload, label }: BoxPlotTooltipProps) {
  const { t } = useLocale();

  if (!active || !payload || payload.length === 0) return null;

  const metaRecord = payload[0]?.payload;
  if (!metaRecord) return null;

  const { min, q1, median, q3, max, avg, volume } = metaRecord;

  return (
    <ChartStatTooltip
      title={metaRecord.name || label}
      subtitle={metaRecord.지역 ? `${t.region || "지역"}: ${metaRecord.지역}` : undefined}
      rows={[
        {
          label: t.recordCount || "거래 건수",
          value: `${volume ?? metaRecord.거래수 ?? 0} 건`,
        },
        {
          label: `${t.maxPriceLabelText || "최고가"} (Max)`,
          value: formatEok(max),
          color: CHART_THEME.max,
        },
        { label: "Q3 (75%)", value: formatEok(q3), color: CHART_THEME.median },
        {
          label: `${t.averagePrice || "평균 거래가"} (Avg)`,
          value: formatEok(avg),
          color: CHART_THEME.primary,
        },
        {
          label: t.medianPrice || "중위값",
          value: formatEok(median),
          color: CHART_THEME.median,
        },
        { label: "Q1 (25%)", value: formatEok(q1), color: CHART_THEME.median },
        {
          label: `${t.minPriceLabelText || "최저가"} (Min)`,
          value: formatEok(min),
          color: CHART_THEME.min,
        },
      ]}
    />
  );
}
