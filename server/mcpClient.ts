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

type RegionEntry = {
  sidoCode?: string;
  sggCode?: string;
  umdCode?: string;
  fullName?: string;
  shortName?: string;
};

function extractRegionEntries(value: unknown): RegionEntry[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.regions)) return record.regions as RegionEntry[];
  for (const item of Object.values(record)) {
    const found = extractRegionEntries(item);
    if (found.length > 0) return found;
  }
  return [];
}

function districtNameFromFullName(fullName?: string): string | undefined {
  if (!fullName) return undefined;
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : fullName;
}

/**
 * MCP get_region_code가 돌려주는 동 단위 regions 배열을 시/군/구 단위로 묶는다.
 * 동(umdCode !== "000")이 하나도 속하지 않은 코드는 실거래가 API의 lawd_cd로 쓸 수 없는
 * 상위(부모) 코드이므로 제외한다 (예: 자치구로 나뉜 "수원시" 자체의 코드 41110).
 */
function groupRegionsByDistrict(regions: RegionEntry[]): RegionCodeResult[] {
  type Group = { hasDong: boolean; districtName?: string; sample?: RegionEntry };
  const groups = new Map<string, Group>();
  const order: string[] = [];

  for (const entry of regions) {
    if (!entry.sidoCode || !entry.sggCode) continue;
    const lawdCode = `${entry.sidoCode}${entry.sggCode}`;
    let group = groups.get(lawdCode);
    if (!group) {
      group = { hasDong: false };
      groups.set(lawdCode, group);
      order.push(lawdCode);
    }
    if (entry.umdCode === "000") {
      group.districtName = entry.fullName;
    } else {
      group.hasDong = true;
      group.sample ??= entry;
    }
  }

  const results: RegionCodeResult[] = [];
  for (const lawdCode of order) {
    const group = groups.get(lawdCode)!;
    if (!group.hasDong) continue;
    const displayName = group.districtName ?? districtNameFromFullName(group.sample?.fullName);
    if (!displayName) continue;
    results.push({ lawdCode, displayName, raw: group.sample ?? null });
  }
  return results;
}

async function fetchRegionCandidates(regionName: string): Promise<RegionCodeResult[]> {
  const candidates = Array.from(
    new Set([
      regionName,
      regionName
        .replace(/^(서울특별시|서울시|경기도|인천광역시|부산광역시|대구광역시|광주광역시|대전광역시|울산광역시|세종특별자치시)\s+/, "")
        .trim(),
      regionName.trim().split(/\s+/).at(-1) ?? regionName
    ])
  ).filter(Boolean);

  for (const candidate of candidates) {
    const raw = await runMcporter("mcp-gateway.AptInfo-get_region_code", { region_name: candidate });
    const entries = extractRegionEntries(raw);
    if (entries.length === 0) continue;
    const grouped = groupRegionsByDistrict(entries);
    if (grouped.length > 0) return grouped;
  }
  return [];
}

/**
 * 입력어에 매칭되는 시/군/구 단위 후보를 모두 반환한다 (지역 검색 narrowing용).
 */
export async function searchRegionCandidates(regionName: string): Promise<RegionCodeResult[]> {
  return fetchRegionCandidates(regionName);
}

export async function getRegionCode(regionName: string): Promise<RegionCodeResult> {
  const candidates = await fetchRegionCandidates(regionName);
  if (candidates.length === 0) {
    throw new Error(`지역코드를 찾지 못했습니다. 예: "분당구" 또는 "경기도 성남시 분당구"처럼 입력해 주세요. 입력값: ${regionName}`);
  }
  const trimmed = regionName.trim();
  return candidates.find(candidate => candidate.displayName === trimmed) ?? candidates[0];
}

export async function getApartmentPrices(lawdCode: string, dealMonth: string): Promise<McpPriceResult> {
  const raw = await runMcporter("mcp-gateway.AptInfo-get_apt_price", { lawd_cd: lawdCode, deal_ymd: dealMonth });
  return { transactions: findTransactionArray(raw), raw };
}

export async function getApartmentList(lawdCode: string): Promise<string[]> {
  const pageSize = 50;
  const maxPages = 40;
  const names = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const raw = await runMcporter("mcp-gateway.AptInfo-get_apt_list", {
      sgg_code: lawdCode,
      page: String(page),
      size: String(pageSize)
    });
    const transactions = findTransactionArray(raw);
    for (const item of transactions) {
      if (typeof item === "object" && item !== null) {
        const name = findFirstStringByKey(item, ["apartmentName", "aptName", "아파트", "아파트명", "name"]);
        if (name) names.add(name);
      }
    }
    if (transactions.length < pageSize) break;
  }

  return Array.from(names).sort();
}
