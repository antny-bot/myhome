import React, { useEffect, useState } from "react";
import MultiRegionSelect from "./MultiRegionSelect";
import type { RegionSearchResult } from "../types";
import styles from "./RegionPeriodFilter.module.css";

interface RegionPeriodFilterProps {
  onChange: (params: { regions: Array<{ lawdCode: string; regionName: string }>; startMonth?: string; endMonth?: string }) => void;
}

export default function RegionPeriodFilter({ onChange }: RegionPeriodFilterProps) {
  const [allRegions, setAllRegions] = useState<Array<RegionSearchResult>>([]);
  const [selected, setSelected] = useState<Array<{ lawdCode: string; regionName: string }>>([]);
  const [startMonth, setStartMonth] = useState<string>("");
  const [endMonth, setEndMonth] = useState<string>("");

  // Load all regions once
  useEffect(() => {
    // Empty query returns all regions (backend supports it)
    fetch(`/api/regions/search?query=`)
      .then((r) => r.json())
      .then((data: RegionSearchResult[]) => setAllRegions(data))
      .catch((e) => console.error("Region fetch error", e));
  }, []);

  // Notify parent when any filter changes
  useEffect(() => {
    onChange({ regions: selected, startMonth: startMonth || undefined, endMonth: endMonth || undefined });
  }, [selected, startMonth, endMonth, onChange]);

  const selectAll = () => {
    const list = allRegions.map((r) => ({ lawdCode: r.lawdCode, regionName: r.displayName }));
    setSelected(list);
  };

  const clearAll = () => {
    setSelected([]);
  };

  return (
    <div className={styles.container}>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={selectAll}>전체 선택</button>
        <button type="button" className={styles.btn} onClick={clearAll}>전체 해제</button>
      </div>
      <MultiRegionSelect
        selected={selected}
        onChange={setSelected}
        placeholder="지역 검색"
      />
      <div className={styles.dateRow}>
        <label>
          시작 월
          <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className={styles.monthInput} />
        </label>
        <label>
          종료 월
          <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className={styles.monthInput} />
        </label>
      </div>
    </div>
  );
}
