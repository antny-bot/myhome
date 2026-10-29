import React, { useState } from "react";
import { Home } from "lucide-react";
import { useLocale } from "../../../lib/i18n.js";
import type { ComplexTabProps } from "./types.js";
import { useComplexData } from "./useComplexData.js";
import { ComplexHeaderCard } from "./ComplexHeaderCard.js";
import { InfraScoreSection } from "./InfraScoreSection.js";
import { ComplexChartsSection } from "./ComplexChartsSection.js";
import { ComplexRecentTradesTable } from "./ComplexRecentTradesTable.js";
import { InfraModal } from "./InfraModal.js";

export function ComplexTab(props: ComplexTabProps) {
  const { t } = useLocale();
  const [showDetailInfras, setShowDetailInfras] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const {
    complexName,
    selectedArea,
    setSelectedArea,
    availableSizes,
    loading,
    error,
    detailData,
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
          />

          {/* 4. 최근 실거래 내역 테이블 */}
          <ComplexRecentTradesTable
            groupedTx={groupedTx}
            recentTxStats={recentTxStats}
            areaUnit={props.areaUnit || "pyeong"}
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
    </div>
  );
}

export default ComplexTab;
