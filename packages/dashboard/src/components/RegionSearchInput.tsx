import { Search } from "lucide-react";
import React, { useEffect, useRef, useState, KeyboardEvent } from "react";
import { searchRegions } from "../api";
import type { RegionSearchResult } from "../types";

export function RegionSearchInput({
  value,
  onChange,
  onSelect,
  placeholder = "예: 경기도 수원시"
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (region: RegionSearchResult) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<RegionSearchResult[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suppressSuggestRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (suppressSuggestRef.current) {
      suppressSuggestRef.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setShowSuggest(false);
      activeIndex !== -1 && setActiveIndex(-1);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const found = await searchRegions(query);
        setResults(found);
        const isCurrentFocused = document.activeElement === inputRef.current;
        setShowSuggest(found.length > 0 && isCurrentFocused);
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setShowSuggest(false);
        setActiveIndex(-1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  function select(item: RegionSearchResult) {
    suppressSuggestRef.current = true;
    setResults([]);
    setShowSuggest(false);
    setActiveIndex(-1);
    onSelect(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggest || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < results.length) {
        event.preventDefault();
        select(results[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setShowSuggest(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => results.length > 0 && setShowSuggest(true)}
        onBlur={() => setTimeout(() => { setShowSuggest(false); setActiveIndex(-1); }, 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showSuggest && results.length > 0}
        aria-autocomplete="list"
        aria-controls="region-search-suggest"
        aria-activedescendant={activeIndex >= 0 ? `suggest-item-${activeIndex}` : undefined}
      />
      {showSuggest && results.length > 0 && (
        <ul
          id="region-search-suggest"
          role="listbox"
          aria-label="Region search suggestions"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-normal bg-normal py-1 shadow-lg"
        >
          {results.map((item, index) => (
            <li
              key={`${item.displayName}-${index}`}
              id={`suggest-item-${index}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-strong transition-colors ${
                  index === activeIndex ? "bg-primary/10 text-primary" : "hover:bg-primary/5"
                }`}
              >
                <Search className="h-3.5 w-3.5 text-neutral shrink-0" />
                <span className="flex-1">{item.displayName}</span>
                <span className="text-xs text-neutral">{item.lawdCode}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
