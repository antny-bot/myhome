import { promises as fs } from "node:fs";
import { join } from "node:path";
import { GraphPreset } from "@myhome/shared";

const DATA_DIR = join(process.cwd(), "data");
const PRESETS_FILE = join(DATA_DIR, "graph-presets.json");

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(PRESETS_FILE);
  } catch {
    await fs.writeFile(PRESETS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export async function readPresets(): Promise<GraphPreset[]> {
  await ensureFileExists();
  const data = await fs.readFile(PRESETS_FILE, "utf-8");
  try {
    return JSON.parse(data) as GraphPreset[];
  } catch {
    return [];
  }
}

export async function savePreset(preset: Omit<GraphPreset, "id" | "createdAt">): Promise<GraphPreset> {
  const presets = await readPresets();
  const newPreset: GraphPreset = {
    ...preset,
    id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  presets.push(newPreset);
  await fs.writeFile(PRESETS_FILE, JSON.stringify(presets, null, 2), "utf-8");
  return newPreset;
}

export async function deletePreset(id: string): Promise<boolean> {
  const presets = await readPresets();
  const filtered = presets.filter((p) => p.id !== id);
  if (presets.length === filtered.length) return false;
  await fs.writeFile(PRESETS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}
