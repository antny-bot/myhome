import React from "react";
import { calculateBoxPlot } from "../../../lib/stats.js";
import { useLocale } from "../../../lib/i18n.js";
import type { OverviewTabProps } from "./types.js";

export function useOverviewData({
  data,
  areaUnit = "pyeong",
  areaType = "supply",
  startDate,
  endDate,
}: OverviewTabProps) {
  const { t } = useLocale();

  const getAreaValue = React.useCallback(
    (d: any) => {
      if (areaType === "supply") {
        return d.supplyAreaM2 || d.areaM2 / 0.78;
      }
      return d.areaM2 || 0;
    },
    [areaType]
  );

  const sizeCategories = React.useMemo(() => {
    if (areaUnit === "pyeong") {
      if (areaType === "supply") {
        return [
          "20평 이하",
          "21~25평",
          "26~30평",
          "31~35평",
          "36~40평",
          "41~45평",
          "46~50평",
          "50평 초과",
        ];
      } else {
        return [
          "15평 이하",
          "16~20평",
          "21~25평",
          "26~30평",
          "31~35평",
          "36~40평",
          "40평 초과",
        ];
      }
    } else {
      if (areaType === "supply") {
        return [
          "66㎡ 이하",
          "67~85㎡",
          "86~105㎡",
          "106~120㎡",
          "121~135㎡",
          "136~150㎡",
          "151~165㎡",
          "165㎡ 초과",
        ];
      } else {
        return [
          "66㎡ 이하",
          "67~83㎡",
          "84~99㎡",
          "100~116㎡",
          "117~132㎡",
          "132㎡ 초과",
        ];
      }
    }
  }, [areaUnit, areaType]);

  const [sizeFilter, setSizeFilter] = React.useState<
    "all" | "under20" | "20s" | "30s" | "40s" | "over50"
  >("all");
  const [selectedRegion, setSelectedRegion] = React.useState<string>("all");

  const regionOptions = React.useMemo(() => {
    const set = new Set<string>();
    data.forEach((d) => {
      const rName = d.regionName ? d.regionName.split(" ").slice(-1)[0] : null;
      if (rName) set.add(rName);
    });
    return ["all", ...Array.from(set)];
  }, [data]);

  const floorCategories = React.useMemo(() => {
    return [t.floorLow, t.floorMid, t.floorHigh, t.floorSuper];
  }, [t]);

  const getSizeCategory = React.useCallback(
    (areaM2: number) => {
      const areaPyeong = areaM2 / 3.3058;
      if (areaUnit === "pyeong") {
        if (areaType === "supply") {
          if (areaPyeong <= 20.5) return "20평 이하";
          if (areaPyeong <= 25.5) return "21~25평";
          if (areaPyeong <= 30.5) return "26~30평";
          if (areaPyeong <= 35.5) return "31~35평";
          if (areaPyeong <= 40.5) return "36~40평";
          if (areaPyeong <= 45.5) return "41~45평";
          if (areaPyeong <= 50.5) return "46~50평";
          return "50평 초과";
        } else {
          if (areaPyeong <= 15.5) return "15평 이하";
          if (areaPyeong <= 20.5) return "16~20평";
          if (areaPyeong <= 25.5) return "21~25평";
          if (areaPyeong <= 30.5) return "26~30평";
          if (areaPyeong <= 35.5) return "31~35평";
          if (areaPyeong <= 40.5) return "36~40평";
          return "40평 초과";
        }
      } else {
        if (areaType === "supply") {
          if (areaM2 <= 66.5) return "66㎡ 이하";
          if (areaM2 <= 85.5) return "67~85㎡";
          if (areaM2 <= 105.5) return "86~105㎡";
          if (areaM2 <= 120.5) return "106~120㎡";
          if (areaM2 <= 135.5) return "121~135㎡";
          if (areaM2 <= 150.5) return "136~150㎡";
          if (areaM2 <= 165.5) return "151~165㎡";
          return "165㎡ 초과";
        } else {
          if (areaM2 <= 66.5) return "66㎡ 이하";
          if (areaM2 <= 83.5) return "67~83㎡";
          if (areaM2 <= 99.5) return "84~99㎡";
          if (areaM2 <= 116.5) return "100~116㎡";
          if (areaM2 <= 132.5) return "117~132㎡";
          return "132㎡ 초과";
        }
      }
    },
    [areaUnit, areaType]
  );

  const getFloorCategory = React.useCallback(
    (floorStr: string | number) => {
      const floorNum = Number(floorStr);
      if (isNaN(floorNum)) return "기타";
      if (floorNum <= 5) return t.floorLow;
      if (floorNum <= 15) return t.floorMid;
      if (floorNum <= 25) return t.floorHigh;
      return t.floorSuper;
    },
    [t]
  );

  const filteredData = React.useMemo(() => data, [data]);

  const monthlyFilteredData = React.useMemo(() => {
    return data.filter((d) => {
      if (selectedRegion !== "all") {
        const rName = d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타";
        if (rName !== selectedRegion) return false;
      }
      if (sizeFilter !== "all") {
        const areaVal = getAreaValue(d);
        const pyeong = areaVal / 3.3058;
        if (sizeFilter === "under20" && pyeong >= 20.5) return false;
        if (sizeFilter === "20s" && (pyeong < 20.5 || pyeong >= 30.5)) return false;
        if (sizeFilter === "30s" && (pyeong < 30.5 || pyeong >= 40.5)) return false;
        if (sizeFilter === "40s" && (pyeong < 40.5 || pyeong >= 50.5)) return false;
        if (sizeFilter === "over50" && pyeong < 50.5) return false;
      }
      return true;
    });
  }, [data, selectedRegion, sizeFilter, getAreaValue]);

  // 월별 시계열 가공
  const monthlyChartData = React.useMemo(() => {
    const monthlyDataMap = new Map<string, { count: number; prices: number[] }>();

    let startMonthStr = startDate ? startDate.substring(0, 7) : undefined;
    let endMonthStr = endDate ? endDate.substring(0, 7) : undefined;

    if (!startMonthStr || !endMonthStr) {
      monthlyFilteredData.forEach((d) => {
        const m = d.dealDate.substring(0, 7);
        if (!startMonthStr || m < startMonthStr) startMonthStr = m;
        if (!endMonthStr || m > endMonthStr) endMonthStr = m;
      });
    }

    if (startMonthStr && endMonthStr && startMonthStr <= endMonthStr) {
      const [sY, sM] = startMonthStr.split("-").map(Number);
      const [eY, eM] = endMonthStr.split("-").map(Number);
      let curY = sY;
      let curM = sM;
      while (curY < eY || (curY === eY && curM <= eM)) {
        const mStr = `${curY}-${String(curM).padStart(2, "0")}`;
        monthlyDataMap.set(mStr, { count: 0, prices: [] });
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }
    }

    monthlyFilteredData.forEach((d) => {
      const month = d.dealDate.substring(0, 7);
      const current = monthlyDataMap.get(month) || { count: 0, prices: [] };
      current.count += 1;
      current.prices.push(d.priceEok);
      monthlyDataMap.set(month, current);
    });

    return Array.from(monthlyDataMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, val]) => {
        const count = val.count;
        if (count === 0) {
          return {
            name: month,
            volume: 0,
            min: null,
            q1: null,
            median: null,
            q3: null,
            max: null,
            avg: null,
            whiskerRange: null,
            boxRange: null,
          };
        }
        const stats = calculateBoxPlot(val.prices, 1);
        return {
          name: month,
          volume: count,
          min: stats.min,
          q1: stats.q1,
          median: stats.median,
          q3: stats.q3,
          max: stats.max,
          avg: stats.mean,
          whiskerRange: [stats.min, stats.max] as [number, number],
          boxRange: [stats.q1, stats.q3] as [number, number],
        };
      });
  }, [monthlyFilteredData, startDate, endDate]);

  // 피벗 데이터
  const activeRegions = React.useMemo(() => {
    const counts = new Map<string, number>();
    filteredData.forEach((d) => {
      const rName = d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타";
      counts.set(rName, (counts.get(rName) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [filteredData]);

  const pivotData = React.useMemo(() => {
    const cellMap = new Map<string, { prices: number[]; complexes: Set<string> }>();
    const floorCellMap = new Map<string, { prices: number[]; complexes: Set<string> }>();

    filteredData.forEach((d) => {
      const colKey = d.regionName ? d.regionName.split(" ").slice(-1)[0] : "기타";
      if (!activeRegions.includes(colKey)) return;

      const areaVal = getAreaValue(d);
      const rowKey = getSizeCategory(areaVal);

      const key = `${rowKey}|${colKey}`;
      const cell = cellMap.get(key) || { prices: [], complexes: new Set<string>() };
      cell.prices.push(d.priceEok);
      if (d.complexName) cell.complexes.add(d.complexName);
      cellMap.set(key, cell);

      const floorKey = getFloorCategory(d.floor);
      const floorCellKey = `${rowKey}|${floorKey}|${colKey}`;
      const floorCell = floorCellMap.get(floorCellKey) || {
        prices: [],
        complexes: new Set<string>(),
      };
      floorCell.prices.push(d.priceEok);
      if (d.complexName) floorCell.complexes.add(d.complexName);
      floorCellMap.set(floorCellKey, floorCell);
    });

    const data: Record<
      string,
      {
        avg: number;
        median: number;
        min: number;
        max: number;
        count: number;
        complexesSummary: string;
      }
    > = {};

    let maxCount = 0;
    let minAvg = Infinity;
    let maxAvg = -Infinity;

    activeRegions.forEach((colKey) => {
      sizeCategories.forEach((rowKey) => {
        const key = `${rowKey}|${colKey}`;
        const cell = cellMap.get(key);
        if (cell && cell.prices.length > 0) {
          const stats = calculateBoxPlot(cell.prices, 1);
          const count = cell.prices.length;
          if (count > maxCount) maxCount = count;
          if (stats.mean < minAvg) minAvg = stats.mean;
          if (stats.mean > maxAvg) maxAvg = stats.mean;

          const complexesArr = Array.from(cell.complexes);
          const complexesSummary =
            complexesArr.slice(0, 2).join(", ") +
            (complexesArr.length > 2 ? ` 외 ${complexesArr.length - 2}개` : "");

          data[key] = {
            avg: stats.mean,
            median: stats.median,
            min: stats.min,
            max: stats.max,
            count,
            complexesSummary,
          };
        }

        floorCategories.forEach((floorKey) => {
          const fKey = `${rowKey}|${floorKey}|${colKey}`;
          const floorCell = floorCellMap.get(fKey);
          if (floorCell && floorCell.prices.length > 0) {
            const stats = calculateBoxPlot(floorCell.prices, 1);
            const count = floorCell.prices.length;
            const complexesArr = Array.from(floorCell.complexes);
            const complexesSummary =
              complexesArr.slice(0, 2).join(", ") +
              (complexesArr.length > 2 ? ` 외 ${complexesArr.length - 2}개` : "");

            data[fKey] = {
              avg: stats.mean,
              median: stats.median,
              min: stats.min,
              max: stats.max,
              count,
              complexesSummary,
            };
          }
        });
      });
    });

    return {
      data,
      maxCount,
      minAvg: minAvg === Infinity ? 0 : minAvg,
      maxAvg: maxAvg === -Infinity ? 0 : maxAvg,
    };
  }, [
    filteredData,
    activeRegions,
    sizeCategories,
    floorCategories,
    getAreaValue,
    getSizeCategory,
    getFloorCategory,
  ]);

  return {
    getAreaValue,
    sizeCategories,
    floorCategories,
    sizeFilter,
    setSizeFilter,
    selectedRegion,
    setSelectedRegion,
    regionOptions,
    filteredData,
    monthlyChartData,
    activeRegions,
    pivotData,
    getSizeCategory,
    getFloorCategory,
  };
}

export type OverviewDataState = ReturnType<typeof useOverviewData>;
