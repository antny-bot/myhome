import React, { useState } from "react";
import { Settings, ShieldAlert, Sliders, Globe, Bot, Info } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { classNames } from "../lib/format";
import type { DashboardState } from "../types";
import { useLocale } from "../lib/i18n";
import { SettingsMcpSection } from "../components/SettingsMcpSection";
import { SettingsAccountSection } from "../components/SettingsAccountSection";
import { SettingsGeneralSection } from "../components/SettingsGeneralSection";
import { SettingsNotificationSection } from "../components/SettingsNotificationSection";
import { SettingsAboutSection } from "../components/SettingsAboutSection";

type SettingsTab = "api" | "display" | "account" | "mcp" | "about";

interface SettingsPageProps {
  state: DashboardState | undefined;
  onChanged?: () => void;
  isAdmin?: boolean;
  userEmail?: string;
}

export function SettingsPage({ state, onChanged, isAdmin = false, userEmail }: SettingsPageProps) {
  const { t, locale } = useLocale();
  const [activeTab, setActiveTab] = useState<SettingsTab>("api");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader title={t.navSettings || "환경 설정"} icon={Settings} />

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
            <span>{t.settingsTabApi || "외부 API 연동 설정"}</span>
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
            <span>{t.settingsTabDisplay || "화면 표시 설정"}</span>
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
            <span>{t.settingsTabAccount || "계정 설정"}</span>
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
            <span>{t.mcpTabTitle || "MCP 연동"}</span>
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={classNames(
              "px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2",
              activeTab === "about"
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
            <Info size={16} />
            <span>{t.settingsTabAbout || "서비스 정보"}</span>
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
            <span>{t.settingsTabApiMobile || "연동 설정"}</span>
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
            <span>{t.settingsTabDisplayMobile || "표시 설정"}</span>
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
            <span>{t.settingsTabAccountMobile || "계정 설정"}</span>
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
            <span>{t.settingsTabMcpMobile || "MCP 연동"}</span>
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={classNames(
              "snap-start shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5",
              activeTab === "about"
                ? "bg-primary-600 text-white dark:bg-primary-500"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            <Info size={14} />
            <span>{t.settingsTabAboutMobile || "정보"}</span>
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
        <SettingsMcpSection t={t as any} userEmail={userEmail} />
      )}

      {activeTab === "about" && <SettingsAboutSection />}
    </div>
  );
}
