import type { GraphFilter, GraphPreset } from "@myhome/shared";

export interface FilterPanelProps {
  filter: GraphFilter;
  regionName: string;
  onFilterChange: (filter: GraphFilter, regionName: string) => void;
  onApply: (appliedFilter: GraphFilter) => void;
  /** true이면 단지명·평형 필터 UI 숨김 (종합 현황 모드) */
  hideComplexSearch?: boolean;
  locale?: "ko" | "en";
}

export interface PresetItem {
  id: string;
  name: string;
  filter: GraphFilter;
  regionName?: string;
  createdAt: string;
}
