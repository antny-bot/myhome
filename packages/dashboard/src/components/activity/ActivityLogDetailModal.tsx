import React from "react";
import { Activity, X } from "lucide-react";

interface ActivityLogDetailModalProps {
  payload: string | null;
  onClose: () => void;
}

export function ActivityLogDetailModal({ payload, onClose }: ActivityLogDetailModalProps) {
  if (payload === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-elevated border border-normal shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in scale-in duration-200">
        <div className="flex items-center justify-between border-b border-normal px-4 py-3 shrink-0">
          <h3 className="text-sm font-bold text-strong flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            <span>상세 페이로드 데이터 (JSON)</span>
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral hover:bg-normal hover:text-strong transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-alternative/30 font-mono text-[11px] text-strong leading-relaxed whitespace-pre-wrap select-all">
          {(() => {
            try {
              const parsed = JSON.parse(payload);
              return JSON.stringify(parsed, null, 2);
            } catch {
              return payload;
            }
          })()}
        </div>

        <div className="border-t border-normal px-4 py-3 bg-normal/30 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-primary/80 text-white text-xs font-bold rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
