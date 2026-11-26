import type { AuctionRecord } from "@myhome/shared";

/**
 * 면적 문자열에서 ㎡ 숫자를 추출합니다.
 * 예: "철근콘크리트조\r\n84.96㎡" -> 84.96
 * 예: "84.96" -> 84.96
 */
export function parseAreaM2(areaStr?: string | number | null): number | null {
  if (areaStr == null) return null;
  const str = String(areaStr).replace(/,/g, "").trim();
  if (!str) return null;

  const match = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:㎡|m2)?/i);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

/**
 * YYYYMMDD 날짜 문자열을 YYYY-MM-DD 로 변환합니다.
 */
export function formatSaleDate(rawDate?: string | null): string | null {
  if (!rawDate) return null;
  const digits = String(rawDate).replace(/[^0-9]/g, "");
  if (digits.length >= 8) {
    const y = digits.substring(0, 4);
    const m = digits.substring(4, 6);
    const d = digits.substring(6, 8);
    return `${y}-${m}-${d}`;
  }
  return null;
}

/**
 * HHMM 또는 시각 문자열을 HH:MM 형식으로 변환합니다.
 * 예: "1000" -> "10:00", "10" -> "10:00"
 */
export function formatSaleTime(rawTime?: string | null): string | null {
  if (!rawTime) return null;
  const digits = String(rawTime).replace(/[^0-9]/g, "");
  if (digits.length >= 4) {
    return `${digits.substring(0, 2)}:${digits.substring(2, 4)}`;
  } else if (digits.length >= 2) {
    return `${digits.substring(0, 2)}:00`;
  }
  return null;
}

/**
 * 대법원 법원경매 원본 검색 결과 아이템을 정규화된 AuctionRecord 로 변환합니다.
 */
export function normalizeAuctionItem(item: Record<string, any>, now = new Date().toISOString()): AuctionRecord {
  const docid = String(item.docid || "");
  const boCd = String(item.bo_cd ?? item.boCd ?? "");
  const saNo = String(item.sa_no ?? item.saNo ?? "");
  const srnSaNo = String(item.srn_sa_no ?? item.printCsNo ?? "");
  const maemulSer = String(item.maemulSer ?? item.maemul_ser ?? "1");
  const mokmulSer = String(item.mokmulSer ?? item.mokmul_ser ?? "1");

  // 시도2자리 + 시군구3자리 -> lawd_code 5자리
  const sidoCd = String(item.daepyoSidoCd ?? "").trim();
  const siguCd = String(item.daepyoSiguCd ?? "").trim();
  const lawdCode = sidoCd && siguCd ? `${sidoCd}${siguCd}` : null;

  const courtName = item.jiwonNm ? String(item.jiwonNm).trim() : null;
  const deptName = item.jpDeptNm ? String(item.jpDeptNm).trim() : null;
  const courtTel = item.tel ? String(item.tel).trim() : null;

  const usageL = item.lclsUtilCd ? String(item.lclsUtilCd).trim() : null;
  const usageM = item.mclsUtilCd ? String(item.mclsUtilCd).trim() : null;
  const usageS = item.sclsUtilCd ? String(item.sclsUtilCd).trim() : null;
  const usageName = item.dspslUsgNm ? String(item.dspslUsgNm).trim() : null;

  const addrSido = item.hjguSido ? String(item.hjguSido).trim() : null;
  const addrSigu = item.hjguSigu ? String(item.hjguSigu).trim() : null;
  const addrDong = item.hjguDong ? String(item.hjguDong).trim() : null;
  const addrLotno = item.daepyoLotno ? String(item.daepyoLotno).trim() : null;
  const addrRoad = item.rdNm ?? item.rd1Nm ? String(item.rdNm ?? item.rd1Nm).trim() : null;
  const addrBuldNo = item.buldNo ? String(item.buldNo).trim() : null;
  const addrFull = item.printSt ? String(item.printSt).trim() : null;

  const buldName = item.buldNm ? String(item.buldNm).trim() : null;
  const dongHo = item.buldList ? String(item.buldList).trim() : null;

  // 면적 파싱
  const areaM2 = parseAreaM2(item.areaList) ?? parseAreaM2(item.minArea) ?? parseAreaM2(item.maxArea);
  const areaKey = areaM2 != null ? Math.round(areaM2 * 100) : null;

  // 금액 파싱
  const parseNum = (val: any): number | null => {
    if (val == null) return null;
    const n = Number(String(val).replace(/,/g, "").trim());
    return isNaN(n) ? null : n;
  };

  const appraisalAmt = parseNum(item.gamevalAmt);
  const minPrice = parseNum(item.minmaePrice ?? item.notifyMinmaePrice1);

  let minPriceRate = parseNum(item.notifyMinmaePriceRate1);
  if (minPriceRate == null && appraisalAmt && minPrice && appraisalAmt > 0) {
    minPriceRate = Math.round((minPrice / appraisalAmt) * 100 * 10) / 10;
  }

  const failedCount = parseNum(item.yuchalCnt) ?? 0;

  const saleDate = formatSaleDate(item.maeGiil);
  const saleTime = formatSaleTime(item.maeHh1);
  const salePlace = item.maePlace ? String(item.maePlace).trim() : null;

  const statusCd = String(item.mulStatcd ?? "01");
  const progressCd = item.jinstatCd ? String(item.jinstatCd).trim() : null;
  const bidTypeCd = String(item.bidDvsCd ?? item.ipchalGbncd ?? "000331");

  // 진행 여부 (mulJinYn !== 'Y' 이면 진행 종료)
  const isClosed = item.mulJinYn && String(item.mulJinYn).toUpperCase() !== "Y";
  const closedAt = isClosed ? now : null;

  return {
    docid,
    boCd,
    saNo,
    srnSaNo,
    maemulSer,
    mokmulSer,
    lawdCode,
    courtName,
    deptName,
    courtTel,
    usageL,
    usageM,
    usageS,
    usageName,
    addrSido,
    addrSigu,
    addrDong,
    addrLotno,
    addrRoad,
    addrBuldNo,
    addrFull,
    buldName,
    dongHo,
    areaM2,
    areaKey,
    appraisalAmt,
    minPrice,
    minPriceRate,
    failedCount,
    saleDate,
    saleTime,
    salePlace,
    statusCd,
    progressCd,
    bidTypeCd,
    rawJson: JSON.stringify(item),
    lat: null,
    lng: null,
    geocodedAt: null,
    firstSeenAt: now,
    lastSeenAt: now,
    closedAt,
  };
}
