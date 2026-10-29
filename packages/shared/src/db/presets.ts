import { getDb, getPreparedStatement } from "./connection.js";
import { getUserSettings, saveUserSettings } from "./auth.js";
import type { GraphPreset } from "../types.js";

export interface OverviewPreset {
  id: string;
  name: string;
  filter: Record<string, unknown>;
  createdAt: string;
}

export interface AnalysisPreset {
  id: string;
  name: string;
  regionName: string;
  buildingName: string;
  areaM2?: number | null;
  areaMaxM2?: number | null;
  createdAt: string;
}

interface GraphPresetRow {
  id: string;
  name: string;
  filter: string;
  createdAt: string;
}

export function getPresetsByEmail(email: string): GraphPreset[] {
  const rows = getPreparedStatement(`
    SELECT id, name, filter_data AS filter, created_at AS createdAt
    FROM graph_presets
    WHERE user_email = ?
    ORDER BY created_at DESC
  `).all(email) as unknown as GraphPresetRow[];

  return rows.map((r) => {
    let filter = {};
    try {
      filter = JSON.parse(r.filter);
    } catch {
      filter = {};
    }
    return {
      id: r.id,
      name: r.name,
      filter,
      createdAt: r.createdAt,
    };
  });
}

export function savePresetDb(email: string, preset: { id: string; name: string; filter: unknown; createdAt?: string }): void {
  const now = new Date().toISOString();

  const user = getUserSettings(email);
  if (!user) {
    saveUserSettings(email, {});
  }

  const filterStr = JSON.stringify(preset.filter || {});

  getPreparedStatement(`
    INSERT INTO graph_presets (id, user_email, name, filter_data, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      filter_data = excluded.filter_data
  `).run(preset.id, email, preset.name, filterStr, preset.createdAt || now);
}

interface OverviewRow {
  id: string;
  name: string;
  filter: string;
  createdAt: string;
}

interface AnalysisRow {
  id: string;
  name: string;
  regionName: string;
  buildingName: string;
  areaM2: number | null;
  areaMaxM2: number | null;
  createdAt: string;
}

export function readPresetsCore(email: string, type: 'overview'): OverviewPreset[];
export function readPresetsCore(email: string, type: 'analysis'): AnalysisPreset[];
export function readPresetsCore(email: string, type: 'overview' | 'analysis'): (OverviewPreset | AnalysisPreset)[];
export function readPresetsCore(email: string, type: 'overview' | 'analysis'): (OverviewPreset | AnalysisPreset)[] {
  const db = getDb();
  if (type === 'overview') {
    const rows = db.prepare(`SELECT id, name, filter_data AS filter, created_at AS createdAt FROM graph_presets_overview WHERE user_email = ? ORDER BY created_at DESC`).all(email) as unknown as OverviewRow[];
    return rows.map((r) => {
      let filter = {};
      try {
        filter = JSON.parse(r.filter);
      } catch {
        filter = {};
      }
      return { id: r.id, name: r.name, filter, createdAt: r.createdAt };
    });
  } else {
    const rows = db.prepare(`SELECT id, name, region_name AS regionName, building_name AS buildingName, area_m2 AS areaM2, area_max_m2 AS areaMaxM2, created_at AS createdAt FROM graph_presets_analysis WHERE user_email = ? ORDER BY created_at DESC`).all(email) as unknown as AnalysisRow[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      regionName: r.regionName,
      buildingName: r.buildingName,
      areaM2: r.areaM2,
      areaMaxM2: r.areaMaxM2,
      createdAt: r.createdAt
    })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
}

export interface SavePresetInput {
  id?: string;
  name: string;
  filter?: unknown;
  regionName?: string;
  buildingName?: string;
  areaM2?: number | null;
  areaMaxM2?: number | null;
  createdAt?: string;
}

export function savePresetCore(preset: SavePresetInput, email: string, type: 'overview'): OverviewPreset;
export function savePresetCore(preset: SavePresetInput, email: string, type: 'analysis'): AnalysisPreset;
export function savePresetCore(preset: SavePresetInput, email: string, type: 'overview' | 'analysis'): OverviewPreset | AnalysisPreset;
export function savePresetCore(preset: SavePresetInput, email: string, type: 'overview' | 'analysis'): OverviewPreset | AnalysisPreset {
  const db = getDb();
  const now = new Date().toISOString();
  const id = preset.id ?? `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const user = getUserSettings(email);
  if (!user) {
    saveUserSettings(email, {});
  }

  if (type === 'overview') {
    const filterStr = JSON.stringify(preset.filter || {});
    const stmt = db.prepare(`INSERT INTO graph_presets_overview (id, user_email, name, filter_data, created_at) VALUES (?, ?, ?, ?, ?) 
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name, 
        filter_data = excluded.filter_data`);
    stmt.run(id, email, preset.name, filterStr, preset.createdAt || now);
    return { id, name: preset.name, filter: (preset.filter as Record<string, unknown>) || {}, createdAt: preset.createdAt || now };
  } else {
    const stmt = db.prepare(`INSERT INTO graph_presets_analysis (id, user_email, name, region_name, building_name, area_m2, area_max_m2, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
      ON CONFLICT(id) DO UPDATE SET 
        name = excluded.name, 
        region_name = excluded.region_name, 
        building_name = excluded.building_name, 
        area_m2 = excluded.area_m2, 
        area_max_m2 = excluded.area_max_m2`);
    stmt.run(id, email, preset.name, preset.regionName || "", preset.buildingName || "", preset.areaM2 ?? null, preset.areaMaxM2 ?? null, preset.createdAt || now);
    return {
      id,
      name: preset.name,
      regionName: preset.regionName || "",
      buildingName: preset.buildingName || "",
      areaM2: preset.areaM2 ?? null,
      areaMaxM2: preset.areaMaxM2 ?? null,
      createdAt: preset.createdAt || now
    };
  }
}

export function deletePresetCore(id: string, email: string, type: 'overview' | 'analysis'): boolean {
  const db = getDb();
  const table = type === 'overview' ? 'graph_presets_overview' : 'graph_presets_analysis';
  const info = db.prepare(`DELETE FROM ${table} WHERE id = ? AND user_email = ?`).run(id, email);
  return info.changes > 0;
}
