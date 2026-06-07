import type { TransactionRecord } from "./types.js";

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
      const match = value.match(/-?\d+(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return undefined;
}

/** "2026년 1월 15일" 같은 한글 날짜 문자열을 "YYYY-MM-DD"로 변환한다. */
function parseKoreanDate(value: string): string | undefined {
  const match = value.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * 원시 실거래 데이터를 표준 형태로 변환한다. 날짜 필드가 없으면 조회에 사용한
 * fallbackMonth(YYYYMM)를 매월 1일 날짜로 대체한다.
 */
export function normalizeTransaction(item: unknown, fallbackMonth: string): TransactionRecord | undefined {
  if (!item || typeof item !== "object") return undefined;
  const record = item as Record<string, unknown>;
  const apartmentName = readString(record, ["apartmentName", "aptName", "아파트", "아파트명", "name"]);
  const rawPrice = readNumber(record, ["transactionPriceRaw", "dealAmount", "price", "amount", "거래금액", "매매가", "transactionPrice"]);
  if (!apartmentName || rawPrice === undefined) return undefined;

  // transactionPriceRaw(MCP)는 항상 만원 단위로 내려오므로 억 단위로 변환한다.
  const priceEok = rawPrice / 10000;
  const areaM2 = readNumber(record, ["exclusiveArea", "area", "전용면적"]);
  const floor = readNumber(record, ["floor", "층"]);
  const dealYear = readString(record, ["dealYear", "년"]);
  const dealMonth = readString(record, ["dealMonth", "월"]);
  const dealDay = readString(record, ["dealDay", "일"]);
  const fallbackDate = fallbackMonth.length === 6 ? `${fallbackMonth.slice(0, 4)}-${fallbackMonth.slice(4)}-01` : fallbackMonth;
  const rawDealDate = readString(record, ["dealDate", "date", "거래일", "transactionDate"]);
  const dealDate =
    dealYear && dealMonth && dealDay
      ? `${dealYear}-${dealMonth.padStart(2, "0")}-${dealDay.padStart(2, "0")}`
      : (rawDealDate && parseKoreanDate(rawDealDate)) || rawDealDate || fallbackDate;

  return { apartmentName, dealDate, priceEok, areaM2, floor, raw: item };
}

export function getMonthsInRange(start: string, end: string): string[] {
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

/** 이번 달부터 거슬러 최근 n개월(YYYYMM)을 오래된 순으로 반환한다. */
export function recentMonths(n: number, from = new Date()): string[] {
  const months: string[] = [];
  let year = from.getFullYear();
  let month = from.getMonth() + 1;
  for (let i = 0; i < n; i++) {
    months.unshift(`${year}${month.toString().padStart(2, "0")}`);
    month--;
    if (month < 1) {
      month = 12;
      year--;
    }
  }
  return months;
}
