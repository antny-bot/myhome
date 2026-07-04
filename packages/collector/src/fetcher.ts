import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

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

async function runMcporter(toolName: string, args: Record<string, string>): Promise<string> {
  return new Promise<string>((resolve, reject) => {
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

export type RawTransaction = {
  apartmentName: string;
  dealDate: string;
  priceEok: number;
  areaM2?: number;
  floor?: number;
};

// 헬퍼: 텍스트 또는 숫자로 변환된 필드 읽기
function readString(record: Record<string, any>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value.trim();
    if (value !== undefined && value !== null) return String(value).trim();
  }
  return undefined;
}

function readNumber(record: Record<string, any>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return undefined;
}

// 실거래 내역 정규화
export function normalizeTransaction(item: unknown, fallbackMonth: string): RawTransaction | undefined {
  if (!item || typeof item !== "object") return undefined;
  const r = item as Record<string, any>;

  // 아파트명
  const apartmentName = readString(r, ["apartmentName", "aptName", "아파트", "아파트명", "name"]);
  if (!apartmentName) return undefined;

  // 거래 금액
  const priceRaw = readNumber(r, ["dealAmount", "priceEok", "amount", "거래금액", "price"]);
  if (!priceRaw) return undefined;
  
  // 만약 억 단위가 아니라 만원 단위 원본 금액(예: "150,000" -> 150000)일 경우 10000으로 나눠 억 단위로 맞춤
  const priceEok = priceRaw > 10000 ? priceRaw / 10000 : priceRaw;

  // 거래일 (년-월-일)
  let dealDate = "";
  const year = readString(r, ["dealYear", "year", "년"]);
  const month = readString(r, ["dealMonth", "month", "월"]);
  const day = readString(r, ["dealDay", "day", "일", "dayOfMonth"]);

  if (year && month && day) {
    const yStr = year;
    const mStr = month.padStart(2, "0");
    const dStr = day.padStart(2, "0");
    dealDate = `${yStr}-${mStr}-${dStr}`;
  } else {
    // 풀 포맷 시도
    const fullDate = readString(r, ["dealDate", "date", "거래일"]);
    if (fullDate && /^\d{4}-\d{2}-\d{2}$/.test(fullDate)) {
      dealDate = fullDate;
    } else {
      // YYYYMMDD 형태인 경우 파싱
      if (fullDate && fullDate.length === 8 && /^\d{8}$/.test(fullDate)) {
        dealDate = `${fullDate.substring(0, 4)}-${fullDate.substring(4, 6)}-${fullDate.substring(6, 8)}`;
      } else {
        // 백업으로 fallbackMonth 사용
        const mStr = fallbackMonth.substring(4, 6);
        const yStr = fallbackMonth.substring(0, 4);
        dealDate = `${yStr}-${mStr}-01`;
      }
    }
  }

  // 전용면적
  const areaM2 = readNumber(r, ["excluUseAr", "areaM2", "area", "전용면적", "size"]);
  
  // 층
  const floor = readNumber(r, ["floor", "층"]);

  return { apartmentName, dealDate, priceEok, areaM2, floor };
}

export async function fetchApartmentPricesDirect(lawdCode: string, dealMonth: string): Promise<RawTransaction[]> {
  try {
    const rawOutput = await runMcporter("mcp-gateway.AptInfo-get_apt_price", {
      lawd_cd: lawdCode,
      deal_ymd: dealMonth,
    });
    
    let parsed: any;
    try {
      parsed = JSON.parse(rawOutput);
    } catch {
      console.warn(`[Collector] JSON 파싱 실패. 출력 텍스트 원본 사용: ${rawOutput.substring(0, 100)}`);
      return [];
    }

    const txArray = findTransactionArray(parsed);
    const normalized: RawTransaction[] = [];
    
    for (const item of txArray) {
      const norm = normalizeTransaction(item, dealMonth);
      if (norm) normalized.push(norm);
    }

    return normalized;
  } catch (err: any) {
    console.error(`[Collector] MCP 직접 호출 실패 (${lawdCode} / ${dealMonth}): ${err.message}`);
    return [];
  }
}
