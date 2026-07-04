import { nanoid } from "nanoid";
import { getApartmentPrices, getRegionCode } from "./mcpClient.js";
import { appendCheckRun, readState, updateRulePatch } from "./storage.js";
import { normalizeTransaction, recentMonths } from "./transactions.js";
import type { RuleCheckOutcome, TransactionMatch, WatchRule } from "./types.js";
import { SOURCE_LIMIT_NOTICE } from "./constants.js";
import { upsertTransaction, makeGraphDedupeKey } from "@myhome/shared";

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

  const alertedSet = new Set(state.alertedDedupeKeys);
  const newMatches = matches.filter((match) => !alertedSet.has(match.dedupeKey));
  const now = new Date().toISOString();
  const run = {
    id: nanoid(),
    ruleId: rule.id,
    ruleName: rule.name,
    matched: newMatches.length > 0,
    summary: summarize(rule, newMatches),
    matches: newMatches,
    sourceLimitNotice: SOURCE_LIMIT_NOTICE,
    createdAt: now
  };

  await appendCheckRun(run, newMatches.map((match) => match.dedupeKey));

  // 그래프 DB 적재 — GRAPH_DB_ENABLED=true일 때만, 오류가 나도 기존 흐름에 영향 없음
  if (process.env.GRAPH_DB_ENABLED === "true") {
    const regionInfo = { lawdCode: region.lawdCode, displayName: region.displayName ?? rule.regionName };
    for (const match of matches) {
      const graphKey = makeGraphDedupeKey(
        region.lawdCode, match.apartmentName, match.dealDate, match.areaM2, match.floor
      );
      try {
        await upsertTransaction(regionInfo, match.apartmentName, {
          dedupeKey: graphKey,
          dealDate:  match.dealDate,
          priceEok:  match.priceEok,
          areaM2:    match.areaM2,
          floor:     match.floor,
        });
      } catch (err) {
        console.error(`[graphDb] upsert 실패 (${match.apartmentName} / ${match.dealDate}):`, err);
      }
    }
  }

  return { run, newMatches };
}

export function getSourceLimitNotice() {
  return SOURCE_LIMIT_NOTICE;
}
