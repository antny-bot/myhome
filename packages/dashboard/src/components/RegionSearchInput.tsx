import { Search, X, Clock } from "lucide-react";
import React, { useEffect, useRef, useState, KeyboardEvent } from "react";
import { searchRegions } from "../api";
import type { RegionSearchResult } from "../types";
import { copy } from "../locales/ko";

const LOCAL_STORAGE_KEY = "myhome_recent_regions";

function loadRecent(): RegionSearchResult[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load recent regions", e);
    return [];
  }
}

function saveRecent(item: RegionSearchResult) {
  try {
    const current = loadRecent();
    const filtered = current.filter(x => x.lawdCode !== item.lawdCode);
    const updated = [item, ...filtered].slice(0, 10);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save recent region", e);
  }
}

function removeRecent(lawdCode: string): RegionSearchResult[] {
  try {
    const current = loadRecent();
    const updated = current.filter(x => x.lawdCode !== lawdCode);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to remove recent region", e);
    return [];
  }
}

function clearRecent() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear recent regions", e);
  }
}

interface DisplayedItem {
  type: "api" | "recent";
  lawdCode: string;
  displayName: string;
}

export function RegionSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "예: 경기도 수원시",
  className,
  locale = "ko",
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (region: RegionSearchResult) => void;
  placeholder?: string;
  className?: string;
  locale?: "ko" | "en";
}) {
  const t = copy[locale] || copy["ko"];
  const [results, setResults] = useState<RegionSearchResult[]>([]);
  const [recentRegions, setRecentRegions] = useState<RegionSearchResult[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suppressSuggestRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentRegions(loadRecent());
  }, []);

  useEffect(() => {
    if (suppressSuggestRef.current) {
      suppressSuggestRef.current = false;
      return;
    }
    const query = value.trim();
    const isCurrentFocused = document.activeElement === inputRef.current;

    if (query.length < 2) {
      setResults([]);
      setShowSuggest(isCurrentFocused);
      activeIndex !== -1 && setActiveIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await searchRegions(query);
        setResults(found);
        const isCurrentFocusedInner = document.activeElement === inputRef.current;
        setShowSuggest(isCurrentFocusedInner);
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setShowSuggest(false);
        setActiveIndex(-1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const query = value.trim();
  const apiItems: DisplayedItem[] = results.map((r) => ({
    type: "api" as const,
    lawdCode: r.lawdCode,
    displayName: r.displayName,
  }));

  const matchedRecent: DisplayedItem[] = recentRegions
    .filter((r) => {
      if (!query) return true;
      return r.displayName.toLowerCase().includes(query.toLowerCase());
    })
    .filter((r) => !results.some((api) => api.lawdCode === r.lawdCode))
    .map((r) => ({
      type: "recent" as const,
      lawdCode: r.lawdCode,
      displayName: r.displayName,
    }));

  const displayedItems: DisplayedItem[] = [...apiItems, ...matchedRecent];

  function select(item: RegionSearchResult) {
    suppressSuggestRef.current = true;
    setResults([]);
    setShowSuggest(false);
    setActiveIndex(-1);
    saveRecent(item);
    setRecentRegions(loadRecent());
    onSelect(item);
  }

  function handleDeleteRecent(event: React.MouseEvent, lawdCode: string) {
    event.stopPropagation();
    event.preventDefault();
    const updated = removeRecent(lawdCode);
    setRecentRegions(updated);
    inputRef.current?.focus();
  }

  function handleClearAllRecent(event: React.MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    clearRecent();
    setRecentRegions([]);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggest || displayedItems.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev < displayedItems.length - 1 ? prev + 1 : prev));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < displayedItems.length) {
        event.preventDefault();
        const selected = displayedItems[activeIndex];
        select({
          lawdCode: selected.lawdCode,
          displayName: selected.displayName,
        });
      }
    } else if (event.key === "Escape") {
      setShowSuggest(false);
      setActiveIndex(-1);
    }
  }

  const hasRecent = displayedItems.some((item) => item.type === "recent");

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className={
          className ||
          "w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
        }
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          setRecentRegions(loadRecent());
          setShowSuggest(true);
        }}
        onBlur={() =>
          setTimeout(() => {
            setShowSuggest(false);
            setActiveIndex(-1);
          }, 200)
        }
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggest && displayedItems.length > 0}
        aria-autocomplete="list"
        aria-controls="region-search-suggest"
        aria-activedescendant={activeIndex >= 0 ? `suggest-item-${activeIndex}` : undefined}
      />
      {showSuggest && displayedItems.length > 0 && (
        <div
          id="region-search-suggest"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-hidden rounded-lg border border-normal bg-normal shadow-lg flex flex-col"
        >
          {/* 최근 검색 지역 헤더 */}
          {hasRecent && (
            <div className="flex justify-between items-center px-3 py-1.5 bg-alternative border-b border-normal text-[10px] font-bold text-neutral select-none">
              <span>{t.recentRegions}</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearAllRecent}
                className="hover:text-red-500 transition-colors flex items-center gap-0.5"
              >
                <X size={10} />
                <span>{t.recentSearchClear}</span>
              </button>
            </div>
          )}
          <ul role="listbox" aria-label="Region search suggestions" className="overflow-y-auto max-h-60 py-1">
            {displayedItems.map((item, index) => {
              const isSelected = index === activeIndex;
              return (
                <li
                  key={`${item.displayName}-${index}`}
                  id={`suggest-item-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className="relative group"
                >
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      select({
                        lawdCode: item.lawdCode,
                        displayName: item.displayName,
                      })
                    }
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-strong transition-colors ${
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-primary/5"
                    }`}
                  >
                    {item.type === "recent" ? (
                      <Clock className="h-3.5 w-3.5 text-neutral shrink-0" />
                    ) : (
                      <Search className="h-3.5 w-3.5 text-neutral shrink-0" />
                    )}
                    <span className="flex-1 truncate pr-8">{item.displayName}</span>
                    <span className="text-xs text-neutral font-mono">{item.lawdCode}</span>
                  </button>
                  {item.type === "recent" && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => handleDeleteRecent(e, item.lawdCode)}
                      className="absolute right-16 top-1/2 -translate-y-1/2 p-1 text-neutral hover:text-red-500 rounded transition-colors group-hover:opacity-100 opacity-0 focus:opacity-100"
                      title={t.deleteRegion || "삭제"}
                    >
                      <X size={12} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
