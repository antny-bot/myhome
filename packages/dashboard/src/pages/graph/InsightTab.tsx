import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GraphFilter, Insight } from "@myhome/shared";
import { loadGraphContext, loadInsights, saveInsight, deleteInsight, generateInsight } from "../../api";
import { promptTemplates, compileTemplate } from "./PromptTemplates";
import { Clipboard, Check, Save, Sparkles, Trash2, Calendar, FileText, ChevronDown, ChevronUp, Maximize2, X, HelpCircle } from "lucide-react";

const i18n = {
  ko: {
    write: "작성",
    preview: "미리보기",
    noContent: "입력된 내용이 없습니다.",
    aiPromptBuilder: "AI 프롬프트 생성기 (Text-to-Insight)",
    promptBuilderDesc: "필터 기반 통계를 추출하여 LLM 프롬프트를 빌드합니다.",
    templateType: "템플릿 유형",
    compiledPrompt: "조합된 프롬프트",
    copied: "복사 완료!",
    copyToClipboard: "클립보드 복사",
    usageTips: "사용 방법: 복사하기 버튼을 눌러 내용을 복사한 뒤, Gemini나 Claude, ChatGPT 등 평소 사용하는 외부 LLM 대화창에 바로 붙여넣어 인사이트를 분석하세요.",
    registerReport: "분석 보고서 등록",
    registerReportDesc: "외부 LLM의 답변 결과를 복사해 영구 리포트로 저장하거나 아래의 자동 생성 기능을 이용하세요.",
    reportTitle: "보고서 제목",
    titlePlaceholder: "예: 서울 서초구 2026년 상반기 아파트 가격추이 심층 분석",
    llmResponseLabel: "LLM 분석 응답 (마크다운 지원)",
    llmResponsePlaceholder: "외부 AI의 응답 분석 본문을 여기에 그대로 붙여넣어 주세요...",
    saveReport: "인사이트 보고서 수동 저장하기",
    savingReport: "보고서 저장 중...",
    aiReportHistory: "저장된 AI 분석 보고서 이력",
    noSavedReports: "저장된 분석 보고서가 없습니다.",
    deleteConfirm: "이 분석 보고서를 삭제하시겠습니까?",
    deleteReport: "보고서 삭제",
    promptSourceFolding: "프롬프트 원본 접기/펴기",
    reportSaved: "인사이트 분석 보고서가 저장되었습니다.",
    saveFailed: "저장 실패",
    priceTrend: "가격 추세",
    investmentEval: "투자 가치",
    abnormalDetect: "이상 거래",
    summaryTitle: "요약 통계 기반 LLM 응답 분석",
    promptTitle: "전송되었던 AI 프롬프트 본문",
    inputTitleAlert: "분석 결과 제목을 입력해 주세요.",
    inputResponseAlert: "외부 LLM(Gemini, Claude 등)의 응답 본문을 붙여넣어 주세요.",
    viewInModal: "모달로 보기",
    close: "닫기",
    generateAiInsight: "AI 리포트 자동 생성 (Gemini)",
    generatingAiInsight: "AI 분석 리포트 생성 중...",
    generateSuccess: "인사이트 리포트가 성공적으로 생성되었습니다.",
    selectRegionAlert: "검색 필터에서 지역(법정동)을 먼저 선택해 주세요."
  },
  en: {
    write: "Write",
    preview: "Preview",
    noContent: "No content entered.",
    aiPromptBuilder: "AI Prompt Builder (Text-to-Insight)",
    promptBuilderDesc: "Builds an LLM prompt by extracting statistics based on filters.",
    templateType: "Template Type",
    compiledPrompt: "Compiled Prompt",
    copied: "Copied!",
    copyToClipboard: "Copy to Clipboard",
    usageTips: "How to use: Click the copy button to copy the content, then paste it into your external LLM chat window (like Gemini, Claude, or ChatGPT) to analyze insights.",
    registerReport: "Register Analysis Report",
    registerReportDesc: "Copy and paste the response from the external LLM to save it as a permanent report or use auto-generation below.",
    reportTitle: "Report Title",
    titlePlaceholder: "e.g., In-depth analysis of apartment price trends in Seocho-gu, Seoul, H1 2026",
    llmResponseLabel: "LLM Analysis Response (Markdown supported)",
    llmResponsePlaceholder: "Please paste the response body of the external AI here...",
    saveReport: "Manually Save Insight Report",
    savingReport: "Saving report...",
    aiReportHistory: "Saved AI Analysis Report History",
    noSavedReports: "No saved analysis reports.",
    deleteConfirm: "Are you sure you want to delete this analysis report?",
    deleteReport: "Delete Report",
    promptSourceFolding: "Toggle Prompt Source",
    reportSaved: "Insight analysis report has been saved.",
    saveFailed: "Failed to save",
    priceTrend: "Price Trend",
    investmentEval: "Investment Value",
    abnormalDetect: "Abnormal Deal",
    summaryTitle: "LLM Response Analysis Based on Summary Statistics",
    promptTitle: "Sent AI Prompt Body",
    inputTitleAlert: "Please enter the title of the analysis report.",
    inputResponseAlert: "Please paste the response body from the external LLM (Gemini, Claude, etc.).",
    viewInModal: "View in Modal",
    close: "Close",
    generateAiInsight: "Auto-generate AI Report (Gemini)",
    generatingAiInsight: "Generating AI Analysis Report...",
    generateSuccess: "Insight report has been successfully generated.",
    selectRegionAlert: "Please select a region in the search filter first."
  }
};

const currentLang: "ko" | "en" = (navigator.language.startsWith("ko") ? "ko" : "en") as "ko" | "en";
const t = (key: keyof typeof i18n["ko"]) => i18n[currentLang][key];

const MarkdownComponents = {
  h1: ({ ...props }) => <h1 className="text-base font-bold border-b border-normal pb-1.5 mb-3 mt-5 text-strong" {...props} />,
  h2: ({ ...props }) => <h2 className="text-sm font-bold border-b border-normal pb-1 mb-2.5 mt-4 text-strong" {...props} />,
  h3: ({ ...props }) => <h3 className="text-xs font-bold mb-2 mt-3.5 text-strong" {...props} />,
  p: ({ ...props }) => <p className="mb-2.5 text-neutral leading-relaxed text-xs" {...props} />,
  ul: ({ ...props }) => <ul className="list-disc pl-4 mb-3 space-y-1 text-neutral text-xs" {...props} />,
  ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-3 space-y-1 text-neutral text-xs" {...props} />,
  li: ({ ...props }) => <li className="text-neutral text-xs" {...props} />,
  strong: ({ ...props }) => <strong className="font-bold text-strong" {...props} />,
  em: ({ ...props }) => <em className="italic" {...props} />,
  code: ({ className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const inline = !match;
    return inline ? (
      <code className="bg-normal border border-normal px-1 py-0.5 rounded text-xs font-mono text-primary" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-normal border border-normal p-3 rounded-lg overflow-x-auto text-xs font-mono text-neutral mb-3.5 leading-relaxed">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  blockquote: ({ ...props }) => (
    <blockquote className="border-l-3 border-primary pl-2.5 italic my-3 text-assistive text-xs" {...props} />
  ),
  table: ({ ...props }) => (
    <div className="overflow-x-auto my-3 border border-normal rounded-lg">
      <table className="min-w-full divide-y divide-normal text-left text-xs" {...props} />
    </div>
  ),
  thead: ({ ...props }) => <thead className="bg-alternative text-neutral" {...props} />,
  tbody: ({ ...props }) => <tbody className="divide-y divide-normal bg-elevated/40" {...props} />,
  tr: ({ ...props }) => <tr {...props} />,
  th: ({ ...props }) => <th className="px-3 py-1.5 font-semibold text-strong" {...props} />,
  td: ({ ...props }) => <td className="px-3 py-1.5 text-neutral" {...props} />,
};


interface InsightTabProps {
  filter: GraphFilter;
  regionName?: string;
}

export default function InsightTab({ filter, regionName }: InsightTabProps) {
  // 프롬프트 빌더 관련 상태
  const [dataContext, setDataContext] = useState("데이터를 불러오는 중입니다...");
  const [selectedTemplateId, setSelectedTemplateId] = useState(promptTemplates[0].id);
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [llmResponse, setLlmResponse] = useState("");
  const [insightTitle, setInsightTitle] = useState("");
  const [writeMode, setWriteMode] = useState<"write" | "preview">("write");
  const [modalInsight, setModalInsight] = useState<Insight | null>(null);
  
  // 상태 피드백
  const [loadingContext, setLoadingContext] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 저장된 인사이트 목록 상태
  const [savedInsights, setSavedInsights] = useState<Insight[]>([]);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // 데이터 컨텍스트 로드
  const fetchContext = async () => {
    setLoadingContext(true);
    try {
      const text = await loadGraphContext(filter);
      setDataContext(text);
    } catch (err) {
      console.error("Failed to load data context", err);
      setDataContext("실거래 요약 데이터를 생성하지 못했습니다. 검색 필터를 조절해 보세요.");
    } finally {
      setLoadingContext(false);
    }
  };

  // 인사이트 이력 로드
  const fetchInsights = async () => {
    try {
      const data = await loadInsights();
      setSavedInsights(data.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      console.error("Failed to load insights history", err);
    }
  };

  useEffect(() => {
    fetchContext();
  }, [filter]);

  useEffect(() => {
    fetchInsights();
  }, []);

  // 템플릿 선택 및 프롬프트 생성 자동 동기화
  useEffect(() => {
    const activeTemplate = promptTemplates.find((t) => t.id === selectedTemplateId);
    if (activeTemplate) {
      const compiled = compileTemplate(activeTemplate.template, dataContext);
      setCompiledPrompt(compiled);
    }
  }, [selectedTemplateId, dataContext]);

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveResult = async () => {
    if (!insightTitle.trim()) {
      alert(t("inputTitleAlert"));
      return;
    }
    if (!llmResponse.trim()) {
      alert(t("inputResponseAlert"));
      return;
    }

    setSaving(true);
    try {
      await saveInsight({
        title: insightTitle,
        filter,
        promptTemplate: selectedTemplateId,
        generatedPrompt: compiledPrompt,
        response: llmResponse,
        source: "manual"
      });
      setInsightTitle("");
      setLlmResponse("");
      fetchInsights();
      alert(t("reportSaved"));
    } catch (err) {
      console.error("Failed to save insight", err);
      alert(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInsight = async () => {
    if (!filter.lawdCode) {
      alert(t("selectRegionAlert"));
      return;
    }
    setGenerating(true);
    try {
      const newInsight = await generateInsight(filter.lawdCode, filter.complexName, regionName);
      setInsightTitle("");
      setLlmResponse("");
      await fetchInsights();
      alert(t("generateSuccess"));
      if (newInsight && newInsight.id) {
        setExpandedInsightId(newInsight.id);
      }
    } catch (err: any) {
      console.error("AI Insight generation failed:", err);
      alert(err.message || "인사이트 생성 도중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInsight = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await deleteInsight(id);
      fetchInsights();
    } catch (err) {
      console.error("Failed to delete insight", err);
    }
  };

  const toggleExpandInsight = (id: string) => {
    setExpandedInsightId(expandedInsightId === id ? null : id);
  };

  return (
    <div className="space-y-6 text-strong">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 프롬프트 빌더 */}
        <div className="bg-elevated border border-normal rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-normal pb-2">
              <h3 className="text-sm font-bold text-strong flex items-center gap-1.5">
                <Sparkles size={16} className="text-primary" />
                <span>{t("aiPromptBuilder")}</span>
              </h3>
              <p className="text-xs text-assistive mt-1">{t("promptBuilderDesc")}</p>
            </div>

            {/* 템플릿 선택 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral font-semibold">{t("templateType")}</label>
              <div className="flex md:grid md:grid-cols-3 gap-2 overflow-x-auto pb-1 max-w-full shrink-0">
                {promptTemplates.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTemplateId(item.id)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition whitespace-nowrap ${
                      selectedTemplateId === item.id
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-normal border-normal hover:bg-alternative text-neutral"
                    }`}
                  >
                    {item.id === "price-trend" ? t("priceTrend") : item.id === "investment-eval" ? t("investmentEval") : t("abnormalDetect")}
                  </button>
                ))}
              </div>
            </div>

            {/* 생성된 프롬프트 영역 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral font-semibold">{t("compiledPrompt")}</label>
                <button
                  onClick={handleCopy}
                  className="text-xs text-primary flex items-center gap-1 hover:underline focus:outline-none"
                >
                  {copied ? (
                    <>
                      <Check size={13} />
                      <span>{t("copied")}</span>
                    </>
                  ) : (
                    <>
                      <Clipboard size={13} />
                      <span>{t("copyToClipboard")}</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={compiledPrompt}
                readOnly
                className="w-full h-72 bg-normal border border-normal rounded-lg p-3 text-xs text-neutral font-mono focus:outline-none focus:ring-0 leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="bg-normal/50 border border-normal rounded-lg p-3 text-xs text-neutral mt-2 leading-relaxed flex items-start gap-1.5">
            <HelpCircle size={14} className="text-neutral mt-0.5 shrink-0" />
            <span>{t("usageTips")}</span>
          </div>
        </div>

        {/* 우측: 결과 입력 및 저장 */}
        <div className="bg-elevated border border-normal rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-normal pb-2">
              <h3 className="text-sm font-bold text-strong flex items-center gap-1.5">
                <Save size={16} className="text-primary" />
                <span>{t("registerReport")}</span>
              </h3>
              <p className="text-xs text-assistive mt-1">{t("registerReportDesc")}</p>
            </div>

            {/* 리포트 제목 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral font-semibold">{t("reportTitle")}</label>
              <input
                type="text"
                value={insightTitle}
                onChange={(e) => setInsightTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                className="w-full bg-normal border border-normal rounded-lg px-3 py-2 text-sm text-strong focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 답변 입력 및 미리보기 탭 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-neutral font-semibold">{t("llmResponseLabel")}</label>
                <div className="flex gap-1 bg-normal border border-normal rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setWriteMode("write")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                      writeMode === "write"
                        ? "bg-primary text-white"
                        : "text-neutral hover:bg-alternative"
                    }`}
                  >
                    {t("write")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWriteMode("preview")}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded transition ${
                      writeMode === "preview"
                        ? "bg-primary text-white"
                        : "text-neutral hover:bg-alternative"
                    }`}
                  >
                    {t("preview")}
                  </button>
                </div>
              </div>
              {writeMode === "write" ? (
                <textarea
                  value={llmResponse}
                  onChange={(e) => setLlmResponse(e.target.value)}
                  placeholder={t("llmResponsePlaceholder")}
                  className="w-full h-64 bg-normal border border-normal rounded-lg p-3 text-xs text-strong placeholder-assistive focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed resize-none"
                />
              ) : (
                <div className="w-full h-64 bg-normal border border-normal rounded-lg p-3 text-xs text-strong overflow-y-auto leading-relaxed border-l-2 border-primary">
                  {llmResponse.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {llmResponse}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-assistive italic text-center mt-20">{t("noContent")}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI 자동 생성 버튼 */}
          <button
            onClick={handleGenerateInsight}
            disabled={generating || loadingContext}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-alternative disabled:to-alternative text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition"
          >
            <Sparkles size={16} className={generating ? "animate-pulse" : ""} />
            <span>{generating ? t("generatingAiInsight") : t("generateAiInsight")}</span>
          </button>

          {/* 수동 등록 버튼 */}
          <button
            onClick={handleSaveResult}
            disabled={saving || generating}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-normal border border-normal hover:bg-alternative disabled:bg-alternative text-strong font-semibold rounded-lg transition"
          >
            <Save size={16} />
            <span>{saving ? t("savingReport") : t("saveReport")}</span>
          </button>
        </div>
      </div>

      {/* 하단: 저장된 분석 보고서 목록 */}
      <div className="bg-elevated border border-normal rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-strong mb-4 flex items-center gap-1.5">
          <FileText size={16} className="text-primary" />
          <span>{t("aiReportHistory")}</span>
        </h3>

        {savedInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-assistive">
            <FileText size={32} className="mb-2 opacity-25" />
            <p className="text-xs">{t("noSavedReports")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedInsights.map((insight) => {
              const isExpanded = expandedInsightId === insight.id;
              return (
                <div
                  key={insight.id}
                  className="border border-normal rounded-lg overflow-hidden bg-normal/30"
                >
                  <div
                    onClick={() => toggleExpandInsight(insight.id)}
                    className="flex justify-between items-center p-4 bg-elevated/60 hover:bg-alternative cursor-pointer transition"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-strong">{insight.title}</p>
                      <div className="flex items-center gap-3 text-[10px] text-assistive">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                        <span className="px-1.5 py-0.5 bg-alternative rounded text-[10px] font-semibold text-neutral">
                          {insight.promptTemplate === "price-trend"
                            ? t("priceTrend")
                            : insight.promptTemplate === "investment-eval"
                            ? t("investmentEval")
                            : t("abnormalDetect")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalInsight(insight);
                        }}
                        className="p-1.5 hover:bg-alternative text-assistive hover:text-primary rounded-lg transition"
                        title={t("viewInModal")}
                      >
                        <Maximize2 size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteInsight(insight.id, e)}
                        className="p-1.5 hover:bg-alternative text-assistive hover:text-warn rounded-lg transition"
                        title={t("deleteReport")}
                      >
                        <Trash2 size={14} />
                      </button>
                      {isExpanded ? <ChevronUp size={16} className="text-neutral" /> : <ChevronDown size={16} className="text-neutral" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-normal bg-normal/20 text-neutral text-xs leading-relaxed space-y-4 max-h-[400px] overflow-y-auto">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-assistive uppercase block">{t("summaryTitle")}</span>
                        <div className="text-strong border-l-2 border-primary pl-3">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                            {insight.response}
                          </ReactMarkdown>
                        </div>
                      </div>

                      <div className="border-t border-normal/60 pt-3 space-y-1.5">
                        <span className="text-[10px] font-bold text-assistive uppercase block">{t("promptTitle")}</span>
                        <details className="cursor-pointer group">
                          <summary className="text-[10px] text-assistive hover:text-neutral outline-none select-none">
                            {t("promptSourceFolding")}
                          </summary>
                          <pre className="mt-2 p-3 bg-elevated border border-normal rounded text-xs font-mono text-assistive whitespace-pre-wrap select-all">
                            {insight.generatedPrompt}
                          </pre>
                        </details>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 분석 보고서 상세 모달 */}
      {modalInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in">
          <div className="bg-elevated border border-normal rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center p-4 border-b border-normal bg-elevated/80">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-strong leading-none">{modalInsight.title}</h3>
                <div className="flex items-center gap-2 text-[10px] text-assistive mt-1">
                  <span className="flex items-center gap-0.5">
                    <Calendar size={10} />
                    {new Date(modalInsight.createdAt).toLocaleDateString()}
                  </span>
                  <span className="px-1.5 py-0.2 bg-alternative rounded text-[10px] font-semibold text-neutral">
                    {modalInsight.promptTemplate === "price-trend"
                      ? t("priceTrend")
                      : modalInsight.promptTemplate === "investment-eval"
                      ? t("investmentEval")
                      : t("abnormalDetect")}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalInsight(null)}
                className="text-neutral hover:text-strong p-1 hover:bg-alternative rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* 모달 바디 (스크롤 가능) */}
            <div className="p-5 overflow-y-auto space-y-5 text-neutral text-xs leading-relaxed flex-1">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-assistive uppercase block">{t("summaryTitle")}</span>
                <div className="text-strong border-l-2 border-primary pl-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                    {modalInsight.response}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="border-t border-normal/60 pt-4 space-y-1.5">
                <span className="text-[10px] font-bold text-assistive uppercase block">{t("promptTitle")}</span>
                <details className="cursor-pointer group">
                  <summary className="text-[10px] text-assistive hover:text-neutral outline-none select-none">
                    {t("promptSourceFolding")}
                  </summary>
                  <pre className="mt-2 p-3 bg-elevated border border-normal rounded text-[10px] font-mono text-assistive whitespace-pre-wrap select-all">
                    {modalInsight.generatedPrompt}
                  </pre>
                </details>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="p-3 bg-normal/30 border-t border-normal flex justify-end">
              <button
                onClick={() => setModalInsight(null)}
                className="px-4 py-1.5 bg-primary hover:bg-primary/80 text-white text-xs font-semibold rounded-lg transition shadow-md shadow-primary/10"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
