import React, { useState, useEffect, useMemo } from "react";
import { loadComplexDetail } from "../../../api/index.js";
import type { ComplexTabProps } from "./types.js";

export function useComplexData({
  initialComplexName,
  lawdCode,
  areaUnit = "pyeong",
  areaType = "supply",
  startDate,
  endDate,
}: ComplexTabProps) {
  const [complexName, setComplexName] = useState(initialComplexName || "");
  const [selectedArea, setSelectedArea] = useState<number | undefined>(undefined);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [error, setError] = useState("");
  const [cache, setCache] = useState<Record<string, any>>({});

  const formatSizeString = (sizeStr: string, unit: "pyeong" | "m2") => {
    const num = parseFloat(sizeStr);
    if (isNaN(num)) return sizeStr;

    if (areaType === "supply") {
      if (detailData?.areaBreakdown) {
        const found = detailData.areaBreakdown.find(
          (b: any) => Math.abs(parseFloat(b.area) - num) < 0.5
        );
        if (found) {
          if (found.supplyAreaPyeong) {
            if (unit === "pyeong") return `${found.supplyAreaPyeong}평`;
            return `${Math.round(found.supplyAreaM2 || found.supplyAreaPyeong * 3.305785)}㎡`;
          }
          if (found.supplyAreaM2) {
            if (unit === "pyeong") return `${Math.round(found.supplyAreaM2 / 3.305785)}평`;
            return `${Math.round(found.supplyAreaM2)}㎡`;
          }
        }
      }
      // fallback: 전용률 78% 추정
      const fallbackSupplyM2 = num / 0.78;
      if (unit === "pyeong") {
        return `${Math.round(fallbackSupplyM2 / 3.305785)}평`;
      }
      return `${Math.round(fallbackSupplyM2)}㎡`;
    }

    if (unit === "pyeong") {
      return `${Math.round(num / 3.305785)}평`;
    }
    return `${Math.round(num)}㎡`;
  };

  const fetchDetail = async (name: string, area?: number) => {
    if (!name.trim()) return;
    const cacheKey = `${name}_${area !== undefined ? area : "all"}_${startDate ?? ""}_${endDate ?? ""}`;

    if (cache[cacheKey]) {
      setDetailData(cache[cacheKey]);
      setComplexName(name);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await loadComplexDetail(name, lawdCode, area, startDate, endDate);
      setCache((prev) => ({ ...prev, [cacheKey]: res }));
      setDetailData(res);
      setComplexName(name);

      if (area === undefined && res.areaBreakdown) {
        const sizes = res.areaBreakdown.map((b: any) => b.area);
        sizes.sort((a: string, b: string) => {
          const numA = parseInt(a) || 0;
          const numB = parseInt(b) || 0;
          return numA - numB;
        });
        setAvailableSizes(sizes);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "단지 상세 데이터를 불러오지 못했습니다.");
      setDetailData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialComplexName) {
      fetchDetail(initialComplexName, selectedArea);
    } else {
      setDetailData(null);
      setComplexName("");
    }
  }, [initialComplexName, selectedArea, lawdCode, startDate, endDate]);

  const kpiData = useMemo(() => {
    // 1. 백엔드에서 전수 계산된 단지 KPI가 제공되면 최우선 사용
    if (detailData?.kpi) {
      return detailData.kpi;
    }

    if (!detailData?.trend || detailData.trend.length === 0) return null;
    const trend = detailData.trend;
    const latest = trend[trend.length - 1];
    if (!latest) return null;

    const latestAvg = latest.평균가 || 0;
    const latestMonth = latest.month || "";

    let yoyDiff = 0;
    let yoyPercent = 0;
    let hasYoy = false;
    let yoyMonthStr = "";

    if (latestMonth) {
      const [year, month] = latestMonth.split("-").map(Number);
      yoyMonthStr = `${year - 1}-${String(month).padStart(2, "0")}`;
      const prevYearData = trend.find((d: any) => d.month === yoyMonthStr);
      if (prevYearData && prevYearData.평균가) {
        yoyDiff = Number((latestAvg - prevYearData.평균가).toFixed(2));
        yoyPercent = Number(((yoyDiff / prevYearData.평균가) * 100).toFixed(1));
        hasYoy = true;
      }
    }

    let pastYearVolume = 0;
    if (latestMonth) {
      const [year, month] = latestMonth.split("-").map(Number);
      let startYear = year;
      let startMonth = month - 11;
      if (startMonth <= 0) {
        startYear -= 1;
        startMonth += 12;
      }
      const startMonthStr = `${startYear}-${String(startMonth).padStart(2, "0")}`;
      pastYearVolume = trend
        .filter((d: any) => d.month >= startMonthStr && d.month <= latestMonth)
        .reduce((sum: number, d: any) => sum + (d.거래량 || 0), 0);
    }

    let maxPrice = 0;
    let maxMonth = "";
    trend.forEach((d: any) => {
      const price = d.최고가 || d.최대가 || d.max || d.평균가 || 0;
      if (price > maxPrice) {
        maxPrice = price;
        maxMonth = d.month;
      }
    });

    return {
      latestAvg,
      latestMonth,
      hasYoy,
      yoyDiff,
      yoyPercent,
      yoyMonthStr,
      pastYearVolume,
      maxPrice,
      maxMonth,
    };
  }, [detailData?.trend, detailData?.kpi]);

  const groupedTx = useMemo(() => {
    if (!detailData?.recentTx || detailData.recentTx.length === 0) return [];
    const groups: { dealDate: string; items: any[] }[] = [];
    detailData.recentTx.forEach((tx: any) => {
      let g = groups.find((x) => x.dealDate === tx.dealDate);
      if (!g) {
        g = { dealDate: tx.dealDate, items: [] };
        groups.push(g);
      }
      g.items.push(tx);
    });
    return groups;
  }, [detailData?.recentTx]);

  const recentTxStats = useMemo(() => {
    if (!detailData?.recentTx || detailData.recentTx.length === 0) return null;
    const prices = detailData.recentTx.map((t: any) => t.priceEok);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const sum = prices.reduce((acc: number, p: number) => acc + p, 0);
    return {
      maxPrice,
      minPrice,
      avgPrice: sum / prices.length,
      totalCount: detailData.recentTx.length,
    };
  }, [detailData?.recentTx]);

  return {
    complexName,
    selectedArea,
    setSelectedArea,
    availableSizes,
    loading,
    error,
    detailData,
    kpiData,
    groupedTx,
    recentTxStats,
    formatSizeString,
  };
}

export type ComplexDataState = ReturnType<typeof useComplexData>;
