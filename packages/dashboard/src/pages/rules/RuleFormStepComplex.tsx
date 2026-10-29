import React from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import { classNames } from "../../lib/format.js";
import { useLocale } from "../../lib/i18n.js";
import type { RuleInput } from "../../types.js";

interface RuleFormStepComplexProps {
  form: RuleInput;
  complexQuery: string;
  setComplexQuery: (val: string) => void;
  showComplexDropdown: boolean;
  setShowComplexDropdown: (val: boolean) => void;
  activeAptIndex: number;
  setActiveAptIndex: React.Dispatch<React.SetStateAction<number>>;
  searchingComplexes: boolean;
  filteredApts: string[];
  toggleApt: (name: string) => void;
  handleAddCustomApt: () => void;
  setStep: (step: number) => void;
}

export function RuleFormStepComplex({
  form,
  complexQuery,
  setComplexQuery,
  showComplexDropdown,
  setShowComplexDropdown,
  activeAptIndex,
  setActiveAptIndex,
  searchingComplexes,
  filteredApts,
  toggleApt,
  handleAddCustomApt,
  setStep,
}: RuleFormStepComplexProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-strong">
            {form.regionName} {t.aptSelect}
          </h3>
          <p className="text-xs text-neutral mt-0.5">{t.aptSelectDesc}</p>
        </div>
      </div>

      {/* 선택된 단지 칩 목록 */}
      {form.apartmentKeywords && form.apartmentKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-alternative/30 border border-normal/20">
          {form.apartmentKeywords.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 animate-in fade-in zoom-in-95 duration-150"
            >
              {name}
              <button
                type="button"
                onClick={() => toggleApt(name)}
                className="p-0.5 rounded-full hover:bg-primary/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Autocomplete 단지 검색창 */}
      <div className="relative">
        <input
          type="text"
          className="w-full h-[42px] rounded-lg border border-normal bg-normal pl-10 pr-10 text-sm font-semibold text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          value={complexQuery}
          onChange={(e) => {
            setComplexQuery(e.target.value);
            setShowComplexDropdown(true);
          }}
          onFocus={() => setShowComplexDropdown(true)}
          onBlur={() => {
            setTimeout(() => {
              setShowComplexDropdown(false);
              setActiveAptIndex(-1);
            }, 200);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (showComplexDropdown && activeAptIndex >= 0 && activeAptIndex < filteredApts.length) {
                const selected = filteredApts[activeAptIndex];
                if (!form.apartmentKeywords?.includes(selected)) {
                  toggleApt(selected);
                }
                setComplexQuery("");
                setShowComplexDropdown(false);
                setActiveAptIndex(-1);
              } else if (showComplexDropdown && filteredApts.length === 1) {
                const selected = filteredApts[0];
                if (!form.apartmentKeywords?.includes(selected)) {
                  toggleApt(selected);
                }
                setComplexQuery("");
                setShowComplexDropdown(false);
                setActiveAptIndex(-1);
              } else {
                handleAddCustomApt();
              }
            } else if (showComplexDropdown && filteredApts.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveAptIndex((prev) => (prev < filteredApts.length - 1 ? prev + 1 : prev));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveAptIndex((prev) => (prev > 0 ? prev - 1 : -1));
              } else if (e.key === "Escape") {
                setShowComplexDropdown(false);
                setActiveAptIndex(-1);
              }
            }
          }}
          placeholder={t.aptSearchPlaceholder}
          autoComplete="off"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral" />
        {searchingComplexes && (
          <RefreshCw className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral" />
        )}

        {showComplexDropdown && filteredApts.length > 0 && (
          <ul className="absolute z-30 left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-lg border border-normal bg-elevated py-1 shadow-lg">
            {filteredApts.map((apt, index) => {
              const isAlreadySelected = form.apartmentKeywords?.includes(apt);
              return (
                <li key={`${apt}-${index}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (!isAlreadySelected) {
                        toggleApt(apt);
                      }
                      setComplexQuery("");
                      setShowComplexDropdown(false);
                    }}
                    className={classNames(
                      "w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between",
                      index === activeAptIndex
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-alternative text-strong"
                    )}
                  >
                    <span>{apt}</span>
                    {isAlreadySelected && (
                      <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
                        {t.allResults}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex-1 rounded-lg border border-normal px-4 py-2.5 text-sm font-bold text-strong hover:bg-alternative transition-colors flex items-center justify-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" /> {t.buttonPrev}
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex-[2] rounded-lg bg-strong px-4 py-2.5 text-sm font-bold text-normal hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {t.buttonNext} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
