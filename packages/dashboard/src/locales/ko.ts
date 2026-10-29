/**
 * locales/ko.ts (배럴 re-export)
 *
 * 세부 도메인별 번역은 ko/ 및 en/ 하위 모듈에 분리되어 있습니다.
 * 하위 호환성을 위해 copy = { ko, en }을 유지합니다.
 */

import { ko } from "./ko/index.js";
import { en } from "./en/index.js";

export const copy = {
  ko,
  en,
} as const;

export { ko, en };
export type Copy = typeof copy;
export type Locale = keyof Copy;
export type Translations = Copy["ko"];
