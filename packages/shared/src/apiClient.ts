import { parseRealEstateXmlResponse } from "./xmlParser.js";

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

export class ApiFetchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly maskedUrl?: string
  ) {
    super(message);
    this.name = "ApiFetchError";
  }
}

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
 * URL에 포함된 민감한 serviceKey 파라미터를 마스킹
 */
export function maskUrl(url: string): string {
  return url.replace(/([?&]serviceKey=)[^&]+/gi, "$1***");
}

/**
 * 공공데이터포털 URL 조립
 * serviceKey가 이미 퍼센트 인코딩된 경우 이중 인코딩을 방지하고, 디코딩 키인 경우 encodeURIComponent 처리합니다.
 */
export function buildDataGoKrUrl(baseUrl: string, params: Record<string, string | number>): string {
  const url = new URL(baseUrl);
  const rawServiceKey = String(params.serviceKey ?? "");
  const isAlreadyEncoded = rawServiceKey.includes("%");
  const encodedKey = isAlreadyEncoded ? rawServiceKey : encodeURIComponent(rawServiceKey);

  for (const [k, v] of Object.entries(params)) {
    if (k === "serviceKey") continue;
    url.searchParams.set(k, String(v));
  }

  const separator = url.search ? "&" : "?";
  return `${url.toString()}${separator}serviceKey=${encodedKey}`;
}

const BASE_API_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev";

export type FetchPageResult = {
  items: RawTransaction[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
};

/**
 * 특정 페이지 단건 호출 (지수 백오프 재시도 포함)
 */
export async function fetchApartmentPricesPage(
  lawdCode: string,
  dealMonth: string,
  pageNo: number = 1,
  numOfRows: number = 1000,
  options?: {
    apiKey?: string;
    maxRetries?: number;
    initialBackoffMs?: number;
    fetchFn?: typeof fetch;
  }
): Promise<FetchPageResult> {
  const apiKey = options?.apiKey ?? process.env.DATA_GO_KR_API_KEY;
  if (!apiKey) {
    throw new ApiFetchError(
      "DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다.",
      "CONFIG_MISSING"
    );
  }

  const fetchFn = options?.fetchFn ?? fetch;
  const maxRetries = options?.maxRetries ?? 3;
  const initialBackoffMs = options?.initialBackoffMs ?? 500;

  const url = buildDataGoKrUrl(BASE_API_URL, {
    LAWD_CD: lawdCode,
    DEAL_YMD: dealMonth,
    pageNo,
    numOfRows,
    serviceKey: apiKey,
  });
  const masked = maskUrl(url);

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const res = await fetchFn(url, { signal: AbortSignal.timeout(15000) });

      if (!res.ok) {
        const status = res.status;
        const isClientError = status >= 400 && status < 500 && status !== 429;
        const errorCode = status === 429 ? "RATE_LIMITED" : status >= 500 ? "SERVER_ERROR" : "CLIENT_ERROR";
        
        // 4xx(429 제외)는 재시도하지 않음
        if (isClientError || attempt >= maxRetries) {
          throw new ApiFetchError(`HTTP 에러: ${status}`, errorCode, status, masked);
        }

        // 5xx나 429는 지수 백오프 후 재시도
        const delay = initialBackoffMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      const xmlText = await res.text();
      const parsed = parseRealEstateXmlResponse(xmlText);

      // 공공데이터 API 응답 코드 검사
      const code = parsed.resultCode;
      if (code !== "000" && code !== "00" && code !== "0") {
        if (code === "22") {
          // 호출 한도 초과 (재시도 금지)
          throw new ApiFetchError(
            `국토부 API 일일 호출 한도 초과 (코드 22): ${parsed.resultMsg}`,
            "LIMIT_EXCEEDED",
            200,
            masked
          );
        }
        if (code === "30" || code === "31") {
          // 서비스키 오류 (재시도 금지)
          throw new ApiFetchError(
            `국토부 API 서비스키 오류 (코드 ${code}): ${parsed.resultMsg}`,
            "AUTH_ERROR",
            200,
            masked
          );
        }
        throw new ApiFetchError(
          `공공데이터 API 에러 [${code}]: ${parsed.resultMsg}`,
          `API_ERROR_${code}`,
          200,
          masked
        );
      }

      const normalized: RawTransaction[] = [];
      for (const item of parsed.items) {
        const norm = normalizeTransaction(item, dealMonth);
        if (norm) normalized.push(norm);
      }

      return {
        items: normalized,
        totalCount: parsed.totalCount,
        pageNo: parsed.pageNo,
        numOfRows: parsed.numOfRows,
      };
    } catch (err: any) {
      if (err instanceof ApiFetchError) {
        // 이미 명시적 오류인 경우(재시도 중단 대상)
        if (err.code === "LIMIT_EXCEEDED" || err.code === "AUTH_ERROR" || err.code === "CLIENT_ERROR" || attempt >= maxRetries) {
          throw err;
        }
      }

      // 네트워크/타임아웃 오류
      if (attempt >= maxRetries) {
        throw new ApiFetchError(
          `국토부 API 호출 최종 실패: ${err.message}`,
          err.code ?? "NETWORK_ERROR",
          undefined,
          masked
        );
      }

      const delay = initialBackoffMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * 공공데이터포털 API를 직접 호출하여 해당 지역/월의 실거래 데이터를 페이지네이션 반복하여 전량 수집
 * 실패 시 ApiFetchError를 throw합니다.
 */
export async function fetchApartmentPricesDirect(
  lawdCode: string,
  dealMonth: string,
  options?: {
    apiKey?: string;
    maxRetries?: number;
    initialBackoffMs?: number;
    fetchFn?: typeof fetch;
  }
): Promise<{ items: RawTransaction[]; totalCount: number }> {
  const PAGE_SIZE = 1000;
  
  // 첫 페이지 호출
  const firstPage = await fetchApartmentPricesPage(lawdCode, dealMonth, 1, PAGE_SIZE, options);
  const allItems: RawTransaction[] = [...firstPage.items];
  const totalCount = firstPage.totalCount;

  // 전체 건수가 PAGE_SIZE보다 큰 경우 다음 페이지 반복 수집
  if (totalCount > PAGE_SIZE) {
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
    for (let page = 2; page <= totalPages; page++) {
      const nextPage = await fetchApartmentPricesPage(lawdCode, dealMonth, page, PAGE_SIZE, options);
      allItems.push(...nextPage.items);
    }
  }

  return {
    items: allItems,
    totalCount,
  };
}
