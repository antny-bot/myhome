import { ShieldAlert } from "lucide-react";
import { classNames } from "../lib/format";

export const sourceNotice = "PlayMCP 실거래가/단지정보 기반입니다. 현재 매물, 호가, 매물 등록/삭제 알림이 아닙니다.";

export function ConstraintBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      className={classNames("rounded-xl border border-amber-200/50 bg-amber-500/10 text-amber-900 dark:text-amber-200", compact ? "p-3" : "p-4")}
    >
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="font-bold">데이터 제약사항</p>
          <p className="mt-1 text-sm leading-relaxed">{sourceNotice}</p>
        </div>
      </div>
    </div>
  );
}
