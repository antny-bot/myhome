export type TransactionNode = {
  dedupeKey: string;
  dealDate: string;
  priceEok: number;
  areaM2?: number;
  floor?: number;
};

export type RegionInfo = {
  lawdCode: string;
  displayName: string;
};

export type TrendPoint = {
  month: string;
  avgPriceEok: number;
  count: number;
};

export type GraphStats = {
  regions: number;
  complexes: number;
  transactions: number;
};

export type GraphNode = {
  id: string;
  type: 'Region' | 'Complex' | 'Transaction';
  label: string;
  val?: number;
};

export type GraphLink = {
  source: string;
  target: string;
  type: string;
};

export type GraphTopologyData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type GraphFilter = {
  startDate?: string;
  endDate?: string;
  lawdCode?: string;
  regionName?: string;
  complexName?: string;
  minArea?: number;
  maxArea?: number;
};

export type GraphPreset = {
  id: string;
  name: string;
  filter: GraphFilter;
  createdAt: string;
};

export type Insight = {
  id: string;
  title: string;
  filter: GraphFilter;
  promptTemplate: string;
  generatedPrompt: string;
  response?: string;
  source: 'manual' | 'api';
  createdAt: string;
};
