import { nanoid } from "nanoid";
import { getApartmentPrices, getRegionCode } from "./mcpClient.js";
import { appendCheckRun, readState, updateRulePatch } from "./storage.js";
import { normalizeTransaction, recentMonths } from "./transactions.js";
import type { RuleCheckOutcome, TransactionMatch, WatchRule } from "./types.js";

const sourceLimitNotice =
  "기준: PlayMCP 실거래가/단지정보. 현재 매물, 호가, 매물 등록/삭제 알림이 아닙니다.";

/** 실거래 신고는 계약 후 최대 한달까지 지연될 수 있어 이번달+지난달을 같이 확인한다. */
const TRACKED_MONTHS = 2;

function transactionToMatch(rule: WatchRule, item: unknown, fallbackMonth: string): TransactionMatch | undefined {
  const normalized = normalizeTransaction(item, fallbackMonth);
  if (!normalized) return undefined;
  const { apartmentName, dealDate, priceEok, areaM2, floor } = normalized;

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

export async function runRuleCheck(rule: WatchRule): Promise<RuleCheckOutcome> {
  const state = await readState();
  const region = rule.regionCode
    ? { lawdCode: rule.regionCode, displayName: rule.regionName, raw: null }
    : await getRegionCode(rule.regionName);

  if (!rule.regionCode || rule.regionCode !== region.lawdCode) {
    await updateRulePatch(rule.id, { regionCode: region.lawdCode });
  }

  const targetMonths = recentMonths(TRACKED_MONTHS);

  const matches: TransactionMatch[] = [];
  for (const month of targetMonths) {
    const prices = await getApartmentPrices(region.lawdCode, month);
    for (const item of prices.transactions) {
      const match = transactionToMatch(rule, item, month);
      if (match) matches.push(match);
    }
  }

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
