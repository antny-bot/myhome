import React, { useState, useEffect } from "react";
import {
  Key,
  Copy,
  Check,
  Trash2,
  Cpu,
  Bot,
  ExternalLink,
  ShieldAlert,
  Server,
  RefreshCw,
  Search,
  Building,
  History,
  BarChart3,
  MapPin,
  Bell,
  Code2,
} from "lucide-react";
import { useBreakpoint } from "../useBreakpoint";
import { SectionCard } from "./SectionCard";
import { classNames } from "../lib/format";
import {
  getMcpTokens,
  createMcpToken,
  deleteMcpToken,
  type McpToken,
  type CreatedMcpTokenResponse,
} from "../api";
import { copy, type Translations } from "../locales/ko";

interface SettingsMcpSectionProps {
  t: Translations;
  userEmail?: string;
}

export function SettingsMcpSection({ t }: SettingsMcpSectionProps) {
  const { isMobile } = useBreakpoint();

  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedToken, setIssuedToken] = useState<CreatedMcpTokenResponse | null>(null);

  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [clientTab, setClientTab] = useState<"claude" | "cursor" | "antigravity">("claude");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const sseUrl = `${window.location.origin}/api/v1/mcp/sse`;

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getMcpTokens();
      setTokens(data);
    } catch (err: any) {
      setErrorMsg(err.message || "MCP 토큰 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);
    try {
      const created = await createMcpToken(newTokenName.trim() || "MCP AI Client Token");
      setIssuedToken(created);
      setNewTokenName("");
      await loadTokens();
    } catch (err: any) {
      setErrorMsg(err.message || "토큰 발급에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteToken = async (id: string, name: string) => {
    const confirmed = window.confirm(
      t.mcpDeleteTokenConfirm || `정말 '${name}' 토큰을 폐기하시겠습니까?`
    );
    if (!confirmed) return;

    setErrorMsg("");
    try {
      await deleteMcpToken(id);
      if (issuedToken?.id === id) {
        setIssuedToken(null);
      }
      setSuccessMsg("토큰이 성공적으로 폐기되었습니다.");
      setTimeout(() => setSuccessMsg(""), 3000);
      await loadTokens();
    } catch (err: any) {
      setErrorMsg(err.message || "토큰 폐기에 실패했습니다.");
    }
  };

  const copyToClipboard = async (text: string, type: "token" | "url" | "config") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "token") {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else if (type === "url") {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedConfig(true);
        setTimeout(() => setCopiedConfig(false), 2000);
      }
    } catch {
      alert("클립보드 복사에 실패했습니다.");
    }
  };

  const getClientConfigJson = () => {
    const tokenDisplay = issuedToken ? issuedToken.raw_token : "myh_mcp_YOUR_TOKEN_HERE";

    if (clientTab === "claude") {
      // Claude Desktop config format (using mcp-remote bridge for SSE compatibility)
      return JSON.stringify(
        {
          mcpServers: {
            "myhome-realestate": {
              command: "npx",
              args: [
                "-y",
                "mcp-remote",
                sseUrl,
                "--header",
                `Authorization: Bearer ${tokenDisplay}`,
              ],
            },
          },
        },
        null,
        2
      );
    }

    if (clientTab === "cursor") {
      return JSON.stringify(
        {
          mcpServers: {
            "myhome": {
              url: sseUrl,
              headers: {
                Authorization: `Bearer ${tokenDisplay}`,
              },
            },
          },
        },
        null,
        2
      );
    }

    // antigravity
    return JSON.stringify(
      {
        mcpServers: {
          "myhome-mcp": {
            url: sseUrl,
            headers: {
              Authorization: `Bearer ${tokenDisplay}`,
            },
          },
        },
      },
      null,
      2
    );
  };

  const toolsList = [
    {
      name: "search_complexes",
      desc: t.toolSearchComplexes,
      icon: Search,
    },
    {
      name: "get_complex_detail",
      desc: t.toolGetComplexDetail,
      icon: Building,
    },
    {
      name: "get_recent_transactions",
      desc: t.toolGetRecentTransactions,
      icon: History,
    },
    {
      name: "get_transaction_stats",
      desc: t.toolGetTransactionStats,
      icon: BarChart3,
    },
    {
      name: "search_regions",
      desc: t.toolSearchRegions,
      icon: MapPin,
    },
    {
      name: "list_monitoring_rules",
      desc: t.toolListMonitoringRules,
      icon: Bell,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 알림 메시지 */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. SSE 엔드포인트 URL 안내 */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{t.mcpSseEndpointTitle}</span>
          </div>
        }
        subtitle={t.mcpSseEndpointDesc}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 select-all break-all">
            {sseUrl}
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(sseUrl, "url")}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
          >
            {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedUrl ? t.mcpCopied : t.mcpCopyUrl}</span>
          </button>
        </div>
      </SectionCard>

      {/* 2. MCP 토큰 발급 & 관리 */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>{t.mcpTokensSectionTitle}</span>
          </div>
        }
        subtitle={t.mcpTokensSectionDesc}
      >
        {/* 신규 발급 폼 */}
        <form onSubmit={handleCreateToken} className="mb-6 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t.mcpTokenNameLabel}
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder={t.mcpTokenNamePlaceholder}
              className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              {isSubmitting ? t.mcpIssuingToken : t.mcpIssueTokenBtn}
            </button>
          </div>
        </form>

        {/* 발급된 토큰 알림 (일회성 노출) */}
        {issuedToken && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{t.mcpNewTokenIssuedTitle}</span>
              </div>
              <button
                type="button"
                onClick={() => setIssuedToken(null)}
                className="text-xs text-amber-700 dark:text-amber-300 hover:underline"
              >
                {t.mcpCloseNotice}
              </button>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {t.mcpNewTokenIssuedWarning}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-amber-500/30 font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 select-all break-all">
                {issuedToken.raw_token}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(issuedToken.raw_token, "token")}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
              >
                {copiedToken ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToken ? t.mcpCopied : t.mcpCopyToken}</span>
              </button>
            </div>
          </div>
        )}

        {/* 토큰 목록 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {t.mcpTokenListTitle} ({tokens.length})
            </h4>
            <button
              type="button"
              onClick={loadTokens}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={classNames("w-3.5 h-3.5", loading && "animate-spin")} />
              <span>새로고침</span>
            </button>
          </div>

          {tokens.length === 0 ? (
            <div className="py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              {t.mcpNoTokens}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">{t.mcpThName}</th>
                    <th className="py-2.5 px-3 font-medium">{t.mcpThPrefix}</th>
                    <th className="py-2.5 px-3 font-medium hidden md:table-cell">{t.mcpThCreatedAt}</th>
                    <th className="py-2.5 px-3 font-medium hidden sm:table-cell">{t.mcpThLastUsedAt}</th>
                    <th className="py-2.5 px-3 font-medium text-right">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {tokens.map((tok) => (
                    <tr key={tok.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {tok.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {tok.token_prefix}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {tok.created_at ? new Date(tok.created_at).toLocaleString() : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                        {tok.last_used_at ? new Date(tok.last_used_at).toLocaleString() : t.mcpNeverUsed}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteToken(tok.id, tok.name)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors"
                          title={t.mcpDeleteToken}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 3. 클라이언트 연동 설정 가이드 */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{t.mcpConfigGuideTitle}</span>
          </div>
        }
        subtitle={t.mcpConfigGuideDesc}
      >
        {/* 탭 헤더 */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4 gap-2">
          {(["claude", "cursor", "antigravity"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setClientTab(tab)}
              className={classNames(
                "px-3.5 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5",
                clientTab === tab
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Bot className="w-4 h-4" />
              <span>
                {tab === "claude"
                  ? t.mcpTabClaude
                  : tab === "cursor"
                  ? t.mcpTabCursor
                  : t.mcpTabAntigravity}
              </span>
            </button>
          ))}
        </div>

        {/* 탭별 파일 경로 힌트 */}
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {clientTab === "claude" && (
            <span>
              💡 설정 파일 경로: <code>%APPDATA%\Claude\claude_desktop_config.json</code> (Windows) 또는{" "}
              <code>~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS)
            </span>
          )}
          {clientTab === "cursor" && (
            <span>
              💡 프로젝트 루트의 <code>.cursor/mcp.json</code> 파일 또는 Cursor Settings &gt; Features &gt; MCP
            </span>
          )}
          {clientTab === "antigravity" && (
            <span>
              💡 프로젝트 또는 사용자 전용 <code>mcp_config.json</code>의 <code>mcpServers</code> 항목
            </span>
          )}
        </div>

        {/* JSON 코드 블록 */}
        <div className="relative">
          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs sm:text-sm overflow-x-auto border border-slate-800 leading-relaxed">
            {getClientConfigJson()}
          </pre>
          <button
            type="button"
            onClick={() => copyToClipboard(getClientConfigJson(), "config")}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors shadow-sm border border-slate-700"
          >
            {copiedConfig ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedConfig ? t.mcpCopied : t.mcpCopyConfig}</span>
          </button>
        </div>
      </SectionCard>

      {/* 4. 지원되는 MCP Tools 명세 */}
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.mcpSupportedToolsTitle}</span>
          </div>
        }
        subtitle={t.mcpSupportedToolsDesc}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {toolsList.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.name}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                    {tool.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tool.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
