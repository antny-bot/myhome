import React from "react";
import { User, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import type { UserActivityLog } from "../../types";
import { formatActivityType, getActivityTypeBadgeClass } from "./activityUtils";

interface ActivityLogTableProps {
  logs: UserActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  setSelectedPayload: (payload: string | null) => void;
  loading: boolean;
  isMobile: boolean;
  t: any;
}

export function ActivityLogTable({
  logs,
  total,
  page,
  limit,
  totalPages,
  setPage,
  setSelectedPayload,
  loading,
  isMobile,
  t,
}: ActivityLogTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-16 text-xs text-neutral border border-dashed border-normal rounded-xl">
        {t.noActivityLogs || "기록된 활동 로그가 없습니다."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 모바일 뷰 카드 리스트 */}
      {isMobile ? (
        <div className="divide-y divide-normal/40 border border-normal rounded-xl overflow-hidden bg-normal/10">
          {logs.map((log) => (
            <div key={log.id} className="p-4 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <span
                  className={`font-bold text-[11px] px-2 py-0.5 rounded ${getActivityTypeBadgeClass(
                    log.activityType
                  )}`}
                >
                  {formatActivityType(log.activityType, t)}
                </span>
                <span className="text-[10px] text-assistive font-mono">
                  {new Date(log.createdAt).toLocaleString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <p className="text-strong font-semibold">{log.description}</p>

              <div className="flex items-center gap-1.5 text-neutral text-[10px]">
                <User size={10} className="text-assistive" />
                <span className="truncate max-w-[200px]" title={log.userEmail}>
                  {log.userEmail}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-assistive pt-1.5 border-t border-normal/20">
                <span>IP: {log.ipAddress || "-"}</span>
                {log.payload && (
                  <button
                    onClick={() => setSelectedPayload(log.payload || null)}
                    className="flex items-center gap-1 text-primary hover:underline font-bold"
                  >
                    <Eye size={10} />
                    <span>{t.viewPayload || "상세 데이터"}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 데스크톱 뷰 테이블 */
        <div className="overflow-x-auto border border-normal rounded-xl bg-normal/10">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-normal bg-alternative/60">
                <th className="px-4 py-2.5 text-left font-bold text-neutral">시간</th>
                <th className="px-4 py-2.5 text-left font-bold text-neutral">사용자</th>
                <th className="px-4 py-2.5 text-left font-bold text-neutral">유형</th>
                <th className="px-4 py-2.5 text-left font-bold text-neutral">상세 내용</th>
                <th className="px-4 py-2.5 text-center font-bold text-neutral">IP 주소</th>
                <th className="px-4 py-2.5 text-center font-bold text-neutral">페이로드</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-normal/30">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-alternative/40 transition-colors">
                  <td className="px-4 py-3 text-neutral font-mono whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("ko-KR")}
                  </td>
                  <td
                    className="px-4 py-3 text-strong font-medium truncate max-w-[150px]"
                    title={log.userEmail}
                  >
                    {log.userEmail}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${getActivityTypeBadgeClass(
                        log.activityType
                      )}`}
                    >
                      {formatActivityType(log.activityType, t)}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-strong font-semibold max-w-[300px] truncate"
                    title={log.description}
                  >
                    {log.description}
                  </td>
                  <td className="px-4 py-3 text-center text-neutral font-mono whitespace-nowrap">
                    {log.ipAddress || "-"}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {log.payload ? (
                      <button
                        onClick={() => setSelectedPayload(log.payload || null)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-normal hover:bg-normal/80 text-primary hover:text-primary/80 font-bold border border-normal transition-colors"
                      >
                        <Eye size={12} />
                        <span>보기</span>
                      </button>
                    ) : (
                      <span className="text-assistive">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이징 네비게이션 */}
      <div className="flex items-center justify-between pt-4 border-t border-normal/20">
        <span className="text-[11px] text-neutral font-medium">
          총 <b className="text-strong font-bold">{total}</b>건 중 {Math.min(total, (page - 1) * limit + 1)} ~{" "}
          {Math.min(total, page * limit)}번째 항목 표시
        </span>

        <div className="inline-flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 border border-normal rounded-lg hover:bg-normal/40 disabled:opacity-50 text-neutral transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-3 text-xs font-semibold text-strong font-mono">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 border border-normal rounded-lg hover:bg-normal/40 disabled:opacity-50 text-neutral transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
