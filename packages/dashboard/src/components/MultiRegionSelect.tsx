import React, { useState } from "react";
import { RegionSearchInput } from "./RegionSearchInput";
import type { RegionSearchResult } from "../types";
import styles from "./MultiRegionSelect.module.css";

interface MultiRegionSelectProps {
  selected: Array<{ lawdCode: string; regionName: string }>;
  onChange: (list: Array<{ lawdCode: string; regionName: string }>) => void;
  placeholder?: string;
}

export default function MultiRegionSelect({ selected, onChange, placeholder }: MultiRegionSelectProps) {
  const [search, setSearch] = useState("");

  const addRegion = (candidate: RegionSearchResult) => {
    if (!selected.find((s) => s.lawdCode === candidate.lawdCode)) {
      const newList = [...selected, { lawdCode: candidate.lawdCode, regionName: candidate.displayName }];
      onChange(newList);
    }
    setSearch("");
  };

  const removeRegion = (lawdCode: string) => {
    const newList = selected.filter((s) => s.lawdCode !== lawdCode);
    onChange(newList);
  };

  const clearAll = () => {
    onChange([]);
  };

  // Show up to 3 chips, then a +N indicator if more
  const displayedChips = selected.slice(0, 3);
  const extraCount = selected.length - displayedChips.length;

  return (
    <div className={styles.container}>
      <div className={styles.chips}>
        {displayedChips.map((r) => (
          <span key={r.lawdCode} className={styles.chip}>
            {r.regionName}
            <button type="button" className={styles.chipClose} onClick={() => removeRegion(r.lawdCode)}>
              ×
            </button>
          </span>
        ))}
        {extraCount > 0 && (
          <span className={styles.extraChip}>+{extraCount}</span>
        )}
        {selected.length > 0 && (
          <button type="button" className={styles.clearAll} onClick={clearAll}>
            전체 해제
          </button>
        )}
      </div>
      <RegionSearchInput
        value={search}
        onChange={setSearch}
        onSelect={addRegion}
        placeholder={placeholder || "지역 선택"}
        className={styles.searchInput}
      />
    </div>
  );
}
