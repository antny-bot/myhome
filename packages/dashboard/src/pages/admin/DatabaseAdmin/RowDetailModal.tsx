import React, { useState } from "react";
import { Check, Copy, Eye, X } from "lucide-react";
import { classNames } from "../../../lib/format.js";

interface RowDetailModalProps {
  selectedRowDetail: Record<string, any> | null;
  onClose: () => void;
}

export function RowDetailModal({ selectedRowDetail, onClose }: RowDetailModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!selectedRowDetail) return null;

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const copyEntireJson = () => {
    handleCopyText("all", JSON.stringify(selectedRowDetail, null, 2));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-elevated border border-normal rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-normal px-5 py-4 bg-alternative/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-strong">행 상세 데이터</h3>
              <p className="text-[11px] text-neutral">선택된 레코드의 모든 컬럼과 값을 열람합니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyEntireJson}
              className="px-2.5 py-1.5 rounded-lg border border-normal bg-elevated text-xs font-semibold text-strong hover:bg-alternative transition-colors flex items-center gap-1.5"
              title="전체 데이터를 JSON 형식으로 복사합니다."
            >
              {copiedKey === "all" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-neutral" />
                  <span>JSON 복사</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral hover:text-strong hover:bg-alternative transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 모달 바디 (Key-Value 리스트) */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-2">
          <div className="border border-normal rounded-xl overflow-hidden divide-y divide-normal/40">
            {Object.entries(selectedRowDetail).map(([colName, val]) => {
              const valStr = val === null || val === undefined ? "" : String(val);
              const isNull = val === null || val === undefined;

              return (
                <div
                  key={colName}
                  className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-4 p-3 hover:bg-alternative/30 items-start transition-colors"
                >
                  <span className="text-xs font-bold text-neutral font-mono select-all">{colName}</span>
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <span
                      className={classNames(
                        "text-xs font-mono break-all select-all",
                        isNull ? "text-assistive italic" : "text-strong font-semibold"
                      )}
                    >
                      {isNull ? "NULL" : valStr}
                    </span>
                    {!isNull && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(colName, valStr)}
                        className="p-1 rounded text-neutral hover:text-primary hover:bg-alternative shrink-0 transition-colors"
                        title="값 복사"
                      >
                        {copiedKey === colName ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className="border-t border-normal px-5 py-3 bg-alternative/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-alternative hover:bg-normal text-xs font-bold text-strong border border-normal transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
