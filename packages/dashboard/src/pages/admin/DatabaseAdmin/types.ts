export interface SchemaInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export interface QueryResult {
  type: "select" | "write";
  rows?: Record<string, any>[];
  changes?: number;
  lastInsertRowid?: number | string;
}

export interface GeocodeStats {
  total: number;
  geocoded: number;
  pending: number;
}

export interface BatchProgress {
  processed: number;
  total: number;
  success: number;
  failed: number;
  failures: { name: string; query: string; reason: string }[];
  isPaused?: boolean;
}
