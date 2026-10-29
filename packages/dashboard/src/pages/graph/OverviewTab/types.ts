export interface OverviewTabProps {
  data: any[]; // searchTransactions 결과
  onSelectComplex?: (complexName: string, lawdCode?: string) => void;
  areaUnit?: "pyeong" | "m2";
  areaType?: "supply" | "dedicated";
  locale?: "ko" | "en";
  startDate?: string;
  endDate?: string;
}

export interface KpiSummary {
  totalTrades: number;
  avgPriceEok: number;
  maxPriceEok: number;
  minPriceEok: number;
  avgPpyEok: number;
  recentAvgPriceEok?: number;
  priceChangePercent?: number;
}
