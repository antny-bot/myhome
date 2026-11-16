/**
 * MCP 도구 공용 날짜 정규화 유틸
 *
 * [저장 포맷 기준]
 * `transactions.deal_date` 는 항상 하이픈 포함 'YYYY-MM-DD' 로 저장된다.
 *   - docs/04_DATABASE.md: `deal_date TEXT NOT NULL, -- 계약일 (YYYY-MM-DD)`
 *   - packages/shared/src/apiClient.ts: 국토부 API 응답을 'YYYY-MM-DD' 로 정규화해 저장
 *
 * 따라서 SQL 비교값(파라미터)도 반드시 'YYYY-MM-DD' 여야 한다.
 * 하이픈 없는 'YYYYMMDD' 를 그대로 비교하면 문자열 비교에서 '-' (0x2D) < '0' (0x30) 이므로
 * '2026-11-06' < '20260516' 이 되어 기간 내 모든 거래가 제외된다.
 *
 * [허용 입력]
 * 도구 호출자는 두 포맷을 모두 넘길 수 있으므로 아래 형태를 모두 'YYYY-MM-DD' 로 정규화한다.
 *   - 'YYYY-MM-DD', 'YYYY.MM.DD', 'YYYY/MM/DD'
 *   - 'YYYYMMDD'
 *   - 'YYYY-MM' (월 단위: 시작일은 1일, 종료일은 해당 월 말일로 보정)
 */

const DATE_WITH_SEPARATOR = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/;
const DATE_COMPACT = /^(\d{4})(\d{2})(\d{2})$/;
const MONTH_WITH_SEPARATOR = /^(\d{4})[-./](\d{1,2})$/;
const MONTH_COMPACT = /^(\d{4})(\d{2})$/;

export type DateBoundary = "start" | "end";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 해당 연·월의 마지막 일 (month: 1~12) */
export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Date → 로컬 시간대 기준 'YYYY-MM-DD' (toISOString 은 UTC 변환으로 날짜가 밀릴 수 있어 사용하지 않음) */
export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** N개월 전 날짜 (말일 보정: 3/31 - 1개월 → 2/28 또는 2/29) */
export function subtractMonths(date: Date, months: number): Date {
  const targetIndex = date.getMonth() - months;
  const targetYear = date.getFullYear() + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12; // 0-based
  const day = Math.min(date.getDate(), lastDayOfMonth(targetYear, targetMonth + 1));
  return new Date(targetYear, targetMonth, day);
}

/** 최근 N개월 통계 조회용 기준일 ('YYYY-MM-DD') */
export function monthsAgoCutoff(months: number, now: Date = new Date()): string {
  return formatLocalDate(subtractMonths(now, months));
}

/**
 * 호출자 입력 날짜를 DB 저장 포맷('YYYY-MM-DD')으로 정규화한다.
 * 해석 불가한 값이면 undefined 를 반환한다 (호출부에서 오류 응답 처리).
 */
export function normalizeDealDate(value: unknown, boundary: DateBoundary = "start"): string | undefined {
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;

  const full = raw.match(DATE_WITH_SEPARATOR) ?? raw.match(DATE_COMPACT);
  if (full) {
    const year = Number(full[1]);
    const month = Number(full[2]);
    const day = Number(full[3]);
    if (month < 1 || month > 12 || day < 1 || day > lastDayOfMonth(year, month)) return undefined;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  const monthOnly = raw.match(MONTH_WITH_SEPARATOR) ?? raw.match(MONTH_COMPACT);
  if (monthOnly) {
    const year = Number(monthOnly[1]);
    const month = Number(monthOnly[2]);
    if (month < 1 || month > 12) return undefined;
    const day = boundary === "end" ? lastDayOfMonth(year, month) : 1;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }

  return undefined;
}
