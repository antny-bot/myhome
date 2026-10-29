/**
 * scripts/check-i18n.ts
 *
 * ko와 en 번역 키의 완전성(동기화)을 검증하는 CI 스크립트.
 * - ko에만 있는 키 검출
 * - en에만 있는 키 검출
 * - 빈 문자열 또는 누락된 번역값 검출
 */

import { copy } from "../packages/dashboard/src/locales/ko.ts";

function checkI18n(): void {
  const koKeys = new Set(Object.keys(copy.ko));
  const enKeys = new Set(Object.keys(copy.en));

  const missingInEn: string[] = [];
  const missingInKo: string[] = [];
  const emptyInKo: string[] = [];
  const emptyInEn: string[] = [];

  for (const key of koKeys) {
    if (!enKeys.has(key)) {
      missingInEn.push(key);
    } else {
      const koVal = (copy.ko as Record<string, string>)[key];
      const enVal = (copy.en as Record<string, string>)[key];
      if (typeof koVal !== "string" || koVal.trim() === "") {
        emptyInKo.push(key);
      }
      if (typeof enVal !== "string" || enVal.trim() === "") {
        emptyInEn.push(key);
      }
    }
  }

  for (const key of enKeys) {
    if (!koKeys.has(key)) {
      missingInKo.push(key);
    }
  }

  let hasError = false;

  console.log(`[i18n-check] Total KO keys: ${koKeys.size}, EN keys: ${enKeys.size}`);

  if (missingInEn.length > 0) {
    hasError = true;
    console.error(`[i18n-check] Missing in EN (${missingInEn.length}):`, missingInEn);
  }

  if (missingInKo.length > 0) {
    hasError = true;
    console.error(`[i18n-check] Missing in KO (${missingInKo.length}):`, missingInKo);
  }

  if (emptyInKo.length > 0) {
    hasError = true;
    console.error(`[i18n-check] Empty value in KO (${emptyInKo.length}):`, emptyInKo);
  }

  if (emptyInEn.length > 0) {
    hasError = true;
    console.error(`[i18n-check] Empty value in EN (${emptyInEn.length}):`, emptyInEn);
  }

  if (hasError) {
    console.error("[i18n-check] FAILED: i18n keys are out of sync.");
    process.exit(1);
  }

  console.log("[i18n-check] PASSED: All i18n keys and values are synchronized.");
}

checkI18n();
