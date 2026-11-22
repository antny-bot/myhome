import React from "react";
import { Search, Calendar, X } from "lucide-react";
import { formatActivityType } from "./activityUtils";

interface ActivityLogFilterBarProps {
  filterUser: string;
  setFilterUser: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterDate: string;
  setFilterDate: (v: string) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
  total: number;
  t: any;
}

export function ActivityLogFilterBar({
  filterUser,
  setFilterUser,
  filterType,
  setFilterType,
  filterDate,
  setFilterDate,
  setPage,
  total,
  t,
}: ActivityLogFilterBarProps) {
  return (
    <div className="space-y-4">
      {/* 선택된 일자 필터 알림 배너 */}
      {filterDate && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 text-xs text-primary font-medium">
          <div className="flex items-center gap-2">
            <Calendar size={15} />
            <span>
              <b>{filterDate}</b> 일자의 활동 로그만 필터링되어 표시 중입니다. (총 <b>{total}</b>건)
            </span>
          </div>
          <button
            onClick={() => {
              setFilterDate("");
              setPage(1);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-xs font-bold transition-colors text-primary"
          >
            <X size={13} />
            <span>필터 해제</span>
          </button>
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 사용자 이메일 검색 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-assistive" />
          <input
            type="text"
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder={t.filterUser || "사용자 이메일 검색..."}
            className="w-full bg-normal border border-normal rounded-lg pl-9 pr-3 py-2 text-xs text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-assistive"
          />
        </div>

        {/* 활동 유형 필터 */}
        <div className="w-full sm:w-[200px]">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-xs text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="">{t.allTypes || "전체 유형"}</option>
            <option value="page_view">{formatActivityType("page_view", t)}</option>
            <option value="search_transactions">{formatActivityType("search_transactions", t)}</option>
            <option value="api_call">{formatActivityType("api_call", t)}</option>
            <option value="mcp_tool_call">{formatActivityType("mcp_tool_call", t)}</option>
            <option value="mcp_connect">{formatActivityType("mcp_connect", t)}</option>
            <option value="mcp_token_create">{formatActivityType("mcp_token_create", t)}</option>
            <option value="mcp_token_delete">{formatActivityType("mcp_token_delete", t)}</option>
            <option value="region_add">{formatActivityType("region_add", t)}</option>
            <option value="region_delete">{formatActivityType("region_delete", t)}</option>
            <option value="rule_create">{formatActivityType("rule_create", t)}</option>
            <option value="rule_update">{formatActivityType("rule_update", t)}</option>
            <option value="rule_delete">{formatActivityType("rule_delete", t)}</option>
            <option value="rule_test">{formatActivityType("rule_test", t)}</option>
            <option value="preset_create">{formatActivityType("preset_create", t)}</option>
            <option value="preset_delete">{formatActivityType("preset_delete", t)}</option>
          </select>
        </div>

        {/* 일자 필터 */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-assistive pointer-events-none" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setPage(1);
              }}
              className="bg-normal border border-normal rounded-lg pl-8 pr-2.5 py-2 text-xs text-strong outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              title={t.filterDate || "일자 필터"}
            />
          </div>
          {filterDate && (
            <button
              onClick={() => {
                setFilterDate("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-bold transition-colors shrink-0"
              title={t.clearDateFilter || "일자 필터 초기화"}
            >
              <X size={13} />
              <span>{t.allDates || "전체 일자"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
