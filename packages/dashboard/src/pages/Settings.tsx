import React, { useState } from "react";
import { Settings, ShieldAlert, Sliders, Globe, Bot } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { classNames } from "../lib/format";
import type { DashboardState } from "../types";
import { copy } from "../locales/ko";
import { SettingsMcpSection } from "../components/SettingsMcpSection";
import { SettingsAccountSection } from "../components/SettingsAccountSection";
import { SettingsGeneralSection } from "../components/SettingsGeneralSection";
import { SettingsNotificationSection } from "../components/SettingsNotificationSection";

const locale: "ko" | "en" = "ko";
const t = copy[locale];

type SettingsTab = "api" | "display" | "account" | "mcp";

interface SettingsPageProps {
  state: DashboardState | undefined;
  onChanged?: () => void;
  isAdmin?: boolean;
  userEmail?: string;
}

export function SettingsPage({ state, onChanged, isAdmin = false, userEmail }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("api");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader title="환경 설정" icon={Settings} />

      {/* Responsive 2-mode Tab Strip */}
      <div className="relative">
        {/* Desktop Underline Tab Strip */}
        <div className="hidden md:flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("api")}
            className={classNames(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2",
              activeTab === "api"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <Globe size={16} />
            <span>외부 API 연동 설정</span>
          </button>
          <button
            onClick={() => setActiveTab("display")}
            className={classNames(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2",
              activeTab === "display"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <Sliders size={16} />
            <span>화면 표시 설정</span>
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={classNames(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2",
              activeTab === "account"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <ShieldAlert size={16} />
            <span>계정 설정</span>
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={classNames(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2",
              activeTab === "mcp"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <Bot size={16} />
            <span>{t.mcpTabTitle}</span>
          </button>
        </div>

        {/* Mobile Pill-like Tabs */}
        <div className="flex md:hidden overflow-x-auto scrollbar-none gap-2 pb-1 snap-x snap-mandatory">
          <button
            onClick={() => setActiveTab("api")}
            className={classNames(
              "snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
              activeTab === "api"
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            <Globe size={14} />
            <span>연동 설정</span>
          </button>
          <button
            onClick={() => setActiveTab("display")}
            className={classNames(
              "snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
              activeTab === "display"
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            <Sliders size={14} />
            <span>표시 설정</span>
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={classNames(
              "snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
              activeTab === "account"
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            <ShieldAlert size={14} />
            <span>계정 설정</span>
          </button>
          <button
            onClick={() => setActiveTab("mcp")}
            className={classNames(
              "snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
              activeTab === "mcp"
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            <Bot size={14} />
            <span>{t.mcpTabTitle}</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "account" && (
        <SettingsAccountSection userEmail={userEmail} onChanged={onChanged} />
      )}

      {activeTab === "api" && (
        <SettingsNotificationSection
          state={state}
          isAdmin={isAdmin}
          onChanged={onChanged}
          locale={locale}
        />
      )}

      {activeTab === "display" && <SettingsGeneralSection />}

      {activeTab === "mcp" && (
        <SettingsMcpSection t={t} userEmail={userEmail} />
      )}
    </div>
  );
}
