import { nanoid } from "nanoid";
import { getApartmentPrices, getRegionCode } from "./mcpClient.js";
import { appendCheckRun, readState, updateRulePatch } from "./storage.js";
import type { RuleCheckOutcome, TransactionMatch, WatchRule } from "./types.js";

const sourceLimitNotice =
  "기준: PlayMCP 실거래가/단지정보. 현재 매물, 호가, 매물 등록/삭제 알림이 아닙니다.";

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/[,\s]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function transactionToMatch(rule: WatchRule, item: unknown): TransactionMatch | undefined {
  if (!item || typeof item !== "object") return undefined;
  const record = item as Record<string, unknown>;
  const apartmentName = readString(record, ["apartmentName", "aptName", "아파트", "아파트명", "name"]);
  const rawPrice = readNumber(record, ["dealAmount", "price", "amount", "거래금액", "매매가"]);
  if (!apartmentName || rawPrice === undefined) return undefined;

  const priceEok = rawPrice > 10000 ? rawPrice / 10000 : rawPrice;
  const areaM2 = readNumber(record, ["exclusiveArea", "area", "전용면적"]);
  const floor = readNumber(record, ["floor", "층"]);
  const dealYear = readString(record, ["dealYear", "년"]);
  const dealMonth = readString(record, ["dealMonth", "월"]);
  const dealDay = readString(record, ["dealDay", "일"]);
  const fallbackDate = rule.dealMonth.length === 6 ? `${rule.dealMonth.slice(0, 4)}-${rule.dealMonth.slice(4)}-01` : rule.dealMonth;
  const dealDate =
    dealYear && dealMonth && dealDay
      ? `${dealYear}-${dealMonth.padStart(2, "0")}-${dealDay.padStart(2, "0")}`
      : readString(record, ["dealDate", "date", "거래일"]) || fallbackDate;

  const keywords = rule.apartmentKeywords ?? [];
  if (keywords.length > 0) {
    const matchedAny = keywords.some(kw => apartmentName.toLowerCase().includes(kw.trim().toLowerCase()));
    if (!matchedAny) return undefined;
  }
  
  if (rule.minPriceEok !== undefined && priceEok < rule.minPriceEok) return undefined;
  if (rule.maxPriceEok !== undefined && priceEok > rule.maxPriceEok) return undefined;

  const dedupeKey = [rule.id, apartmentName, dealDate, areaM2 ?? "", floor ?? "", priceEok.toFixed(4)].join("|");
  return { dedupeKey, apartmentName, dealDate, priceEok, areaM2, floor, raw: item };
}

function summarize(rule: WatchRule, matches: TransactionMatch[]) {
  if (matches.length === 0) return `${rule.name}: 조건에 맞는 신규 실거래가 없습니다.`;
  const cheapest = [...matches].sort((a, b) => a.priceEok - b.priceEok)[0];
  return `${rule.name}: ${matches.length}건 매칭, 최저 ${cheapest.apartmentName} ${cheapest.priceEok.toFixed(2)}억`;
}

function getMonthsInRange(start: string, end: string): string[] {
  const months: string[] = [];
  let currentY = parseInt(start.slice(0, 4));
  let currentM = parseInt(start.slice(4));
  const endY = parseInt(end.slice(0, 4));
  const endM = parseInt(end.slice(4));

  while (currentY < endY || (currentY === endY && currentM <= endM)) {
    months.push(`${currentY}${currentM.toString().padStart(2, "0")}`);
    currentM++;
    if (currentM > 12) {
      currentM = 1;
      currentY++;
    }
  }
  return months;
}

export async function runRuleCheck(rule: WatchRule): Promise<RuleCheckOutcome> {
  const state = await readState();
  const region = rule.regionCode
    ? { lawdCode: rule.regionCode, displayName: rule.regionName, raw: null }
    : await getRegionCode(rule.regionName);

  if (!rule.regionCode || rule.regionCode !== region.lawdCode) {
    await updateRulePatch(rule.id, { regionCode: region.lawdCode });
  }

  const targetMonths = rule.startMonth && rule.endMonth 
    ? getMonthsInRange(rule.startMonth, rule.endMonth)
    : [rule.dealMonth ?? new Date().toISOString().slice(0, 7).replace("-", "")];

  const allTransactions: unknown[] = [];
  for (const month of targetMonths) {
    const prices = await getApartmentPrices(region.lawdCode, month);
    allTransactions.push(...prices.transactions);
  }

  const matches = allTransactions
    .map((item) => transactionToMatch(rule, item))
    .filter((match): match is TransactionMatch => Boolean(match));
  const newMatches = matches.filter((match) => !state.alertedDedupeKeys.includes(match.dedupeKey));
  const now = new Date().toISOString();
  const run = {
    id: nanoid(),
    ruleId: rule.id,
    ruleName: rule.name,
    matched: newMatches.length > 0,
    summary: summarize(rule, newMatches),
    matches: newMatches,
    sourceLimitNotice,
    createdAt: now
  };

  await appendCheckRun(run, newMatches.map((match) => match.dedupeKey));
  return { run, newMatches };
}

export function getSourceLimitNotice() {
  return sourceLimitNotice;
}
