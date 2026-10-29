export const LOCAL_STORAGE_KEY_REGION = "myhome_recent_map_region";

export interface RegionMapPageProps {
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: { regionName: string; regionCode?: string; apartmentKeywords: string[] }) => void;
}

export type SortOption = "txCount" | "latestDeal" | "priceHigh" | "priceLow" | "name";
