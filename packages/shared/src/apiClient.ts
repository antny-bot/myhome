import { parseRealEstateXml } from "./xmlParser.js";

export type RawTransaction = {
  apartmentName: string;
  dealDate: string;
  priceEok: number;
  areaM2?: number;
  floor?: number;
  dongName?: string;   // 법정동명 (umdNm)
  jibun?: string;      // 지번
  roadName?: string;   // 도로명 (roadNm)
};

// 헬퍼: 텍스트 또는 숫자로 변환된 필드 읽기
function readString(record: Record<string, any>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value.trim();
    if (value !== undefined && value !== null) return String(value).trim();
  }
  return undefined;
}

function readNumber(record: Record<string, any>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      const parsed = parseFloat(cleaned);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return undefined;
}

// 실거래 내역 정규화
export function normalizeTransaction(item: unknown, fallbackMonth: string): RawTransaction | undefined {
  if (!item || typeof item !== "object") return undefined;
  const r = item as Record<string, any>;

  // 아파트명 (aptNm, apartmentName, aptName 등)
  const apartmentName = readString(r, ["aptNm", "apartmentName", "aptName", "아파트", "아파트명", "name"]);
  if (!apartmentName) return undefined;

  // 거래 금액 (dealAmount, priceEok, amount 등)
  let priceEok = 0;
  if (r.priceEok !== undefined && typeof r.priceEok === "number") {
    priceEok = r.priceEok;
  } else if (r.priceEok !== undefined && typeof r.priceEok === "string") {
    const cleaned = String(r.priceEok).replace(/,/g, "").trim();
    const parsed = parseFloat(cleaned);
    priceEok = isNaN(parsed) ? 0 : parsed;
  } else {
    const priceRaw = readNumber(r, ["dealAmount", "amount", "거래금액", "price"]);
    if (!priceRaw) return undefined;
    priceEok = priceRaw / 10000;
  }

  // 거래일 (년-월-일)
  let dealDate = "";
  const year = readString(r, ["dealYear", "year", "년"]);
  const month = readString(r, ["dealMonth", "month", "월"]);
  const day = readString(r, ["dealDay", "day", "일", "dayOfMonth"]);

  if (year && month && day) {
    const yStr = year;
    const mStr = month.padStart(2, "0");
    const dStr = day.padStart(2, "0");
    dealDate = `${yStr}-${mStr}-${dStr}`;
  } else {
    const fullDate = readString(r, ["dealDate", "date", "거래일"]);
    if (fullDate && /^\d{4}-\d{2}-\d{2}$/.test(fullDate)) {
      dealDate = fullDate;
    } else if (fullDate && fullDate.length === 8 && /^\d{8}$/.test(fullDate)) {
      dealDate = `${fullDate.substring(0, 4)}-${fullDate.substring(4, 6)}-${fullDate.substring(6, 8)}`;
    } else {
      const yStr = fallbackMonth.substring(0, 4);
      const mStr = fallbackMonth.substring(4, 6);
      dealDate = `${yStr}-${mStr}-01`;
    }
  }

  // 전용면적 (excluUseAr, areaM2 등)
  const areaM2 = readNumber(r, ["excluUseAr", "areaM2", "area", "전용면적", "size"]);
  
  // 층 (floor, 층)
  const floor = readNumber(r, ["floor", "층"]);

  // 주소 정보 (Geocoding용)
  const dongName = readString(r, ["umdNm", "법정동"]);
  const jibun = readString(r, ["jibun", "지번"]);
  const roadName = readString(r, ["roadNm", "도로명"]);

  return { apartmentName, dealDate, priceEok, areaM2, floor, dongName, jibun, roadName };
}

/**
 * 공공데이터포털 API를 직접 호출하여 해당 지역/월의 실거래 데이터를 무제한(numOfRows=9999)으로 수집
 */
export async function fetchApartmentPricesDirect(lawdCode: string, dealMonth: string): Promise<RawTransaction[]> {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    console.warn("[ApiClient] DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다. API 직접 조회를 건너뜁니다.");
    return [];
  }

  // 인코딩된 인증키인지 디코딩된 키인지 구분할 필요 없이, 소문자+숫자 키이므로 그대로 쿼리 파라미터에 매핑
  const url = `http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?serviceKey=${apiKey}&LAWD_CD=${lawdCode}&DEAL_YMD=${dealMonth}&pageNo=1&numOfRows=9999`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      throw new Error(`HTTP 에러: ${res.status}`);
    }

    const xmlText = await res.text();
    const rawItems = parseRealEstateXml(xmlText);
    
    const normalized: RawTransaction[] = [];
    for (const item of rawItems) {
      const norm = normalizeTransaction(item, dealMonth);
      if (norm) normalized.push(norm);
    }
    
    return normalized;
  } catch (err: any) {
    console.error(`[ApiClient] 국토교통부 API 직접 호출 실패 (${lawdCode} / ${dealMonth}):`, err.message);
    return [];
  }
}
