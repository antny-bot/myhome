import { promises as fs } from "node:fs";
import { join } from "node:path";
import { GraphPreset } from "@myhome/shared";
import {
  getPresetsByEmail,
  savePresetDb,
  deletePresetDb
} from "@myhome/shared";

const DATA_DIR = join(process.cwd(), "data");
const PRESETS_FILE = join(DATA_DIR, "graph-presets.json");
const BACKUP_FILE = join(DATA_DIR, "graph-presets.json.bak");

const DEFAULT_EMAIL = "bootstrap-admin@myhome.local";

// 기존 JSON 파일 존재 시 SQLite DB로 1회 마이그레이션 수행
export async function migratePresetsToDb() {
  try {
    const raw = await fs.readFile(PRESETS_FILE, "utf-8");
    console.log("[Migration] Found legacy graph-presets.json. Starting migration to SQLite DB...");
    const presets = JSON.parse(raw) as GraphPreset[];

    if (Array.isArray(presets)) {
      for (const preset of presets) {
        savePresetDb(DEFAULT_EMAIL, preset);
      }
    }

    await fs.rename(PRESETS_FILE, BACKUP_FILE);
    console.log(`[Migration] Successfully migrated legacy presets to SQLite. Backed up to: ${BACKUP_FILE}`);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      // 파일이 없는 경우 정상
    } else {
      console.error("[Migration] Error migrating legacy presets to SQLite:", err);
    }
  }
}

// 기동 시 마이그레이션 비동기 실행
void migratePresetsToDb();

export async function readPresets(email: string = DEFAULT_EMAIL): Promise<GraphPreset[]> {
  return getPresetsByEmail(email);
}

export async function savePreset(preset: Omit<GraphPreset, "id" | "createdAt">, email: string = DEFAULT_EMAIL): Promise<GraphPreset> {
  const newPreset: GraphPreset = {
    ...preset,
    id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  savePresetDb(email, newPreset);
  return newPreset;
}

export async function deletePreset(id: string, email: string = DEFAULT_EMAIL): Promise<boolean> {
  return deletePresetDb(email, id);
}
