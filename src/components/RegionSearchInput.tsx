import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const suppressSuggestRef = useRef(false);

  useEffect(() => {
    if (suppressSuggestRef.current) {
      suppressSuggestRef.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setShowSuggest(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const found = await searchRegions(query);
        setResults(found);
        setShowSuggest(found.length > 0);
      } catch {
        setResults([]);
        setShowSuggest(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  function select(item: RegionSearchResult) {
    suppressSuggestRef.current = true;
    setResults([]);
    setShowSuggest(false);
    onSelect(item);
  }

  return (
    <div className="relative">
      <input
        className="w-full rounded-lg border border-normal bg-normal px-4 py-2.5 text-sm text-strong focus:border-primary outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => results.length > 0 && setShowSuggest(true)}
        onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showSuggest && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-normal bg-normal py-1 shadow-lg">
          {results.map((item, index) => (
            <li key={`${item.displayName}-${index}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-strong hover:bg-primary/10 transition-colors"
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
