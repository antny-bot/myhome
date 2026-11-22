import React from "react";
import { Activity, ShieldAlert, RefreshCw, Users, UserCheck, Database } from "lucide-react";
import { useBreakpoint } from "../useBreakpoint";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useLocale } from "../lib/i18n";
import { useActivityLogs } from "../hooks/useActivityLogs";
import { ActivityLogCharts } from "../components/activity/ActivityLogCharts";
import { ActivityLogFilterBar } from "../components/activity/ActivityLogFilterBar";
import { ActivityLogTable } from "../components/activity/ActivityLogTable";
import { ActivityLogDetailModal } from "../components/activity/ActivityLogDetailModal";

export function ActivityLogPage() {
  const { t } = useLocale();
  const { isMobile } = useBreakpoint();

  const {
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
  } = useActivityLogs(15);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <PageHeader
        title={t.activityLogTitle}
        icon={Activity}
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-normal border border-normal rounded-lg hover:bg-normal/50 text-xs font-semibold text-strong transition-colors"
          >
            <RefreshCw size={14} />
            <span>새로고침</span>
          </button>
        }
      />

      {/* 통계 요약 카드 섹션 */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-normal bg-elevated p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral">일간 활성 사용자 (DAU)</span>
              <UserCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-strong">{stats.dau}명</div>
            <div className="mt-1 text-[10px] text-assistive">KST 오늘 활동한 고유 사용자</div>
          </div>

          <div className="rounded-xl border border-normal bg-elevated p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral">주간 활성 사용자 (WAU)</span>
              <Users className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-strong">{stats.wau}명</div>
            <div className="mt-1 text-[10px] text-assistive">최근 7일 동안 활동한 고유 사용자</div>
          </div>

          <div className="rounded-xl border border-normal bg-elevated p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral">월간 활성 사용자 (MAU)</span>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-strong">{stats.mau}명</div>
            <div className="mt-1 text-[10px] text-assistive">최근 30일 동안 활동한 고유 사용자</div>
          </div>

          <div className="rounded-xl border border-normal bg-elevated p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral">누적 사용자 / 전체 로그</span>
              <Database className="h-5 w-5 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-strong">
              {stats.totalUsers}명 <span className="text-sm font-normal text-neutral">/</span> {stats.totalLogs}건
            </div>
            <div className="mt-1 text-[10px] text-assistive">시스템 내 등록된 누적 수치</div>
          </div>
        </div>
      )}

      {/* 통계 차트 그리드 */}
      <ActivityLogCharts
        stats={stats}
        loadingStats={loadingStats}
        filterDate={filterDate}
        onDateClick={handleDateClick}
        onClearDateFilter={() => {
          setFilterDate("");
          setPage(1);
        }}
        t={t}
      />

      {/* 상세 로그 필터 및 목록 */}
      <SectionCard
        title={
          filterDate
            ? t.filteredByDate
              ? t.filteredByDate.replace("{date}", filterDate)
              : `상세 활동 로그 목록 (${filterDate})`
            : "상세 활동 로그 목록"
        }
      >
        <div className="space-y-4">
          <ActivityLogFilterBar
            filterUser={filterUser}
            setFilterUser={setFilterUser}
            filterType={filterType}
            setFilterType={setFilterType}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            setPage={setPage}
            total={total}
            t={t}
          />

          {errorMsg && (
            <div className="flex items-center gap-2 bg-warn/10 border border-warn/30 text-warn text-xs px-4 py-3 rounded-lg animate-in fade-in duration-300">
              <ShieldAlert size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <ActivityLogTable
            logs={logs}
            total={total}
            page={page}
            limit={limit}
            totalPages={totalPages}
            setPage={setPage}
            setSelectedPayload={setSelectedPayload}
            loading={loading}
            isMobile={isMobile}
            t={t}
          />
        </div>
      </SectionCard>

      {/* 페이로드 JSON 뷰어 모달 */}
      <ActivityLogDetailModal
        payload={selectedPayload}
        onClose={() => setSelectedPayload(null)}
      />
    </div>
  );
}
