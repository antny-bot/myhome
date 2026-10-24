import React from "react";
import { LucideIcon } from "lucide-react";
import { classNames } from "../../lib/format";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
}

interface ResponsiveTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
  rightAction?: React.ReactNode;
}

/**
 * 모바일-데스크톱 2-mode 반응형 탭 스트립 (docs/05_DESIGN.md 규격 준수)
 * - 데스크톱 (>= 768px): 밑줄 형태 탭 링크 (Underline Tabs)
 * - 모바일 (< 768px): 가로 스크롤 알약 캡슐 탭 (Scrollable Pill Tabs)
 */
export function ResponsiveTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  rightAction
}: ResponsiveTabsProps<T>) {
  return (
    <div
      className={classNames(
        "flex flex-col sm:flex-row sm:items-center justify-between border-b border-normal gap-2 pb-px overflow-visible",
        className
      )}
    >
      {/* 1. Desktop Underline Tabs (md+) */}
      <div className="hidden md:flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={classNames(
                "flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-neutral hover:text-strong"
              )}
            >
              {Icon && <Icon size={15} />}
              <span>{tab.label}</span>
              {tab.badge}
            </button>
          );
        })}
      </div>

      {/* 2. Mobile Scrollable Pill Tabs (< md) */}
      <div className="flex md:hidden overflow-x-auto scrollbar-none gap-2 pb-1 snap-x snap-mandatory flex-1 max-w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={classNames(
                "snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
                isActive
                  ? "bg-primary text-white shadow-sm shadow-primary/20"
                  : "bg-alternative text-neutral hover:text-strong"
              )}
            >
              {Icon && <Icon size={14} />}
              <span>{tab.label}</span>
              {tab.badge}
            </button>
          );
        })}
      </div>

      {/* Right Action slot */}
      {rightAction && (
        <div className="flex items-center gap-2 shrink-0 justify-end w-full sm:w-auto mt-2 sm:mt-0">
          {rightAction}
        </div>
      )}
    </div>
  );
}
