import React, { useState } from "react";
import { SectionCard } from "./SectionCard";
import { classNames } from "../lib/format";
import {
  readDisplayPreferences,
  saveDisplayPreferences,
  resetDisplayPreferences,
  DISPLAY_FONT_OPTIONS,
  DISPLAY_ACCENT_OPTIONS,
} from "../lib/displayPreferences";

export function SettingsGeneralSection() {
  const [pref, setPref] = useState(readDisplayPreferences());

  const handlePrefChange = (changes: Partial<typeof pref>) => {
    const next = saveDisplayPreferences(changes);
    setPref(next);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Font selection */}
      <SectionCard title="글꼴 설정">
        <div className="space-y-4">
          <p className="text-xs text-neutral">대시보드 전체에서 사용할 기본 폰트 패밀리를 선택합니다.</p>
          <div className="flex gap-6">
            {DISPLAY_FONT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-strong"
              >
                <input
                  type="radio"
                  name="fontFamily"
                  checked={pref.fontFamily === opt.value}
                  onChange={() => handlePrefChange({ fontFamily: opt.value })}
                  className="accent-primary h-4 w-4"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Font Size slider */}
      <SectionCard title="글자 크기">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-neutral">대시보드 전체의 텍스트 크기를 일괄 조절합니다. (12px ~ 22px)</p>
            <span className="text-xs font-bold text-primary font-mono">{pref.fontSizePx}px</span>
          </div>
          <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-normal">
            <span className="text-xs text-neutral font-mono">12px</span>
            <input
              type="range"
              min="12"
              max="22"
              value={pref.fontSizePx}
              onChange={(e) => handlePrefChange({ fontSizePx: parseInt(e.target.value, 10) })}
              className="flex-1 accent-primary h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-neutral font-mono">22px</span>
          </div>
        </div>
      </SectionCard>

      {/* Accent Color selection */}
      <SectionCard title="테마 색상 (Accent Color)">
        <div className="space-y-4">
          <p className="text-xs text-neutral">
            대시보드의 주요 버튼, 아이콘 및 강조 텍스트에 쓰일 브랜드 주조색을 선택합니다.
          </p>
          <div className="flex flex-wrap gap-4">
            {DISPLAY_ACCENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handlePrefChange({ accentColor: opt.value })}
                className={classNames(
                  "flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all text-xs font-semibold",
                  pref.accentColor === opt.value
                    ? "border-primary bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-bold shadow-sm shadow-primary/10"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <span
                  className="h-4 w-4 rounded-full shrink-0 shadow-inner"
                  style={{ backgroundColor: opt.swatch }}
                />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Reset button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => {
            const next = resetDisplayPreferences();
            setPref(next);
          }}
          className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-strong transition-colors"
        >
          기본 설정으로 재설정
        </button>
      </div>
    </div>
  );
}
