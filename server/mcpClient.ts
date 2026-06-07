import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import type { McpPriceResult, RegionCodeResult } from "./types.js";

function getMcporterCommand(args: string[]) {
  if (process.platform !== "win32") {
    return { command: "mcporter", args };
  }

  const appData = process.env.APPDATA;
  const cliPath = appData ? path.join(appData, "npm", "node_modules", "mcporter", "dist", "cli.js") : "";
  if (cliPath && existsSync(cliPath)) {
    return { command: process.execPath, args: [cliPath, ...args] };
  }

  return { command: "cmd.exe", args: ["/d", "/s", "/c", "mcporter.cmd", ...args] };
}

async function runMcporter(toolName: string, args: Record<string, string>): Promise<unknown> {
  const output = await new Promise<string>((resolve, reject) => {
    const namedArgs = Object.entries(args).map(([key, value]) => `${key}=${value}`);
    const invocation = getMcporterCommand(["call", toolName, ...namedArgs, "--output", "json"]);
    const child = spawn(invocation.command, invocation.args, { shell: false });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim() || `mcporter exited with ${code}`));
    });
  });

  if (!output) return {};
  try {
    return JSON.parse(output);
  } catch {
    return { text: output };
  }
}

function findFirstStringByKey(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKey(item, keys);
      if (found) return found;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const item = record[key];
    if (typeof item === "string" && item.trim()) return item.trim();
    if (typeof item === "number") return String(item);
  }
  for (const item of Object.values(record)) {
    const found = findFirstStringByKey(item, keys);
    if (found) return found;
  }
  return undefined;
}

function findTransactionArray(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value;

  const record = value as Record<string, unknown>;
  const preferredKeys = ["transactions", "deals", "items", "data", "results", "aptTrades"];
  for (const key of preferredKeys) {
    const item = record[key];
    if (Array.isArray(item)) return item;
  }

  for (const item of Object.values(record)) {
    const found = findTransactionArray(item);
    if (found.length > 0) return found;
  }
  return [];
}

export async function getRegionCode(regionName: string): Promise<RegionCodeResult> {
  const candidates = Array.from(
    new Set([
      regionName,
      regionName
        .replace(/^(서울특별시|서울시|경기도|인천광역시|부산광역시|대구광역시|광주광역시|대전광역시|울산광역시|세종특별자치시)\s+/, "")
        .trim(),
      regionName.trim().split(/\s+/).at(-1) ?? regionName
    ])
  ).filter(Boolean);

  let raw: unknown = {};
  let displayQuery = regionName;
  for (const candidate of candidates) {
    raw = await runMcporter("mcp-gateway.AptInfo-get_region_code", { region_name: candidate });
    if (findFirstStringByKey(raw, ["regionCode", "sidoCode", "sido_code", "lawdCode", "lawd_cd"])) {
      displayQuery = candidate;
      break;
    }
  }

  const sidoCode = findFirstStringByKey(raw, ["sidoCode", "sido_code"]);
  const sggCode = findFirstStringByKey(raw, ["sggCode", "sgg_code"]);
  const lawdCode = findFirstStringByKey(raw, ["lawdCode", "lawd_cd", "sgg_code_full", "regionCode"]);
  const displayName =
    findFirstStringByKey(raw, ["regionName", "fullName", "address", "name", "shortName"]) ?? displayQuery;

  if (lawdCode && lawdCode.length >= 5) {
    return { lawdCode: lawdCode.slice(0, 5), displayName, raw };
  }
  if (!sidoCode || !sggCode) {
    throw new Error(`지역코드를 찾지 못했습니다. 예: "분당구" 또는 "경기도 성남시 분당구"처럼 입력해 주세요. 입력값: ${regionName}`);
  }
  return { lawdCode: `${sidoCode}${sggCode}`.slice(0, 5), displayName, raw };
}

export async function getApartmentPrices(lawdCode: string, dealMonth: string): Promise<McpPriceResult> {
  const raw = await runMcporter("mcp-gateway.AptInfo-get_apt_price", { lawd_cd: lawdCode, deal_ymd: dealMonth });
  return { transactions: findTransactionArray(raw), raw };
}

export async function getApartmentList(lawdCode: string, dealMonth: string): Promise<string[]> {
  const raw = await runMcporter("mcp-gateway.AptInfo-get_apt_list", { lawd_cd: lawdCode, deal_ymd: dealMonth });
  const transactions = findTransactionArray(raw);
  const names = transactions.map(item => {
    if (typeof item === 'object' && item !== null) {
      return findFirstStringByKey(item, ["apartmentName", "aptName", "아파트", "아파트명", "name"]);
    }
    return null;
  }).filter((name): name is string => !!name);
  return Array.from(new Set(names)).sort();
}
