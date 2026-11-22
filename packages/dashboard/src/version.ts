declare const __COMMIT_HASH__: string | undefined;
declare const __APP_VERSION__: string | undefined;
declare const __BUILD_TIME__: string | undefined;

import packageJson from "../package.json";

export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : packageJson.version || "0.3.0";
export const COMMIT_HASH = typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "dev";
export const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();

export function getFullVersionString(): string {
  return `v${APP_VERSION} (${COMMIT_HASH})`;
}

export function formatBuildDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Seoul",
    });
  } catch {
    return isoString;
  }
}
