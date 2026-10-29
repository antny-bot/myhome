import { useRef, useState } from "react";
import { addDbRegion, deleteDbRegion, fetchDbRegionsSummary, logActivity, searchTransactions } from "../../api.js";
import type { RegionSummary } from "./RegionCollectModal.js";

interface UseRegionCollectorProps {
  isAdmin?: boolean;
  onChanged?: () => void;
}

export function useRegionCollector({ isAdmin = false, onChanged }: UseRegionCollectorProps) {
  const [dbRegions, setDbRegions] = useState<RegionSummary[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCollect, setLoadingCollect] = useState(false);
  const [collectProgress, setCollectProgress] = useState<{
    processed: number;
    total: number;
    success: number;
    failed: number;
    failures: { month: string; reason: string }[];
  } | null>(null);
  const [shouldStopCollect, setShouldStopCollect] = useState(false);
  const shouldStopCollectRef = useRef(false);
  const [uiFeedback, setUiFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 수집 설정 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    lawdCode: string;
    regionName: string;
    isExisting: boolean;
    existingRegion?: RegionSummary;
  } | null>(null);

  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [modalError, setModalError] = useState("");

  const loadRegions = async () => {
    setLoadingSummary(true);
    try {
      const summary = await fetchDbRegionsSummary();
      setDbRegions(summary);
    } catch (err: any) {
      console.error("Failed to load regions summary", err);
      setUiFeedback({ message: "수집 지역 정보를 불러오는데 실패했습니다.", type: "error" });
    } finally {
      setLoadingSummary(false);
    }
  };

  const openCollectModal = (lawdCode: string, regionName: string, existingRegion?: RegionSummary) => {
    const isExisting = !!existingRegion || dbRegions.some((r) => r.lawdCode === lawdCode);
    const resolvedExistingRegion = existingRegion || dbRegions.find((r) => r.lawdCode === lawdCode);

    setModalData({
      lawdCode,
      regionName,
      isExisting,
      existingRegion: resolvedExistingRegion,
    });

    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = String(today.getMonth() + 1).padStart(2, "0");
    const currentYm = `${curYear}${curMonth}`;

    if (isExisting && resolvedExistingRegion?.maxDealDate) {
      const lastDate = resolvedExistingRegion.maxDealDate;
      const lastY = parseInt(lastDate.substring(0, 4));
      const lastM = parseInt(lastDate.substring(5, 7));

      let nextM = lastM + 1;
      let nextY = lastY;
      if (nextM > 12) {
        nextM = 1;
        nextY += 1;
      }

      const nextYm = `${nextY}${String(nextM).padStart(2, "0")}`;
      if (parseInt(nextYm) > parseInt(currentYm)) {
        setStartMonth(currentYm);
      } else {
        setStartMonth(nextYm);
      }
      setEndMonth(currentYm);
    } else {
      setStartMonth(`${curYear}01`);
      setEndMonth(currentYm);
    }

    setModalError("");
    setIsModalOpen(true);
  };

  const getMonthsInRange = (start: string, end: string): string[] => {
    const startY = parseInt(start.substring(0, 4));
    const startM = parseInt(start.substring(4, 6));
    const endY = parseInt(end.substring(0, 4));
    const endM = parseInt(end.substring(4, 6));

    const result: string[] = [];
    let curY = startY;
    let curM = startM;

    while (curY < endY || (curY === endY && curM <= endM)) {
      result.push(`${curY}${String(curM).padStart(2, "0")}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return result;
  };

  const handleStopCollect = () => {
    shouldStopCollectRef.current = true;
    setShouldStopCollect(true);
  };

  const handleCollectSubmit = async () => {
    if (!modalData) return;

    const monthPattern = /^\d{6}$/;
    if (!monthPattern.test(startMonth) || !monthPattern.test(endMonth)) {
      setModalError("집계 기간은 YYYYMM 형식(예: 202601)으로 6자리 숫자를 입력해 주세요.");
      return;
    }

    if (parseInt(startMonth) > parseInt(endMonth)) {
      setModalError("시작년월은 종료년월보다 이전이어야 합니다.");
      return;
    }

    setLoadingCollect(true);
    setModalError("");
    setUiFeedback(null);
    setShouldStopCollect(false);
    shouldStopCollectRef.current = false;

    try {
      if (!modalData.isExisting) {
        await addDbRegion(modalData.lawdCode, modalData.regionName);
        void logActivity("region_add", `수집 지역 추가: ${modalData.regionName} (${modalData.lawdCode})`, {
          lawdCode: modalData.lawdCode,
          displayName: modalData.regionName,
        });
      }

      const months = getMonthsInRange(startMonth, endMonth);
      const progressState = {
        processed: 0,
        total: months.length,
        success: 0,
        failed: 0,
        failures: [] as { month: string; reason: string }[],
      };
      setCollectProgress(progressState);

      let totalRecordsCount = 0;
      for (let i = 0; i < months.length; i++) {
        if (shouldStopCollectRef.current) {
          break;
        }

        const month = months[i];
        try {
          const records = await searchTransactions(modalData.lawdCode, modalData.regionName, { dealMonth: month }, true);
          totalRecordsCount += records.length;
          progressState.success += 1;
        } catch (err: any) {
          console.error(`Collection failed for month ${month}:`, err);
          progressState.failed += 1;
          progressState.failures.push({
            month,
            reason: err.message || "네트워크 오류 또는 API 에러",
          });
        }

        progressState.processed += 1;
        setCollectProgress({ ...progressState });

        if (i < months.length - 1 && !shouldStopCollectRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      const wasStopped = shouldStopCollectRef.current;

      void logActivity(
        "search_transactions",
        `${modalData.regionName} 실거래 수집/추가집계 (${startMonth}~${endMonth})${wasStopped ? " [중단됨]" : ""}`,
        {
          lawdCode: modalData.lawdCode,
          regionName: modalData.regionName,
          period: { startMonth, endMonth },
          count: totalRecordsCount,
          stopped: wasStopped,
        }
      );

      if (wasStopped) {
        setUiFeedback({
          message: `${modalData.regionName} 실거래 데이터 수집이 중단되었습니다. (완료: ${progressState.success}개월, 실패: ${progressState.failed}개월)`,
          type: "error",
        });
      } else {
        setUiFeedback({
          message: `${modalData.regionName} 실거래 데이터 적재를 완료했습니다. (${totalRecordsCount.toLocaleString()}건 완료)`,
          type: "success",
        });
      }

      setIsModalOpen(false);
      void loadRegions();
      if (onChanged) onChanged();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || "수집 진행 도중 에러가 발생했습니다.");
    } finally {
      setLoadingCollect(false);
      setCollectProgress(null);
    }
  };

  const handleRegionDelete = async () => {
    if (
      !modalData ||
      !window.confirm(`${modalData.regionName} 지역의 모든 수집 설정 및 SQLite 실거래 적재 내역을 완전히 제거하시겠습니까?`)
    ) {
      return;
    }

    setLoadingCollect(true);
    setModalError("");
    setUiFeedback(null);

    try {
      await deleteDbRegion(modalData.lawdCode);
      void logActivity("region_delete", `수집 지역 삭제 및 DB 초기화: ${modalData.regionName} (${modalData.lawdCode})`, {
        lawdCode: modalData.lawdCode,
        displayName: modalData.regionName,
      });

      setUiFeedback({
        message: `${modalData.regionName} 지역 및 관련 실거래 데이터를 일괄 제거하였습니다.`,
        type: "success",
      });
      setIsModalOpen(false);
      void loadRegions();
      if (onChanged) onChanged();
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || "지역 정보 삭제에 실패했습니다.");
    } finally {
      setLoadingCollect(false);
    }
  };

  return {
    dbRegions,
    loadingSummary,
    loadingCollect,
    collectProgress,
    shouldStopCollect,
    uiFeedback,
    setUiFeedback,
    isModalOpen,
    setIsModalOpen,
    modalData,
    startMonth,
    setStartMonth,
    endMonth,
    setEndMonth,
    modalError,
    loadRegions,
    openCollectModal,
    handleStopCollect,
    handleCollectSubmit,
    handleRegionDelete,
  };
}
