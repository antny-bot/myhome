import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteCheckRun } from "../api";
import { SectionCard } from "./SectionCard";
import { classNames, formatDate } from "../lib/format";
import type { CheckRun } from "../types";

export function RecentRuns({ runs, onChanged }: { runs: CheckRun[]; onChanged?: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openConfirmModal = (id: string) => setConfirmDeleteId(id);
  const closeConfirmModal = () => setConfirmDeleteId(null);

  async function handleConfirmDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    closeConfirmModal();
    setBusyId(id);
    try {
      await deleteCheckRun(id);
      onChanged?.();
    } catch {
      alert("삭제에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <SectionCard title="최근 체크 결과" subtitle="최근 5건의 자동/수동 실행 이력">
        <div className="space-y-4">
          {runs.slice(0, 5).map((run) => (
            <div key={run.id} className="group flex flex-col gap-2 p-3 rounded-xl border border-normal/50 bg-normal/30 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-strong group-hover:text-primary transition-colors truncate">{run.ruleName}</p>
                  <p className="mt-1 text-xs text-neutral leading-relaxed">{run.summary}</p>
                </div>
                <span
                  className={classNames(
                    "shrink-0 px-2 py-0.5 rounded text-[10px] font-bold",
                    run.matched ? "bg-emerald-500/10 text-emerald-500" : "bg-neutral/10 text-neutral"
                  )}
                >
                  {run.matched ? `${run.matches.length}건 매칭` : "없음"}
                </span>
              </div>

              {run.matched && (
                <div className="mt-1">
                  <button
                    onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                    className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    {expandedId === run.id ? "상세 내역 닫기" : "매칭 상세 내역 보기"}
                  </button>

                  {expandedId === run.id && (
                    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {run.matches.map((m, idx) => (
                        <div key={idx} className="bg-elevated p-2 rounded-lg border border-normal text-[11px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-strong">{m.apartmentName}</span>
                            <span className="ml-2 text-neutral">{m.floor ? `${m.floor}층` : ""} | {m.areaM2 ? `${m.areaM2}㎡` : ""}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{m.priceEok.toFixed(1)}억</p>
                            <p className="text-[10px] text-assistive">{m.dealDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-1 flex items-center justify-between text-[10px] text-assistive pt-2 border-t border-normal/20">
                 <span>{formatDate(run.createdAt)}</span>
                 <div className="flex items-center gap-1.5">
                   <span className="bg-alternative px-1.5 py-0.5 rounded">ID: {run.id.slice(0, 6)}</span>
                   <button
                     onClick={() => openConfirmModal(run.id)}
                     disabled={busyId === run.id}
                     title="삭제"
                     className="p-1 text-neutral hover:bg-red-500/10 hover:text-red-500 rounded transition-colors disabled:opacity-50"
                   >
                     <Trash2 className="h-3 w-3" />
                   </button>
                 </div>
              </div>
            </div>
          ))}
          {runs.length === 0 && (
             <p className="text-center py-6 text-sm text-neutral">체크 실행 이력이 없습니다.</p>
          )}
        </div>
      </SectionCard>

      {/* Custom Confirm Modal Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfirmModal} />
          {/* Modal Content */}
          <div className="relative bg-elevated border border-normal rounded-2xl p-6 shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-strong">이력 삭제</h3>
            <p className="mt-2 text-sm text-neutral leading-relaxed">
              이 체크 실행 결과를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="px-4 py-2 text-sm font-bold text-neutral hover:bg-alternative rounded-lg transition-colors border border-normal"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm shadow-red-500/20"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
