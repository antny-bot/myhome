import React, { useState } from "react";
import { Home, Gavel } from "lucide-react";
import { useLocale } from "../../../lib/i18n.js";
import type { ComplexTabProps } from "./types.js";
import { useComplexData } from "./useComplexData.js";
import { ComplexHeaderCard } from "./ComplexHeaderCard.js";
import { InfraScoreSection } from "./InfraScoreSection.js";
import { ComplexChartsSection } from "./ComplexChartsSection.js";
import { ComplexRecentTradesTable } from "./ComplexRecentTradesTable.js";
import { InfraModal } from "./InfraModal.js";
import { ComplexAuctionDetailModal } from "../../../components/ComplexAuctionDetailModal.js";

export function ComplexTab(props: ComplexTabProps) {
  const { t } = useLocale();
  const [showDetailInfras, setShowDetailInfras] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  const {
    complexName,
    selectedArea,
    setSelectedArea,
    availableSizes,
    loading,
    error,
    detailData,
    auctions,
    kpiData,
    groupedTx,
    recentTxStats,
    formatSizeString,
  } = useComplexData(props);

  if (!props.initialComplexName && !loading && !detailData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-elevated border border-normal rounded-xl text-neutral">
        <Home size={48} className="mb-3 opacity-30" />
        <p className="text-sm">{t.selectComplex || "상위 필터에서 분석할 단지를 선택해 주세요."}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-elevated border border-normal rounded-xl text-neutral">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
        <p className="text-sm font-semibold">{t.loading || "단지 상세 데이터를 불러오는 중..."}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-elevated border border-normal rounded-xl text-red-500">
        <p className="text-sm font-bold">{error}</p>
      </div>
    );
  }

  if (!detailData) return null;

  return (
    <div className="space-y-6">
      {/* 1. 단지 헤더 카드 (단지 정보, 스펙, 입지 등급 배지, 평수 선택 바) */}
      <ComplexHeaderCard
        complexName={complexName}
        detailData={detailData}
        metaFilter={props.metaFilter}
        selectedArea={selectedArea}
        setSelectedArea={setSelectedArea}
        availableSizes={availableSizes}
        formatSizeString={formatSizeString}
        areaUnit={props.areaUnit || "pyeong"}
        showDetailInfras={showDetailInfras}
        setShowDetailInfras={setShowDetailInfras}
        setShowInfoModal={setShowInfoModal}
      />

      {/* 경매 진행 물건 배너 (진행 경매가 있을 때만 표시) */}
      {auctions.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Gavel size={16} />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <span>{t.auctionCount.replace("{count}", String(auctions.length))}</span>
                {auctions[0]?.minPrice && (
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    · {t.auctionMinPrice} {(auctions[0].minPrice / 100000000).toFixed(2)}
                    {t.eokUnit}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                {auctions[0]?.srnSaNo || auctions[0]?.saNo}
                {auctions[0]?.saleDate ? ` · ${t.auctionSaleDate}: ${auctions[0].saleDate}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAuctionModal(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            {t.viewAuctionDetail}
          </button>
        </div>
      )}

      {/* 2. 지도 및 6대 인프라 평가 섹션 */}
      <InfraScoreSection
        detailData={detailData}
        showDetailInfras={showDetailInfras}
      />

      {/* 3. 월별 거래 트렌드 시계열 및 층별 분포 차트 섹션 */}
      {detailData.recentTx && detailData.recentTx.length > 0 ? (
        <>
          <ComplexChartsSection
            kpiData={kpiData}
            detailData={detailData}
            areaUnit={props.areaUnit || "pyeong"}
            auctions={auctions}
          />

          {/* 4. 최근 실거래 내역 테이블 */}
          <ComplexRecentTradesTable
            groupedTx={groupedTx}
            recentTxStats={recentTxStats}
            areaUnit={props.areaUnit || "pyeong"}
            areaType={props.areaType || "supply"}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-elevated border border-normal rounded-xl text-neutral">
          <Home size={48} className="mb-3 opacity-30" />
          <p className="text-sm">{t.noData || "선택한 조건의 실거래 데이터가 없습니다."}</p>
        </div>
      )}

      {/* 5. 입지 산출 기준 모달 */}
      <InfraModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />

      {/* 6. 경매 상세 모달 */}
      {showAuctionModal && (
        <ComplexAuctionDetailModal
          complex={{
            id: detailData.complexInfo?.id || `${props.lawdCode || ""}|${complexName}`,
            lawdCode: props.lawdCode || detailData.complexInfo?.lawdCode || "",
            regionName: detailData.complexInfo?.regionName || "",
            dongName: detailData.complexInfo?.dongName ?? null,
            jibun: detailData.complexInfo?.jibun ?? null,
            roadName: detailData.complexInfo?.roadName ?? null,
            name: complexName,
            lat: detailData.complexInfo?.lat ?? null,
            lng: detailData.complexInfo?.lng ?? null,
            txCount: recentTxStats?.totalCount ?? 0,
            latestPriceEok: kpiData?.latestAvg ?? recentTxStats?.avgPrice ?? null,
            avgPriceEok: recentTxStats?.avgPrice ? Number(recentTxStats.avgPrice.toFixed(2)) : null,
            minPriceEok: recentTxStats?.minPrice ?? null,
            maxPriceEok: recentTxStats?.maxPrice ?? null,
            latestDealDate: detailData.recentTx?.[0]?.dealDate ?? null,
          }}
          auctions={auctions}
          onClose={() => setShowAuctionModal(false)}
        />
      )}
    </div>
  );
}

export default ComplexTab;

