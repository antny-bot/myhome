import React, { useEffect, useState } from "react";
import {
  Gavel,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  ExternalLink,
  ChevronRight,
  Search,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  loadAuctionSummary,
  loadAuctionCollectRuns,
  loadUnmatchedAuctions,
  matchAuctionManually,
  triggerAuctionCollect,
  searchComplexNames,
} from "../../../api/index.js";
import type {
  AuctionSummary,
  AuctionCollectRun,
  AuctionCandidate,
  AuctionRecord,
  ComplexSearchResult,
} from "../../../types.js";
import { useLocale } from "../../../lib/i18n.js";

interface UnmatchedItem {
  auction: AuctionRecord;
  candidates: AuctionCandidate[];
}

export function DbAuctionTab() {
  const { t } = useLocale();

  // 1. 통계 & 이력 상태
  const [summary, setSummary] = useState<AuctionSummary | null>(null);
  const [runs, setRuns] = useState<AuctionCollectRun[]>([]);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // 2. 수동 수집 상태
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<string | null>(null);

  // 3. 미매핑 큐 상태
  const [unmatched, setUnmatched] = useState<UnmatchedItem[]>([]);
  const [loadingUnmatched, setLoadingUnmatched] = useState(false);
  const [matchingDocid, setMatchingDocid] = useState<string | null>(null);

  // 수동 검색/매칭용 상태
  const [manualSearches, setManualSearches] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, ComplexSearchResult[]>>({});
  const [selectedMatch, setSelectedMatch] = useState<Record<string, { id: string; name: string }>>({});

  const refreshData = async () => {
    setLoadingSummary(true);
    setLoadingUnmatched(true);
    try {
      const [sum, runData, unList] = await Promise.all([
        loadAuctionSummary().catch(() => null),
        loadAuctionCollectRuns().catch(() => ({ runs: [], isLocked: false, enabled: true, lastSuccessDate: null, blockedUntil: null })),
        loadUnmatchedAuctions().catch(() => []),
      ]);
      if (sum) setSummary(sum);
      if (runData) {
        setRuns(runData.runs || []);
        setBlockedUntil(runData.blockedUntil || null);
      }
      setUnmatched(unList || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSummary(false);
      setLoadingUnmatched(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const handleManualCollect = async () => {
    setCollecting(true);
    setCollectResult(null);
    try {
      const res = await triggerAuctionCollect();
      if (res.skipped) {
        setCollectResult(`수집 대기: ${res.reason || "이미 당일 수집되었거나 쿨다운 상태입니다."}`);
      } else {
        setCollectResult(
          `수집 완료: 총 ${res.totalCollected ?? res.totalCnt ?? 0}건 수집, 신규 ${res.insertedCount ?? res.matched ?? 0}건, 오류 ${res.errorCount ?? 0}건`
        );
      }
      await refreshData();
    } catch (e: any) {
      setCollectResult(`수집 실패: ${e.message || "오류가 발생했습니다."}`);
    } finally {
      setCollecting(false);
    }
  };

  const handleSearchComplex = async (docid: string, keyword: string) => {
    setManualSearches((prev) => ({ ...prev, [docid]: keyword }));
    if (!keyword.trim() || keyword.length < 2) {
      setSearchResults((prev) => ({ ...prev, [docid]: [] }));
      return;
    }
    try {
      const results = await searchComplexNames(keyword);
      setSearchResults((prev) => ({ ...prev, [docid]: results }));
    } catch {
      // ignore
    }
  };

  const handleConfirmMatch = async (docid: string) => {
    const target = selectedMatch[docid];
    if (!target || !target.id) {
      alert("매칭할 단지를 선택해 주세요.");
      return;
    }

    setMatchingDocid(docid);
    try {
      await matchAuctionManually(docid, target.id);
      // 큐에서 제거
      setUnmatched((prev) => prev.filter((item) => item.auction.docid !== docid));
      await refreshData();
    } catch (e: any) {
      alert(`매칭 실패: ${e.message || "오류가 발생했습니다."}`);
    } finally {
      setMatchingDocid(null);
    }
  };

  const formatPrice = (price?: number | null) => {
    if (!price || price <= 0) return "-";
    const eok = (price / 100000000).toFixed(2);
    return `${eok}억원`;
  };

  return (
    <div className="space-y-6">
      {/* 1. 상단 통계 & 즉시 수집 바 */}
      <div className="bg-elevated border border-normal rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Gavel size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-strong flex items-center gap-2">
                <span>{t.auctionAdminTitle || "대법원 경매 수집 및 단지 매칭"}</span>
                {blockedUntil && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold border border-rose-200">
                    <ShieldAlert size={10} />
                    차단 쿨다운 중 (~{blockedUntil})
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral">
                {t.auctionAdminDesc || "courtauction.go.kr 아파트 법원경매 데이터 수집 현황 및 미매핑 큐를 관리합니다."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshData()}
              disabled={loadingSummary}
              className="p-2 rounded-xl border border-normal text-neutral hover:text-strong hover:bg-normal transition-colors"
              title="새로고침"
            >
              <RefreshCw size={14} className={loadingSummary ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleManualCollect}
              disabled={collecting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {collecting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              <span>{collecting ? "수집 진행 중..." : t.manualCollectBtn || "즉시 수동 수집"}</span>
            </button>
          </div>
        </div>

        {/* 수집 결과 피드백 알림 */}
        {collectResult && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
            <CheckCircle2 size={15} className="text-blue-600 shrink-0 mt-0.5" />
            <span>{collectResult}</span>
          </div>
        )}

        {/* 4대 KPI 카드 그리드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-normal border border-normal">
            <span className="text-[11px] text-neutral">총 수집 경매 물건</span>
            <div className="text-base sm:text-lg font-black text-strong mt-0.5">
              {summary ? `${(summary.totalAuctions ?? summary.totalCount ?? 0).toLocaleString()}건` : "-"}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-normal border border-normal">
            <span className="text-[11px] text-neutral">경매 물건 단지 수</span>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {summary ? `${(summary.totalComplexes ?? summary.activeCount ?? 0).toLocaleString()}곳` : "-"}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-normal border border-normal">
            <span className="text-[11px] text-neutral">평균 최저가율</span>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary ? `${summary.avgMinPriceRate || 0}%` : "-"}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-normal border border-normal">
            <span className="text-[11px] text-neutral">미매핑 큐 대기</span>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {unmatched.length.toLocaleString()}건
            </div>
          </div>
        </div>
      </div>

      {/* 2. 미매핑 큐 수동 매칭 섹션 */}
      <div className="bg-elevated border border-normal rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="text-sm font-black text-strong">
              {t.unmatchedQueueTitle || "미매핑 경매 큐 (단지 수동 매칭)"}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
              {unmatched.length}건 대기 중
            </span>
          </div>
        </div>

        {loadingUnmatched ? (
          <div className="py-12 flex flex-col items-center justify-center text-neutral">
            <Loader2 size={24} className="animate-spin text-primary mb-2" />
            <span className="text-xs">미매핑 목록을 불러오는 중...</span>
          </div>
        ) : unmatched.length === 0 ? (
          <div className="py-10 text-center text-neutral flex flex-col items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-500 opacity-60 mb-2" />
            <p className="text-xs font-semibold">모든 경매 물건이 아파트 단지와 매칭되었습니다.</p>
          </div>
        ) : (
          <div className="space-y-3 divide-y divide-normal">
            {unmatched.map(({ auction: item, candidates }) => {
              const docid = item.docid;
              const curSearch = manualSearches[docid] || "";
              const curResults = searchResults[docid] || [];
              const selected = selectedMatch[docid];
              const isSubmitting = matchingDocid === docid;

              return (
                <div key={docid} className="pt-3 first:pt-0">
                  <div className="p-3.5 rounded-xl bg-normal border border-normal flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* 좌측: 물건 기본 정보 */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-strong">{item.caseNo || item.saNo || docid}</span>
                        {item.maemulSer && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            물건 {item.maemulSer}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral">{item.courtName}</span>
                        {item.saleDate && (
                          <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5">
                            <Calendar size={10} />
                            매각 {item.saleDate}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-strong flex items-center gap-1.5 flex-wrap">
                        <Building2 size={12} className="text-neutral shrink-0" />
                        <span className="font-semibold">{item.buldName || item.addrFull || item.address || "소재지 미기재"}</span>
                        {item.areaKey && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            전유 {item.areaKey}㎡
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral flex items-center gap-3">
                        <span>감정가: {formatPrice(item.appraisalAmt ?? item.appraisalPrice)}</span>
                        <span>최저가: <strong className="text-rose-600 dark:text-rose-400">{formatPrice(item.minPrice)}</strong></span>
                        {(item.failedCount != null || item.bidCount != null) && (
                          <span>유찰: {item.failedCount ?? item.bidCount}회</span>
                        )}
                      </div>

                      {/* 자동 추천 후보 단지가 있는 경우 */}
                      {candidates && candidates.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          <span className="text-[10px] text-neutral font-medium">추천 후보:</span>
                          {candidates.map((cand) => (
                            <button
                              key={cand.complexId}
                              type="button"
                              onClick={() => {
                                setSelectedMatch((prev) => ({
                                  ...prev,
                                  [docid]: { id: cand.complexId, name: cand.complexName },
                                }));
                                setManualSearches((prev) => ({ ...prev, [docid]: cand.complexName }));
                              }}
                              className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                                selected?.id === cand.complexId
                                  ? "bg-primary text-white border-primary font-bold shadow-xs"
                                  : "bg-elevated border-normal text-strong hover:border-primary"
                              }`}
                            >
                              {cand.complexName} ({Math.round(cand.distanceM)}m, {Math.round(cand.score * 100)}점)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 우측: 단지 매칭 컨트롤 */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 lg:w-96">
                      <div className="relative flex-1">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral" />
                        <input
                          type="text"
                          value={curSearch}
                          onChange={(e) => handleSearchComplex(docid, e.target.value)}
                          placeholder="매칭할 단지명 검색..."
                          className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-elevated border border-normal text-strong placeholder-neutral focus:outline-none focus:ring-1 focus:ring-primary"
                        />

                        {/* 검색 드롭다운 결과 */}
                        {curResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-elevated border border-normal rounded-lg shadow-lg z-30 max-h-40 overflow-y-auto">
                            {curResults.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedMatch((prev) => ({ ...prev, [docid]: { id: c.id, name: c.name } }));
                                  setManualSearches((prev) => ({ ...prev, [docid]: c.name }));
                                  setSearchResults((prev) => ({ ...prev, [docid]: [] }));
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-normal text-strong flex items-center justify-between"
                              >
                                <span>{c.name} ({c.regionName})</span>
                                <ChevronRight size={12} className="text-neutral" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleConfirmMatch(docid)}
                        disabled={isSubmitting || !selected}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 whitespace-nowrap"
                      >
                        {isSubmitting ? "저장 중..." : "매칭 확정"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. 최근 수집 이력 목록 */}
      <div className="bg-elevated border border-normal rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-black text-strong flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span>{t.recentCollectRunsTitle || "최근 경매 수집 실행 이력"}</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-normal text-neutral font-medium">
                <th className="py-2 px-3">실행 일시</th>
                <th className="py-2 px-3">법정동코드</th>
                <th className="py-2 px-3 text-right">요청 횟수</th>
                <th className="py-2 px-3 text-right">수집 / 매칭</th>
                <th className="py-2 px-3">상태</th>
                <th className="py-2 px-3">메모 / 에러</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-normal text-strong">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-neutral">
                    수집 이력이 아직 없습니다.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="hover:bg-normal/50 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">{r.startedAt}</td>
                    <td className="py-2.5 px-3 font-mono">{r.lawdCode || "전체"}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {r.requestCount}회
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral">
                      {r.fetched ?? r.totalCnt ?? 0}건 / {r.matched ?? 0}건
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.blocked
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                            : r.error
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {r.blocked ? "BLOCKED" : r.error ? "ERROR" : "SUCCESS"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral text-[11px] truncate max-w-xs">
                      {r.error || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DbAuctionTab;
