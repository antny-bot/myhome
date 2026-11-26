export interface BuildSearchOptions {
  lawdCode: string;
  usageL?: string;
  usageM?: string;
  usageS?: string;
  saleFrom?: string; // YYYYMMDD
  saleTo?: string;   // YYYYMMDD
  pageNo?: number;
  pageSize?: number;
}

export const ALLOWED_PAGE_SIZES = [10, 20, 50, 100] as const;

/**
 * lawd_code 5자리를 시도(2자리)와 시군구(3자리)로 분리합니다.
 * 예: "41117" -> { sidoCd: "41", sggCd: "117" }
 */
export function splitLawdCode(lawdCode: string): { sidoCd: string; sggCd: string } {
  const clean = lawdCode.trim();
  if (clean.length < 5) {
    throw new Error(`유효하지 않은 lawd_code 형식입니다: "${lawdCode}". 최소 5자리여야 합니다.`);
  }
  return {
    sidoCd: clean.substring(0, 2),
    sggCd: clean.substring(2, 5),
  };
}

/**
 * KST 기준 YYYY-MM-DD 날짜 문자열을 반환합니다.
 */
export function getKstDateStr(date: Date = new Date()): string {
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = kstTime.getUTCFullYear();
  const m = String(kstTime.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kstTime.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * KST 기준 YYYYMMDD 날짜 문자열을 생성합니다. (기본: 오늘 / 오늘+60일)
 */
export function getDefaultDateRange(now: Date = new Date()): { saleFrom: string; saleTo: string } {
  const saleFrom = getKstDateStr(now).replace(/-/g, "");
  const future = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const saleTo = getKstDateStr(future).replace(/-/g, "");

  return { saleFrom, saleTo };
}

/**
 * courtauction.go.kr searchControllerMain.on 에 전송할 47개 필드 페이로드를 생성합니다.
 */
export function buildSearchBody(options: BuildSearchOptions): Record<string, any> {
  const { sidoCd, sggCd } = splitLawdCode(options.lawdCode);

  const pageSize = options.pageSize ?? 50;
  if (!ALLOWED_PAGE_SIZES.includes(pageSize as any)) {
    throw new Error(
      `허용되지 않는 pageSize입니다: ${pageSize}. 허용값: ${ALLOWED_PAGE_SIZES.join(", ")}`
    );
  }

  const defaultDates = getDefaultDateRange();
  const bidBgngYmd = options.saleFrom ?? defaultDates.saleFrom;
  const bidEndYmd = options.saleTo ?? defaultDates.saleTo;

  const usageL = options.usageL ?? "20000";
  const usageM = options.usageM ?? "20100";
  const usageS = options.usageS ?? "20104";

  return {
    dma_pageInfo: {
      pageNo: options.pageNo ?? 1,
      pageSize,
      bfPageNo: "",
      startRowNo: "",
      totalCnt: "",
      totalYn: "Y",
      groupTotalCount: "",
    },
    dma_srchGdsDtlSrchInfo: {
      rletDspslSpcCondCd: "",
      bidDvsCd: "000331",
      mvprpRletDvsCd: "00031R",
      cortAuctnSrchCondCd: "0004601",
      rprsAdongSdCd: sidoCd,
      rprsAdongSggCd: sggCd,
      rprsAdongEmdCd: "",
      rdnmSdCd: "",
      rdnmSggCd: "",
      rdnmNo: "",
      mvprpDspslPlcAdongSdCd: "",
      mvprpDspslPlcAdongSggCd: "",
      mvprpDspslPlcAdongEmdCd: "",
      rdDspslPlcAdongSdCd: "",
      rdDspslPlcAdongSggCd: "",
      rdDspslPlcAdongEmdCd: "",
      cortOfcCd: "",
      jdbnCd: "",
      execrOfcDvsCd: "",
      lclDspslGdsLstUsgCd: usageL,
      mclDspslGdsLstUsgCd: usageM,
      sclDspslGdsLstUsgCd: usageS,
      cortAuctnMbrsId: "",
      aeeEvlAmtMin: "",
      aeeEvlAmtMax: "",
      lwsDspslPrcRateMin: "",
      lwsDspslPrcRateMax: "",
      flbdNcntMin: "",
      flbdNcntMax: "",
      objctArDtsMin: "",
      objctArDtsMax: "",
      mvprpArtclKndCd: "",
      mvprpArtclNm: "",
      mvprpAtchmPlcTypCd: "",
      notifyLoc: "off",
      lafjOrderBy: "",
      pgmId: "PGJ151F01",
      csNo: "",
      cortStDvs: "2",
      statNum: 1,
      bidBgngYmd,
      bidEndYmd,
      dspslDxdyYmd: "",
      fstDspslHm: "",
      scndDspslHm: "",
      thrdDspslHm: "",
      fothDspslHm: "",
      dspslPlcNm: "",
      lwsDspslPrcMin: "",
      lwsDspslPrcMax: "",
      grbxTypCd: "",
      gdsVendNm: "",
      fuelKndCd: "",
      carMdyrMax: "",
      carMdyrMin: "",
      carMdlNm: "",
      sideDvsCd: "",
    },
  };
}
