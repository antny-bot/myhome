import React, { useEffect } from "react";
import { X, ExternalLink, Gavel, Calendar, Building2, Phone, AlertCircle, TrendingDown } from "lucide-react";
import type { AuctionWithMatch, RegionMapComplexItem } from "@myhome/shared";
import { useLocale } from "../lib/i18n.js";

const DEFAULT_COURT_AUCTION_URL =
  "https://www.courtauction.go.kr/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml&pgjId=151F00";

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
  const { t, locale } = useLocale();

  useEffect(() => {
    if (!complex) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [complex, onClose]);

  if (!complex) return null;

  const complexAuctions =
    auctions.length > 0 ? auctions : ((complex as any).auctions as AuctionWithMatch[] | undefined) || [];

  const formatPrice = (price?: number | null) => {
    if (!price || price <= 0) return "-";
    if (locale === "en") {
      return `${(price / 100000000).toFixed(2)} Eok`;
    }
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
                {complex.name} {t.auctionStatus}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                {complex.regionName} {complex.dongName || ""} · {complexAuctions.length}
                {t.auctionCases}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label={t.close || "Close"}
          >
            <X size={18} />
          </button>
        </div>

        {/* 단지 실거래 요약 바 */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">
              {t.latestDealPrice}:{" "}
              <strong className="text-slate-900 dark:text-slate-100">
                {complex.latestPriceEok != null ? `${complex.latestPriceEok}${t.eokUnit}` : "-"}
              </strong>
            </span>
            {complex.avgPriceEok != null && (
              <span className="text-slate-500">
                {t.avgDealPrice}:{" "}
                <strong className="text-slate-900 dark:text-slate-100">
                  {complex.avgPriceEok}
                  {t.eokUnit}
                </strong>
              </span>
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
              {t.auctionViewComplexChart}
            </button>
          )}
        </div>

        {/* 경매 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          {complexAuctions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
              <AlertCircle size={32} className="opacity-40 mb-2" />
              <p className="text-xs">{t.noAuctionsFound}</p>
            </div>
          ) : (
            complexAuctions.map((item, idx) => {
              const caseNumber = item.srnSaNo || item.caseNo || item.saNo || t.auctionCaseNoUnknown;
              const itemNo = item.maemulSer || item.itemNo;
              const appraisalVal = item.appraisalAmt ?? item.appraisalPrice ?? null;
              const failedCnt = item.failedCount ?? item.bidCount ?? 0;
              const areaVal = item.areaM2 ?? (item.areaKey ? Number((item.areaKey / 100).toFixed(2)) : null);
              const addrText =
                item.addrFull ||
                item.address ||
                [item.addrSido, item.addrSigu, item.addrDong, item.addrLotno].filter(Boolean).join(" ") ||
                complex.regionName;
              const telText = item.courtTel || item.contact;
              const linkHref = item.linkUrl || DEFAULT_COURT_AUCTION_URL;

              const discountFromAppraisal =
                appraisalVal && item.minPrice ? Math.round((1 - item.minPrice / appraisalVal) * 100) : null;

              const latestPriceEok = complex.latestPriceEok ?? item.latestPriceEok ?? null;
              const latestRealPriceWon = latestPriceEok != null ? latestPriceEok * 100000000 : null;
              const discountFromReal =
                latestRealPriceWon && item.minPrice
                  ? Math.round((1 - item.minPrice / latestRealPriceWon) * 100)
                  : null;

              return (
                <div key={item.docid || idx} className={idx > 0 ? "pt-3" : ""}>
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2.5">
                    {/* 상단: 사건번호 & 유찰/상태 배지 */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                          {caseNumber}
                        </span>
                        {itemNo && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                            {t.auctionItemNo.replace("{no}", String(itemNo))}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {failedCnt > 0 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900">
                            {t.auctionFailedCount.replace("{count}", String(failedCnt))}
                          </span>
                        )}
                        {(item.status || item.statusCd) && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                            {item.status || (item.statusCd === "01" ? t.auctionBadge : item.statusCd)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 물건 상세 위치/동호수 및 면적 */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-full">
                        {addrText}
                        {item.dongHo && !addrText.includes(item.dongHo) ? ` ${item.dongHo}` : ""}
                      </span>
                      {areaVal != null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shrink-0 font-medium">
                          {t.auctionExclusiveArea.replace("{area}", String(areaVal))}
                        </span>
                      )}
                    </div>

                    {/* 가격 정보 그리드 */}
                    <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <div>
                        <div className="text-[10px] text-slate-400">{t.appraisalPrice}</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {formatPrice(appraisalVal)}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-rose-500 font-bold">{t.minBidPrice}</span>
                          {discountFromAppraisal != null && discountFromAppraisal > 0 && (
                            <span className="text-[10px] text-rose-600 font-extrabold flex items-center">
                              <TrendingDown size={10} className="mr-0.5" />-{discountFromAppraisal}%
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400">
                          {formatPrice(item.minPrice)}
                        </div>
                      </div>
                    </div>

                    {/* 실거래가 대비 비교 뱃지 */}
                    {discountFromReal != null && latestPriceEok != null && (
                      <div className="text-[11px] flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        <span>{t.auctionCompareRealPrice.replace("{price}", String(latestPriceEok))}</span>
                        <strong className="font-extrabold">
                          {discountFromReal > 0
                            ? t.auctionDiscountCheaper.replace("{rate}", String(discountFromReal))
                            : t.auctionDiscountHigher.replace("{rate}", String(Math.abs(discountFromReal)))}
                        </strong>
                      </div>
                    )}

                    {/* 매각기일 & 법원 정보 */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400" />
                        <span>
                          {t.bidDate}: <strong className="text-slate-700 dark:text-slate-300">{item.saleDate || "-"}</strong>{" "}
                          {item.saleTime || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{item.courtName || t.auctionCourt}</span>
                        {item.deptName && <span>· {item.deptName}</span>}
                        {telText && (
                          <span className="flex items-center gap-0.5">
                            <Phone size={10} />
                            {telText}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 매각장소 / 비고 */}
                    {(item.salePlace || item.remarks) && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/60 p-2 rounded-lg">
                        {item.salePlace || item.remarks}
                      </div>
                    )}

                    {/* 대법원 원문 링크 */}
                    <div className="pt-1 flex justify-end">
                      <a
                        href={linkHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold transition-colors"
                      >
                        <span>{t.auctionOriginalLink}</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 하단 주의 문구 및 닫기 버튼 */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.auctionOriginalNotice}</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            {t.close || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ComplexAuctionDetailModal;

