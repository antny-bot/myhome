import {
  Calendar,
  AlertCircle,
  Database,
  MapPin,
  RefreshCw,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useLocale } from "../../lib/i18n";

export interface RegionSummary {
  lawdCode: string;
  displayName: string;
  createdAt: string;
  transactionCount: number;
  minDealDate: string | null;
  maxDealDate: string | null;
}

export interface CollectProgress {
  processed: number;
  total: number;
  success: number;
  failed: number;
  failures: { month: string; reason: string }[];
}

export interface RegionCollectModalProps {
  isOpen: boolean;
  modalData: {
    lawdCode: string;
    regionName: string;
    isExisting: boolean;
    existingRegion?: RegionSummary;
  } | null;
  onClose: () => void;
  startMonth: string;
  setStartMonth: (val: string) => void;
  endMonth: string;
  setEndMonth: (val: string) => void;
  modalError: string;
  loadingCollect: boolean;
  collectProgress: CollectProgress | null;
  shouldStopCollect: boolean;
  onStopCollect: () => void;
  onSubmit: () => void;
  onDelete: () => void;
  isAdmin?: boolean;
}

export function RegionCollectModal({
  isOpen,
  modalData,
  onClose,
  startMonth,
  setStartMonth,
  endMonth,
  setEndMonth,
  modalError,
  loadingCollect,
  collectProgress,
  shouldStopCollect,
  onStopCollect,
  onSubmit,
  onDelete,
  isAdmin = false,
}: RegionCollectModalProps) {
  const { t } = useLocale();

  if (!isOpen || !modalData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-elevated border border-normal rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="px-5 py-4 border-b border-normal bg-alternative/35 flex items-center justify-between">
          <h3 className="text-sm font-black text-strong flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-primary" />
            {modalData.isExisting ? "실거래 추가 집계 (기간 연장)" : "신규 지역 실거래 집계"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral hover:bg-alternative hover:text-strong transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 space-y-4 text-xs">
          {/* 지역 정보 요약 */}
          <div className="rounded-xl bg-alternative/30 backdrop-blur-xs p-3.5 border border-normal/50 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-assistive font-semibold">선택한 지역</span>
                <p className="text-sm font-black text-strong flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  {modalData.regionName}
                </p>
              </div>
              <span className="text-[10px] font-mono text-assistive bg-normal px-2 py-0.5 rounded border border-normal">
                코드 {modalData.lawdCode}
              </span>
            </div>

            {modalData.isExisting && modalData.existingRegion && (
              <div className="pt-2 border-t border-normal/30 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-assistive">기존 집계 건수</span>
                  <p className="font-bold text-strong mt-0.5">
                    {modalData.existingRegion.transactionCount.toLocaleString()}건
                  </p>
                </div>
                <div>
                  <span className="text-assistive">기존 집계 기간</span>
                  <p className="font-bold text-strong mt-0.5">
                    {modalData.existingRegion.minDealDate && modalData.existingRegion.maxDealDate
                      ? `${modalData.existingRegion.minDealDate.substring(0, 7)} ~ ${modalData.existingRegion.maxDealDate.substring(0, 7)}`
                      : "-"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 입력 기간 폼 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold text-neutral">
              <Calendar size={14} className="text-primary" />
              <span>집계 기간 설정 (YYYYMM 형식)</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="startMonth" className="text-[10px] text-neutral font-semibold">
                  시작년월
                </label>
                <input
                  id="startMonth"
                  type="text"
                  maxLength={6}
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value.replace(/\D/g, ""))}
                  placeholder="예: 202601"
                  className="w-full rounded-xl border border-normal bg-normal px-3 py-2 text-xs font-bold text-strong focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="endMonth" className="text-[10px] text-neutral font-semibold">
                  종료년월
                </label>
                <input
                  id="endMonth"
                  type="text"
                  maxLength={6}
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value.replace(/\D/g, ""))}
                  placeholder="예: 202607"
                  className="w-full rounded-xl border border-normal bg-normal px-3 py-2 text-xs font-bold text-strong focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-alternative/40 border border-normal text-[10px] text-neutral flex items-start gap-2 leading-relaxed">
              <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
              <span>
                {modalData.isExisting
                  ? "기존 수집 데이터와 겹치지 않는 추가 기간만 지정하셔도 되며, 이미 수집된 달을 포함해 집계하면 해당 기간의 로컬 실거래가 자동 업데이트(Upsert)됩니다."
                  : "집계 시작 시, 국토교통부 OpenAPI를 호출하여 실시간으로 해당 지역의 실거래 데이터를 긁어와 로컬 SQLite DB에 일괄upsert 및 적재합니다."}
              </span>
            </div>
          </div>

          {/* 집계 진행 상황 노출 */}
          {loadingCollect && collectProgress && (
            <div className="space-y-3 p-3.5 rounded-xl bg-primary-50/30 border border-primary-100 dark:bg-primary-950/10 dark:border-primary-900/20">
              <div className="flex gap-2">
                <div className="flex-1 py-2 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center gap-2 border border-primary/20 text-xs">
                  <RefreshCw size={13} className="animate-spin text-primary shrink-0" />
                  <span>
                    {t.collectingProgressText || "실거래 수집 중"} ({collectProgress.processed} / {collectProgress.total} 개월)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onStopCollect}
                  disabled={shouldStopCollect}
                  className="px-3.5 py-2 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg shadow-red-500/20 disabled:opacity-50 text-xs shrink-0"
                >
                  {t.stopBtn || "중단"}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-neutral">
                  <span>{t.collectProgressTitle || "실거래 데이터 수집 진행 상황"}</span>
                  <span>{Math.round((collectProgress.processed / collectProgress.total) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-alternative overflow-hidden border border-normal">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(collectProgress.processed / collectProgress.total) * 100}%` }}
                  />
                </div>
              </div>

              <div className="text-[10px] font-semibold text-neutral flex justify-between bg-alternative/40 p-2 rounded-lg border border-normal/50">
                <span>{t.progressStatsTitle || "진행 수치"}</span>
                <span>
                  성공: <span className="text-emerald-500 font-bold">{collectProgress.success}</span> | 실패:{" "}
                  <span className="text-red-500 font-bold">{collectProgress.failed}</span>
                </span>
              </div>

              {collectProgress.failures.length > 0 && (
                <div className="border border-red-500/20 rounded-lg bg-red-500/5 p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-red-600">
                    <span>⚠️ {t.collectFailuresTitle || "실거래 수집 실패 목록"} ({collectProgress.failures.length}건)</span>
                  </div>
                  <div className="overflow-y-auto max-h-40 border border-normal rounded bg-elevated text-[9px]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-normal bg-alternative/30 font-bold text-neutral">
                          <th className="p-1.5">{t.monthLabel || "대상월"}</th>
                          <th className="p-1.5">{t.reasonLabel || "실패 사유"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collectProgress.failures.map((fail, idx) => (
                          <tr key={idx} className="border-b border-normal last:border-0 hover:bg-alternative/20">
                            <td className="p-1.5 font-semibold text-neutral">{fail.month}</td>
                            <td className="p-1.5 text-red-500">{fail.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 에러 노출 */}
          {modalError && (
            <div className="p-2.5 rounded-lg bg-warn-50 border border-warn text-[10px] text-warn flex items-center gap-1.5 dark:bg-warn-900/10 dark:border-warn-900/30">
              <AlertCircle size={13} />
              <span>{modalError}</span>
            </div>
          )}
        </div>

        {/* 모달 풋터 */}
        <div className="px-5 py-3.5 bg-alternative/20 border-t border-normal flex items-center justify-between gap-3">
          {/* 관리자 권한 + 기존 등록 지역일 때만 수집 제외(삭제) 버튼 노출 */}
          {isAdmin && modalData.isExisting ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={loadingCollect}
              className="px-3.5 py-2 rounded-xl text-rose-600 border border-rose-200 bg-rose-50 hover:bg-rose-100 font-bold transition-colors flex items-center gap-1 disabled:opacity-50 dark:bg-rose-950/10 dark:border-rose-900/30 dark:text-rose-400"
            >
              <Trash2 size={13} />
              <span>집계 해제</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loadingCollect}
              className="px-4 py-2 rounded-xl border border-normal text-neutral hover:bg-alternative font-bold transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={loadingCollect}
              className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-700 font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loadingCollect ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>
                    {(t.collectProgressStatus || "집계 중")}{" "}
                    {collectProgress ? `(${collectProgress.processed}/${collectProgress.total})` : ""}
                  </span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>집계 시작</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
