import React, { useState } from "react";
import { Database, MapPin, Plus, Trash2, X, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { RegionSearchInput } from "../../components/RegionSearchInput.js";
import type { RegionSearchResult } from "../../types.js";
import type { RegionSummary } from "./RegionCollectModal.js";

interface RegionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbRegions: RegionSummary[];
  isAdmin: boolean;
  onOpenCollectModal: (lawdCode: string, regionName: string, existingRegion?: RegionSummary) => void;
  onDeleteRegion: (target: { lawdCode: string; regionName: string }) => Promise<void>;
  loadingCollect: boolean;
}

export function RegionManagerModal({
  isOpen,
  onClose,
  dbRegions,
  isAdmin,
  onOpenCollectModal,
  onDeleteRegion,
  loadingCollect,
}: RegionManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const handleSearchSelect = (item: RegionSearchResult) => {
    const cleanedName = item.displayName.replace(/\s+/g, " ").trim();
    setSearchQuery("");
    onOpenCollectModal(item.lawdCode, cleanedName);
  };

  const formatPeriod = (minDate: string | null, maxDate: string | null) => {
    if (!minDate || !maxDate) return "-";
    const f = (d: string) => d.substring(0, 7).replace("-", ".");
    return `${f(minDate)} ~ ${f(maxDate)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-elevated border border-normal rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-normal bg-alternative/35 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary border border-primary-500/20">
              <Database size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-strong">수집 지역 관리</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  총 {dbRegions.length}개 지역
                </span>
              </div>
              <p className="text-[11px] text-assistive mt-0.5">
                자동 수집 대상 지역 목록을 확인하고, 기간별 실거래 추가 수집 및 수집 중지/삭제를 관리합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral hover:bg-alternative hover:text-strong transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 상단: 신규 지역 추가 검색바 */}
        {isAdmin && (
          <div className="p-4 border-b border-normal bg-alternative/15 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-strong flex items-center gap-1.5">
                <Plus size={14} className="text-primary" />
                신규 수집 지역 등록
              </span>
              <span className="text-[10px] text-assistive">원하는 시·군·구를 검색하여 수집을 시작하세요</span>
            </div>
            <RegionSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={handleSearchSelect}
              placeholder="예: 서울 강남구, 경기 성남시 분당구, 부산 해운대구..."
              className="w-full rounded-xl border border-normal bg-normal px-3 py-2 text-xs text-strong focus:border-primary focus:outline-none shadow-xs"
            />
          </div>
        )}

        {/* 본문: 수집 지역 목록 */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 min-h-[200px]">
          {dbRegions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-neutral space-y-2">
              <AlertCircle size={28} className="text-neutral/60" />
              <p className="text-xs font-bold">등록된 수집 지역이 없습니다.</p>
              <p className="text-[11px] text-assistive">상단 검색창에서 수집할 지역을 검색하여 등록해 보세요.</p>
            </div>
          ) : (
            dbRegions.map((region) => (
              <div
                key={region.lawdCode}
                className="p-3.5 rounded-xl border border-normal bg-normal hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-strong flex items-center gap-1">
                      <MapPin size={13} className="text-primary shrink-0" />
                      {region.displayName}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-alternative border border-normal text-assistive">
                      {region.lawdCode}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                      수집 중
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-assistive flex-wrap">
                    <span>
                      적재 실거래:{" "}
                      <strong className="text-strong font-black">
                        {region.transactionCount.toLocaleString()}건
                      </strong>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={11} className="text-neutral" />
                      {formatPeriod(region.minDealDate, region.maxDealDate)}
                    </span>
                  </div>
                </div>

                {/* 작업 버튼 그룹 */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onOpenCollectModal(region.lawdCode, region.displayName, region)}
                    disabled={loadingCollect}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary-600 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    title="수집 기간을 지정하여 실거래 추가 수집"
                  >
                    <Database size={13} />
                    <span>추가 수집</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onDeleteRegion({ lawdCode: region.lawdCode, regionName: region.displayName })}
                      disabled={loadingCollect}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 border border-rose-300 bg-rose-50 hover:bg-rose-600 hover:text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-700 dark:hover:text-white"
                      title="이 지역의 자동 수집을 중단하고 적재된 실거래 데이터를 삭제합니다."
                    >
                      <Trash2 size={13} />
                      <span>수집 중지 및 삭제</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 모달 풋터 */}
        <div className="px-5 py-3 border-t border-normal bg-alternative/20 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[10px] text-assistive">
            ※ [수집 중지 및 삭제]를 누르면 새벽 자동 수집 대상에서 제외되고 적재 데이터가 삭제됩니다.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-normal text-xs font-bold text-neutral hover:bg-alternative transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
