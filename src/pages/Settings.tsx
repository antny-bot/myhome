import { Database } from "lucide-react";
import { ConstraintBanner } from "../components/ConstraintBanner";
import { SectionCard } from "../components/SectionCard";
import { classNames } from "../lib/format";
import type { DashboardState } from "../types";

export function SettingsPage({ state }: { state: DashboardState | undefined }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-strong tracking-tight">환경 설정</h2>
        <p className="text-sm text-neutral">데이터 소스와 알림 채널 연동 상태를 확인하세요.</p>
      </header>

      <ConstraintBanner />

      <SectionCard
        title="시스템 상태"
        right={<Database className="h-4 w-4 text-primary" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-2">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">데이터 소스</p>
            <p className="text-xs font-bold text-strong">PlayMCP</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">텔레그램</p>
            <p className={classNames("text-xs font-bold", state?.config.telegramConfigured ? "text-emerald-500" : "text-warn")}>
              {state?.config.telegramConfigured ? "활성" : "점검 필요"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">카카오</p>
            <p className="text-xs font-bold text-neutral">준비 중</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral uppercase">현재 버전</p>
            <p className="text-xs font-bold text-strong">V0.1.0</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
