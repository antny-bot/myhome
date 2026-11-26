import React from "react";
import { X, ExternalLink, Gavel, Calendar, Building2, Phone, AlertCircle, TrendingDown } from "lucide-react";
import type { AuctionWithMatch, RegionMapComplexItem } from "@myhome/shared";
import { useLocale } from "../lib/i18n.js";

export interface ComplexAuctionDetailModalProps {
  complex: RegionMapComplexItem | null;
  auctions?: AuctionWithMatch[];
  onClose: () => void;
  onSelectComplex?: (complexName: string, lawdCode?: string) => void;
}

export function ComplexAuctionDetailModal({
  complex,
  auctions = [],
  onClose,
  onSelectComplex,
}: ComplexAuctionDetailModalProps) {
  const { t } = useLocale();

  if (!complex) return null;

  const complexAuctions = auctions.length > 0 ? auctions : ((complex as any).auctions as AuctionWithMatch[] | undefined) || [];

  const formatPrice = (price?: number | null) => {
    if (!price || price <= 0) return "-";
    const eok = Math.floor(price / 100000000);
    const man = Math.floor((price % 100000000) / 10000);
    if (eok > 0 && man > 0) {
      return `${eok}억 ${man.toLocaleString()}만원`;
    }
    if (eok > 0) {
      return `${eok}억원`;
    }
    return `${man.toLocaleString()}만원`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auction-modal-title"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Gavel size={18} />
            </div>
            <div className="min-w-0">
              <h2 id="auction-modal-title" className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                {complex.name} {t.auctionStatus || "경매 진행 물건"}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {complex.regionName} {complex.dongName || ""} · {complexAuctions.length}{t.auctionCases || "건 진행 중"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 단지 실거래 요약 바 */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">{t.latestDealPrice || "최근 실거래"}: <strong className="text-slate-900 dark:text-slate-100">{complex.latestPriceEok != null ? `${complex.latestPriceEok}억` : "-"}</strong></span>
            {complex.avgPriceEok != null && (
              <span className="text-slate-500">{t.avgDealPrice || "평균 실거래"}: <strong className="text-slate-900 dark:text-slate-100">{complex.avgPriceEok}억</strong></span>
            )}
          </div>
          {onSelectComplex && (
            <button
              onClick={() => {
                onClose();
                onSelectComplex(complex.name, complex.lawdCode);
              }}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              단지 분석 차트 보기 &rarr;
            </button>
          )}
        </div>

        {/* 경매 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          {complexAuctions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <AlertCircle size={32} className="opacity-40 mb-2" />
              <p className="text-xs">{t.noAuctionsFound || "진행 중인 경매 물건이 없습니다."}</p>
            </div>
          ) : (
            complexAuctions.map((item, idx) => {
              const discountFromAppraisal = item.appraisalPrice && item.minPrice
                ? Math.round((1 - item.minPrice / item.appraisalPrice) * 100)
                : null;

              // 최근 실거래가 대비 최저매각가격 할인율 계산
              const latestRealPriceWon = complex.latestPriceEok != null ? complex.latestPriceEok * 100000000 : null;
              const discountFromReal = latestRealPriceWon && item.minPrice
                ? Math.round((1 - item.minPrice / latestRealPriceWon) * 100)
                : null;

              return (
                <div key={item.docid || idx} className={idx > 0 ? "pt-3" : ""}>
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2.5">
                    {/* 상단: 사건번호 & 유찰/상태 배지 */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                          {item.caseNo || "사건번호 미기재"}
                        </span>
                        {item.itemNo && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                            물건 {item.itemNo}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.bidCount != null && item.bidCount > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900">
                            유찰 {item.bidCount}회
                          </span>
                        )}
                        {item.status && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 물건 상세 위치/동호수 및 면적 */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">
                        {item.address || complex.regionName}
                        {item.buldName ? ` ${item.buldName}` : ""}
                      </span>
                      {item.areaKey && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shrink-0 font-medium">
                          전유 {item.areaKey}㎡
                        </span>
                      )}
                    </div>

                    {/* 가격 정보 그리드 */}
                    <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">{t.appraisalPrice || "감정평가액"}</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {formatPrice(item.appraisalPrice)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-rose-500 font-bold">{t.minBidPrice || "최저매각가격"}</span>
                          {discountFromAppraisal != null && discountFromAppraisal > 0 && (
                            <span className="text-[10px] text-rose-600 font-extrabold flex items-center">
                              <TrendingDown size={10} className="mr-0.5" />
                              -{discountFromAppraisal}%
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                          {formatPrice(item.minPrice)}
                        </div>
                      </div>
                    </div>

                    {/* 실거래가 대비 비교 뱃지 */}
                    {discountFromReal != null && (
                      <div className="text-[11px] flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        <span>최근 실거래가({complex.latestPriceEok}억) 대비</span>
                        <strong className="font-extrabold">
                          {discountFromReal > 0 ? `${discountFromReal}% 저렴` : `${Math.abs(discountFromReal)}% 높음`}
                        </strong>
                      </div>
                    )}

                    {/* 매각기일 & 법원 정보 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>
                          {t.bidDate || "매각기일"}: <strong className="text-slate-700 dark:text-slate-300">{item.saleDate || "-"}</strong> {item.saleTime || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>{item.courtName || "관할법원"}</span>
                        {item.deptName && <span>· {item.deptName}</span>}
                        {item.contact && (
                          <span className="flex items-center gap-0.5">
                            <Phone size={10} />
                            {item.contact}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 비고 */}
                    {item.remarks && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/60 p-2 rounded-lg">
                        <span className="font-bold mr-1">비고:</span>
                        {item.remarks}
                      </div>
                    )}

                    {/* 대법원 원문 링크 */}
                    {item.linkUrl && (
                      <div className="pt-1 flex justify-end">
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold transition-colors"
                        >
                          <span>대법원 법원경매 원문 공고 보기</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default ComplexAuctionDetailModal;
