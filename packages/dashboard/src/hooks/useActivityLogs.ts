import { useState, useEffect, useCallback } from "react";
import { fetchActivityLogs, fetchActivityStats } from "../api";
import type { UserActivityLog, ActivityStats } from "../types";

export function useActivityLogs(initialLimit: number = 15) {
  // 상태 변수
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ActivityStats | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 필터 및 페이징 상태
  const [filterUser, setFilterUser] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [debouncedUser, setDebouncedUser] = useState("");
  const [limit] = useState(initialLimit);
  const [page, setPage] = useState(1);

  // 모달 상태
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);

  // 사용자 이메일 검색 디바운싱
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUser(filterUser);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [filterUser]);

  // 통계 데이터 조회
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchActivityStats();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to load activity stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 로그 리스트 조회
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const offset = (page - 1) * limit;
      const data = await fetchActivityLogs({
        limit,
        offset,
        userEmail: debouncedUser.trim() || undefined,
        activityType: filterType || undefined,
        date: filterDate || undefined,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err: any) {
      console.error("Failed to load activity logs:", err);
      setErrorMsg(err.message || "로그 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedUser, filterType, filterDate]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleRefresh = useCallback(() => {
    void loadStats();
    void loadLogs();
  }, [loadStats, loadLogs]);

  const handleDateClick = useCallback((clickedDate: string) => {
    if (!clickedDate) return;
    setFilterDate((prev) => (prev === clickedDate ? "" : clickedDate));
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    logs,
    total,
    stats,
    loading,
    loadingStats,
    errorMsg,
    filterUser,
    setFilterUser,
    filterType,
    setFilterType,
    filterDate,
    setFilterDate,
    page,
    setPage,
    limit,
    totalPages,
    selectedPayload,
    setSelectedPayload,
    handleRefresh,
    handleDateClick,
    loadStats,
    loadLogs,
  };
}
