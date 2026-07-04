import { promises as fs } from "node:fs";
import { join } from "node:path";
import { Insight } from "@myhome/shared";

const DATA_DIR = join(process.cwd(), "data");
const INSIGHTS_FILE = join(DATA_DIR, "insights.json");

async function ensureFileExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(INSIGHTS_FILE);
  } catch {
    await fs.writeFile(INSIGHTS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export async function readInsights(): Promise<Insight[]> {
  await ensureFileExists();
  const data = await fs.readFile(INSIGHTS_FILE, "utf-8");
  try {
    return JSON.parse(data) as Insight[];
  } catch {
    return [];
  }
}

export async function saveInsight(insight: Omit<Insight, "id" | "createdAt">): Promise<Insight> {
  const insights = await readInsights();
  const newInsight: Insight = {
    ...insight,
    id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  insights.push(newInsight);
  await fs.writeFile(INSIGHTS_FILE, JSON.stringify(insights, null, 2), "utf-8");
  return newInsight;
}

export async function deleteInsight(id: string): Promise<boolean> {
  const insights = await readInsights();
  const filtered = insights.filter((i) => i.id !== id);
  if (insights.length === filtered.length) return false;
  await fs.writeFile(INSIGHTS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}
