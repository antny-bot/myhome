import {
  getAuctions,
  getAlertedDedupeKeys,
  type DbWatchRule,
  type AuctionWithMatch,
  createLogger,
} from "@myhome/shared";

const log = createLogger("AuctionEngine");

export interface AuctionRuleMatchResult {
  rule: DbWatchRule;
  matchedAuctions: AuctionWithMatch[];
  newDedupeKeys: string[];
  message: string;
}

/**
 * 경매 알림용 중복 방지 키 생성
 * 기일 변경이나 최저매각가 하락(유찰) 시 재알림이 가능하도록 saleDate와 minPrice를 포함
 */
export function makeAuctionAlertKey(auction: AuctionWithMatch): string {
  return `auction:${auction.docid}:${auction.saleDate || ""}:${auction.minPrice || 0}`;
}

/**
 * 룰 조건에 따라 경매 물건 필터링
 */
export function filterAuctionsForRule(
  rule: DbWatchRule,
  auctions: AuctionWithMatch[],
  alertedKeys: Set<string>
): { matched: AuctionWithMatch[]; newKeys: string[] } {
  const matched: AuctionWithMatch[] = [];
  const newKeys: string[] = [];

  // 룰 종류 확인 ('transaction' 전용 룰은 제외)
  const ruleKind = rule.kind || "transaction";
  if (ruleKind === "transaction") {
    return { matched: [], newKeys: [] };
  }

  const keywords = (rule.apartmentKeywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean);

  for (const a of auctions) {
    // 1. 지역 코드 일치 확인
    if (rule.regionCode && a.lawdCode && a.lawdCode !== rule.regionCode) {
      continue;
    }

    // 2. 단지명 키워드 확인 (매칭된 complexName 또는 원본 buldName)
    if (keywords.length > 0) {
      const complexTarget = (a.complexName || "").toLowerCase();
      const buldTarget = (a.buldName || "").toLowerCase();
      const keywordMatched = keywords.some(
        (kw) => complexTarget.includes(kw) || buldTarget.includes(kw)
      );
      if (!keywordMatched) continue;
    }

    // 3. 최저매각가 범위 확인 (억 원 단위)
    if (a.minPrice != null) {
      const priceEok = a.minPrice / 100000000;
      if (rule.minPriceEok !== undefined && priceEok < rule.minPriceEok) continue;
      if (rule.maxPriceEok !== undefined && priceEok > rule.maxPriceEok) continue;
    }

    // 4. 전유면적 범위 확인 (㎡)
    if (a.areaM2 != null) {
      if (rule.minArea !== undefined && a.areaM2 < rule.minArea) continue;
      if (rule.maxArea !== undefined && a.areaM2 > rule.maxArea) continue;
    }

    // 5. 유찰 횟수 확인
    if (rule.maxFailedCount !== undefined && a.failedCount != null) {
      if (a.failedCount > rule.maxFailedCount) continue;
    }

    // 6. 중복 알림 여부 확인
    const dedupeKey = makeAuctionAlertKey(a);
    if (alertedKeys.has(dedupeKey)) {
      continue;
    }

    matched.push(a);
    newKeys.push(dedupeKey);
  }

  return { matched, newKeys };
}

/**
 * 텔레그램 경매 알림 메시지 포맷팅
 */
export function formatAuctionAlertMessage(rule: DbWatchRule, auctions: AuctionWithMatch[]): string {
  const lines: string[] = [
    `[경매 알림] ${rule.name}`,
    `지역: ${rule.regionName}`,
  ];

  auctions.forEach((a, idx) => {
    const complex = a.complexName || a.buldName || "아파트";
    const dongHo = a.dongHo ? ` ${a.dongHo}` : "";
    const appraisal = a.appraisalAmt ? `${(a.appraisalAmt / 100000000).toFixed(2)}억` : "-";
    const minPrc = a.minPrice ? `${(a.minPrice / 100000000).toFixed(2)}억` : "-";
    const rate = a.minPriceRate != null ? `(${a.minPriceRate}%)` : "";
    const failed = a.failedCount != null ? `유찰 ${a.failedCount}회` : "";
    const date = a.saleDate ? a.saleDate.substring(5) : "";
    const time = a.saleTime || "";
    const giil = date ? `기일 ${date} ${time}`.trim() : "";

    lines.push(
      `${idx + 1}. ${complex}${dongHo} · 감정 ${appraisal} → 최저 ${minPrc}${rate} · ${failed} · ${giil}`
    );
  });

  lines.push("※ 입찰 전 법원 원문 공고를 반드시 다시 확인하세요.");
  return lines.join("\n");
}

/**
 * 단일 룰에 대해 경매 물건 검사 및 알림 생성
 */
export function checkAuctionRule(rule: DbWatchRule, email: string): AuctionRuleMatchResult | null {
  const ruleKind = rule.kind || "transaction";
  if (ruleKind === "transaction") return null;

  // 활성 진행 중인 경매 물건 목록 조회
  const auctions = getAuctions({
    lawdCode: rule.regionCode,
    onlyActive: true,
  });

  if (auctions.length === 0) return null;

  const alertedKeysList = getAlertedDedupeKeys(email, rule.id);
  const alertedKeys = new Set(alertedKeysList);

  const { matched, newKeys } = filterAuctionsForRule(rule, auctions, alertedKeys);
  if (matched.length === 0) return null;

  const message = formatAuctionAlertMessage(rule, matched);

  return {
    rule,
    matchedAuctions: matched,
    newDedupeKeys: newKeys,
    message,
  };
}
