export interface NearbyComplex {
  name: string;
  lawdCode: string;
  regionName: string;
  lat: number;
  lng: number;
  distanceM: number;
  dongName: string | null;
  jibun: string | null;
  hasDbData?: boolean;
}

export interface LiveNearbyComplex {
  name: string;
  lawdCode: string;
  regionName: string;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  dongName: string | null;
  jibun: string | null;
  hasDbData: boolean;
}

export interface FetchResult {
  ok: boolean;
  complexName: string;
  inserted: number;
  months: string[];
  alreadyCached: string[];
}

export interface NearbyStationTabProps {
  onSelectComplex: (complexName: string, lawdCode?: string) => void;
  onNavigateToRules?: (initData: {
    regionName: string;
    regionCode?: string;
    apartmentKeywords: string[];
  }) => void;
  hideHeader?: boolean;
}

export interface StationData {
  name: string;
  lat: number;
  lng: number;
  line?: string;
}
