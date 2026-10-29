import type { ComplexMetaFilter } from "@myhome/shared";

export interface ComplexTabProps {
  initialComplexName?: string;
  lawdCode?: string;
  areaUnit?: "pyeong" | "m2";
  areaType?: "supply" | "dedicated";
  startDate?: string;
  endDate?: string;
  metaFilter?: ComplexMetaFilter;
}

export interface ComplexMetrics {
  totalCount: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  avgPpy: number;
  latestPrice?: number;
  latestDate?: string;
}

export interface AreaGroup {
  key: string;
  areaM2: number;
  pyeong: number;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}
