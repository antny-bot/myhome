import React, { useState, useEffect } from "react";
import { GraphFilter, Insight } from "@myhome/shared";
import { loadGraphContext, loadInsights, saveInsight, deleteInsight } from "../../api";
import { promptTemplates, compileTemplate } from "./PromptTemplates";
import { Clipboard, Check, Save, Sparkles, Trash2, Calendar, FileText, ChevronDown, ChevronUp } from "lucide-react";

interface InsightTabProps {
  filter: GraphFilter;
}

export default function InsightTab({ filter }: InsightTabProps) {
  // 프롬프트 빌더 관련 상태
  const [dataContext, setDataContext] = useState("데이터를 불러오는 중입니다...");
  const [selectedTemplateId, setSelectedTemplateId] = useState(promptTemplates[0].id);
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [llmResponse, setLlmResponse] = useState("");
  const [insightTitle, setInsightTitle] = useState("");
  
  // 상태 피드백
  const [loadingContext, setLoadingContext] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

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
      alert("분석 결과 제목을 입력해 주세요.");
      return;
    }
    if (!llmResponse.trim()) {
      alert("외부 LLM(Gemini, Claude 등)의 응답 본문을 붙여넣어 주세요.");
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
      alert("인사이트 분석 보고서가 저장되었습니다.");
    } catch (err) {
      console.error("Failed to save insight", err);
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInsight = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 분석 보고서를 삭제하시겠습니까?")) return;
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
    <div className="space-y-6 text-slate-100">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 프롬프트 빌더 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles size={16} className="text-emerald-400" />
                <span>AI 프롬프트 생성기 (Text-to-Insight)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">필터 기반 통계를 추출하여 LLM 프롬프트를 빌드합니다.</p>
            </div>

            {/* 템플릿 선택 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold">템플릿 유형</label>
              <div className="grid grid-cols-3 gap-2">
                {promptTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                      selectedTemplateId === t.id
                        ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                        : "bg-slate-850 border-slate-800 hover:bg-slate-800 text-slate-400"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 생성된 프롬프트 영역 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-400 font-semibold">조합된 프롬프트</label>
                <button
                  onClick={handleCopy}
                  className="text-xs text-emerald-400 flex items-center gap-1 hover:underline focus:outline-none"
                >
                  {copied ? (
                    <>
                      <Check size={13} />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard size={13} />
                      <span>클립보드 복사</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                value={compiledPrompt}
                readOnly
                className="w-full h-72 bg-slate-950 border border-slate-850 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none focus:ring-0 leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-850 rounded-lg p-3 text-xs text-slate-400 mt-2 leading-relaxed">
            💡 <strong className="text-slate-200">사용 방법:</strong> 복사하기 버튼을 눌러 내용을 복사한 뒤, Gemini나 Claude, ChatGPT 등 평소 사용하는 외부 LLM 대화창에 바로 붙여넣어 인사이트를 분석하세요.
          </div>
        </div>

        {/* 우측: 결과 입력 및 저장 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Save size={16} className="text-emerald-400" />
                <span>분석 보고서 등록</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">외부 LLM의 답변 결과를 복사해 영구 리포트로 저장합니다.</p>
            </div>

            {/* 리포트 제목 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold">보고서 제목</label>
              <input
                type="text"
                value={insightTitle}
                onChange={(e) => setInsightTitle(e.target.value)}
                placeholder="예: 서울 서초구 2026년 상반기 아파트 가격추이 심층 분석"
                className="w-full bg-slate-855 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 답변 입력 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold">LLM 분석 응답 (마크다운 지원)</label>
              <textarea
                value={llmResponse}
                onChange={(e) => setLlmResponse(e.target.value)}
                placeholder="외부 AI의 응답 분석 본문을 여기에 그대로 붙여넣어 주세요..."
                className="w-full h-64 bg-slate-955 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveResult}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold rounded-lg shadow-lg shadow-emerald-950/20 transition"
          >
            <Save size={16} />
            <span>{saving ? "보고서 저장 중..." : "인사이트 보고서 저장하기"}</span>
          </button>
        </div>
      </div>

      {/* 하단: 저장된 분석 보고서 목록 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-1.5">
          <FileText size={16} className="text-emerald-400" />
          <span>저장된 AI 분석 보고서 이력</span>
        </h3>

        {savedInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <FileText size={32} className="mb-2 opacity-25" />
            <p className="text-xs">저장된 분석 보고서가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedInsights.map((insight) => {
              const isExpanded = expandedInsightId === insight.id;
              return (
                <div
                  key={insight.id}
                  className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/30"
                >
                  <div
                    onClick={() => toggleExpandInsight(insight.id)}
                    className="flex justify-between items-center p-4 bg-slate-900/60 hover:bg-slate-850/40 cursor-pointer transition"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-white">{insight.title}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] font-semibold text-slate-400">
                          {insight.promptTemplate === "price-trend" ? "가격 추세" : insight.promptTemplate === "investment-eval" ? "투자 가치" : "이상 거래"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleDeleteInsight(insight.id, e)}
                        className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition"
                        title="보고서 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-slate-850 bg-slate-950/20 text-slate-300 text-xs leading-relaxed space-y-4 max-h-[400px] overflow-y-auto">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">요약 통계 기반 LLM 응답 분석</span>
                        <div className="whitespace-pre-wrap font-sans text-slate-200 border-l-2 border-emerald-500 pl-3">
                          {insight.response}
                        </div>
                      </div>

                      <div className="border-t border-slate-850/60 pt-3 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">전송되었던 AI 프롬프트 본문</span>
                        <details className="cursor-pointer group">
                          <summary className="text-[10px] text-slate-500 hover:text-slate-300 outline-none select-none">
                            프롬프트 원본 접기/펴기
                          </summary>
                          <pre className="mt-2 p-3 bg-slate-900 border border-slate-850 rounded text-[10px] font-mono text-slate-500 whitespace-pre-wrap select-all">
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
    </div>
  );
}
