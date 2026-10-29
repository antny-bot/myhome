/**
 * 서버 타임존 설정에 영향받지 않는 KST (Asia/Seoul, UTC+9) 시간 유틸리티
 */

const kstFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function getKstTimeParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = kstFormatter.formatToParts(date);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }

  return {
    year: partMap.year || date.getUTCFullYear(),
    month: partMap.month || date.getUTCMonth() + 1,
    day: partMap.day || date.getUTCDate(),
    hour: partMap.hour !== undefined ? (partMap.hour === 24 ? 0 : partMap.hour) : 0,
    minute: partMap.minute || 0,
    second: partMap.second || 0,
  };
}

/**
 * KST 기준 날짜 문자열 반환 (YYYY-MM-DD)
 */
export function getKstDateString(date: Date = new Date()): string {
  const p = getKstTimeParts(date);
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  return `${p.year}-${m}-${d}`;
}

/**
 * KST 기준 시간 (0~23) 반환
 */
export function getKstHour(date: Date = new Date()): number {
  return getKstTimeParts(date).hour;
}

/**
 * KST 기준 분 (0~59) 반환
 */
export function getKstMinute(date: Date = new Date()): number {
  return getKstTimeParts(date).minute;
}
