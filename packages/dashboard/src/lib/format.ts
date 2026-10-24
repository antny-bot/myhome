export function classNames(...values: Array<string | false | undefined | null>) {
  return values.filter(Boolean).join(" ");
}

/**
 * 날짜 포맷팅 (YYYY.MM.DD HH:mm 또는 MM.DD HH:mm)
 */
export function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(d);
  } catch {
    return value || "-";
  }
}

/**
 * 거래년월 포맷팅 (YYYYMM -> YYYY.MM)
 */
export function formatYearMonth(ym?: string | number | null): string {
  if (!ym) return "-";
  const s = String(ym).trim();
  if (s.length === 6) {
    return `${s.slice(0, 4)}.${s.slice(4, 6)}`;
  }
  return s;
}

/**
 * 천 단위 콤마 포맷터 (수치 데이터)
 */
export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) return "0";
  return value.toLocaleString("ko-KR");
}

/**
 * 억 단위 금액 포맷터 (0.01억 = 100만원 정밀도 반영, 소수점 최대 2자리)
 * @example formatPrice(15.5) -> "15.5억"
 * @example formatPrice(0.85) -> "8,500만"
 */
export function formatPrice(eok?: number | null, locale: "ko" | "en" = "ko"): string {
  if (eok === undefined || eok === null || isNaN(eok)) return "-";
  if (eok === 0) return locale === "ko" ? "0원" : "0";

  if (locale === "en") {
    return `${eok.toFixed(2)} Eok`;
  }

  // 1억 미만인 경우 만원 단위 표기
  if (Math.abs(eok) < 1) {
    const manwon = Math.round(eok * 10000);
    return `${manwon.toLocaleString("ko-KR")}만`;
  }

  // 소수점이 00인 경우 정수만, 있는 경우 소수점 최대 2자리까지
  const fixed = eok.toFixed(2);
  const trimmed = fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed.endsWith("0") ? fixed.slice(0, -1) : fixed;
  return `${trimmed}억`;
}

/**
 * 평형/전용면적 환산 포맷터
 * @param areaM2 ㎡ 단위 면적
 * @param unit 'pyeong' 또는 'm2'
 * @param showUnit 단위 문자열 포함 여부
 */
export function formatArea(
  areaM2?: number | null,
  unit: "pyeong" | "m2" = "pyeong",
  showUnit: boolean = true
): string {
  if (areaM2 === undefined || areaM2 === null || isNaN(areaM2)) return "-";

  if (unit === "pyeong") {
    const pyeong = Math.round(areaM2 / 3.30578);
    return showUnit ? `${pyeong}평` : String(pyeong);
  }
  const fixed = areaM2.toFixed(1).replace(/\.0$/, "");
  return showUnit ? `${fixed}㎡` : fixed;
}

/**
 * 평단가 포맷터 (만원/평)
 */
export function formatPpy(ppy?: number | null): string {
  if (ppy === undefined || ppy === null || isNaN(ppy)) return "-";
  return `${Math.round(ppy).toLocaleString("ko-KR")}만/평`;
}

/**
 * 전년동월비 및 변동률 포맷터 (+12.3% / -5.1% / 0.0%)
 */
export function formatPercent(rate?: number | null): string {
  if (rate === undefined || rate === null || isNaN(rate)) return "-";
  const sign = rate > 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}
