import { createLogger } from "@myhome/shared";

const log = createLogger("AuctionClient");

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_WARMUP_PATH = "/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml&pgjId=151F00";

/** 웜업(GET, 문서 요청)용 헤더 — 브라우저의 페이지 진입과 동일하게 맞춘다. */
const WARMUP_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "ko-KR,ko;q=0.9",
  "Upgrade-Insecure-Requests": "1",
};

/** 검색 POST용 헤더 — 브라우저 XHR(WebSquare)과 동일하게 맞춘다. */
const SEARCH_HEADERS = {
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
};

export class BlockedError extends Error {
  constructor(message = "courtauction.go.kr IP 차단이 감지되었습니다 (ipcheck: false). 1시간 대기 필요.") {
    super(message);
    this.name = "BlockedError";
  }
}

export class AuctionClientError extends Error {
  httpStatus?: number;
  constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = "AuctionClientError";
    this.httpStatus = httpStatus;
  }
}

export interface AuctionSearchResponse {
  data: {
    dma_pageInfo: {
      pageNo: number | string;
      pageSize: number | string;
      startRowNo: number | string;
      totalCnt: number | string;
      groupTotalCount: number | string;
    };
    ipcheck?: boolean;
    dlt_srchResult: Record<string, any>[];
  };
  errors?: {
    errorMessage?: string;
  };
}

export interface AuctionClientOptions {
  baseUrl?: string;
  minDelayMs?: number;        // 기본 3000ms
  jitterMaxMs?: number;       // 기본 2000ms
  retryBackoffMs?: number;    // 기본 30000ms (테스트 시 축소 가능)
  maxRequestsPerRun?: number; // 기본 20회
  initialRequestCount?: number; // 당일 누적 요청 수 반영용
  warmupEnabled?: boolean;    // 기본 true (수집 1회 실행당 1번 세션 웜업)
  warmupPath?: string;        // 기본 /pgj/index.on?w2xPath=...&pgjId=151F00
}

/** fetch Response.headers 의 구조적 최소 타입 (Node 18+ `getSetCookie()` 및 get() 폴백) */
interface HeadersLike {
  getSetCookie?: () => string[];
  get?: (name: string) => string | null;
}

/**
 * `Set-Cookie` 헤더 문자열 하나를 개별 쿠키 라인 배열로 분해한다.
 * `getSetCookie()` 를 지원하지 않는 런타임 폴백용으로, Expires 의 콤마(예: `Wed, 26 Nov 2026 ...`)는
 * 쿠키 구분자로 보지 않는다(콤마 뒤가 `name=` 형태일 때만 분리).
 */
export function splitSetCookieHeader(raw: string): string[] {
  if (!raw) return [];
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== ",") continue;
    const rest = raw.slice(i + 1);
    if (/^\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=/.test(rest)) {
      parts.push(raw.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(raw.slice(start).trim());
  return parts.filter(Boolean);
}

/** Set-Cookie 속성명(쿠키 이름으로 오인하지 않도록 제외) */
const SET_COOKIE_ATTRIBUTES = new Set([
  "expires",
  "max-age",
  "domain",
  "path",
  "secure",
  "httponly",
  "samesite",
  "priority",
  "partitioned",
  "version",
  "comment",
  "charset",
]);

/** 쿠키 라인에서 `name=value` 만 추출한다(속성값 무시). 값이 비면 삭제로 본다. */
export function parseSetCookieLine(line: string): { name: string; value: string } | null {
  const first = (line ?? "").split(";")[0]?.trim() ?? "";
  const eq = first.indexOf("=");
  if (eq <= 0) return null;
  const name = first.slice(0, eq).trim();
  if (!name) return null;
  if (SET_COOKIE_ATTRIBUTES.has(name.toLowerCase())) return null;
  let value = first.slice(eq + 1).trim();
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return { name, value };
}

/** Response headers 에서 Set-Cookie 라인을 모은다(getSetCookie 우선, get("set-cookie") 폴백). */
export function extractSetCookieHeaders(headers?: HeadersLike | null): string[] {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") {
    try {
      const values = headers.getSetCookie();
      if (Array.isArray(values) && values.length > 0) {
        return values.flatMap((v) => (typeof v === "string" ? splitSetCookieHeader(v) : []));
      }
    } catch {
      // 폴백으로 진행
    }
  }
  if (typeof headers.get === "function") {
    const raw = headers.get("set-cookie");
    if (raw) return splitSetCookieHeader(raw);
  }
  return [];
}

export class AuctionClient {
  private baseUrl: string;
  private minDelayMs: number;
  private jitterMaxMs: number;
  private retryBackoffMs: number;
  private maxRequestsPerRun: number;
  private warmupEnabled: boolean;
  private warmupPath: string;
  private requestCount = 0;
  private lastRequestAt = 0;

  /** 수집 실행(클라이언트 인스턴스) 동안 유지되는 세션 쿠키 저장소 */
  private cookies = new Map<string, string>();
  private warmupPromise: Promise<boolean> | null = null;
  private warmupAttempted = false;
  private warmupSucceeded = false;

  constructor(options: AuctionClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://www.courtauction.go.kr";
    this.minDelayMs = options.minDelayMs ?? 3000;
    this.jitterMaxMs = options.jitterMaxMs ?? 2000;
    this.retryBackoffMs = options.retryBackoffMs ?? 30000;
    this.maxRequestsPerRun = options.maxRequestsPerRun ?? 20;
    this.requestCount = options.initialRequestCount ?? 0;
    this.warmupEnabled = options.warmupEnabled ?? true;
    this.warmupPath = options.warmupPath ?? DEFAULT_WARMUP_PATH;
  }

  public getRequestCount(): number {
    return this.requestCount;
  }

  public resetRequestCount(): void {
    this.requestCount = 0;
  }

  /** 현재 보관 중인 세션 쿠키(읽기 전용) */
  public getCookies(): ReadonlyMap<string, string> {
    return this.cookies;
  }

  /** 저장된 쿠키를 `Cookie` 헤더 값으로 직렬화한다. 없으면 null. */
  public getCookieHeader(): string | null {
    if (this.cookies.size === 0) return null;
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  public isSessionWarmedUp(): boolean {
    return this.warmupSucceeded;
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    const jitter = Math.floor(Math.random() * this.jitterMaxMs);
    const targetDelay = this.minDelayMs + jitter;

    if (this.lastRequestAt > 0 && elapsed < targetDelay) {
      const waitTime = targetDelay - elapsed;
      log.debug(`[AuctionClient] 대기: ${waitTime}ms (지터: ${jitter}ms)`);
      await this.sleep(waitTime);
    }
    this.lastRequestAt = Date.now();
  }

  /** 응답의 Set-Cookie 를 쿠키 저장소에 반영한다. */
  private applySetCookieHeaders(headers?: HeadersLike | null): number {
    const lines = extractSetCookieHeaders(headers);
    let applied = 0;
    for (const line of lines) {
      const parsed = parseSetCookieLine(line);
      if (!parsed) continue;
      if (parsed.value === "") {
        if (this.cookies.delete(parsed.name)) applied++;
        continue;
      }
      this.cookies.set(parsed.name, parsed.value);
      applied++;
    }
    return applied;
  }

  /**
   * 세션 웜업: `GET /pgj/index.on` 으로 세션 쿠키(WMONID/SID/JSESSIONID 등)를 확보한다.
   *
   * - 수집기 1회 실행(클라이언트 인스턴스)당 1번만 수행한다. 동시 호출은 같은 Promise 를 공유한다.
   * - 웜업 실패는 수집을 막지 않는다: 경고 로그 후 쿠키 없이 POST 를 계속한다.
   *   (Playwright·프록시 등 우회 로직은 두지 않는다.)
   * - 웜업은 검색 요청이 아닌 페이지 진입 요청이므로 `requestCount`(일일 예산)에 가산하지 않는다.
   *   다만 호출 간격 준수를 위해 `throttle()` 은 적용한다.
   *
   * @param force 이미 시도한 경우에도 다시 웜업한다(명시적 재시도용).
   */
  public async warmupSession(force = false, signal?: AbortSignal): Promise<boolean> {
    if (!this.warmupEnabled) return false;
    if (this.warmupSucceeded && !force) return true;
    if (this.warmupAttempted && !force) return this.warmupSucceeded;
    if (this.warmupPromise) return this.warmupPromise;

    this.warmupAttempted = true;
    const promise = this.doWarmup(signal).finally(() => {
      this.warmupPromise = null;
    });
    this.warmupPromise = promise;
    return promise;
  }

  private async doWarmup(signal?: AbortSignal): Promise<boolean> {
    const url = `${this.baseUrl}${this.warmupPath}`;
    try {
      await this.throttle();
      log.debug(`[AuctionClient] 세션 웜업 요청: GET ${url}`);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          ...WARMUP_HEADERS,
          "User-Agent": BROWSER_USER_AGENT,
        },
        signal,
      });
      this.lastRequestAt = Date.now();

      const applied = this.applySetCookieHeaders((res as any)?.headers);

      if (!res.ok) {
        log.warn(`[AuctionClient] 세션 웜업 응답 HTTP ${res.status}. 쿠키 없이 수집을 계속합니다.`);
        return false;
      }

      this.warmupSucceeded = true;
      log.info(`[AuctionClient] 세션 웜업 완료: 쿠키 ${this.cookies.size}개 확보 (Set-Cookie ${applied}건)`);
      return true;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        log.warn("[AuctionClient] 세션 웜업이 중단되었습니다(AbortSignal).");
      } else {
        log.warn(`[AuctionClient] 세션 웜업 실패 — 쿠키 없이 수집을 계속합니다: ${err?.message ?? err}`);
      }
      return false;
    }
  }

  /**
   * 대법원 경매 검색 API 호출
   */
  public async postSearch(payload: Record<string, any>, signal?: AbortSignal): Promise<AuctionSearchResponse> {
    if (this.requestCount >= this.maxRequestsPerRun) {
      throw new AuctionClientError(
        `일일/1회 수집 상한(${this.maxRequestsPerRun}회)에 도달하여 추가 요청이 중단되었습니다.`
      );
    }

    // 세션 쿠키가 없으면(수집 실행당 1회) 먼저 웜업한다. 실패해도 예외 없이 진행.
    await this.warmupSession(false, signal);

    await this.throttle();

    const url = `${this.baseUrl}/pgj/pgjsearch/searchControllerMain.on`;

    let attempt = 0;
    while (attempt < 2) {
      attempt++;
      this.requestCount++;

      const cookieHeader = this.getCookieHeader();
      const headers: Record<string, string> = {
        ...SEARCH_HEADERS,
        "Content-Type": "application/json; charset=UTF-8",
        "User-Agent": BROWSER_USER_AGENT,
        Origin: this.baseUrl,
        Referer: `${this.baseUrl}${DEFAULT_WARMUP_PATH}`,
        "X-Requested-With": "XMLHttpRequest",
        submissionid: "mf_wfm_mainFrame_sbm_selectGdsDtlSrch",
        "sc-userid": "SYSTEM",
      };
      if (cookieHeader) headers.Cookie = cookieHeader;

      this.lastRequestAt = Date.now();
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal,
        });
        this.lastRequestAt = Date.now();

        // 응답 Set-Cookie(세션 갱신) 반영
        this.applySetCookieHeaders((res as any)?.headers);

        if (!res.ok) {
          if (attempt === 1 && this.requestCount < this.maxRequestsPerRun) {
            log.warn(`[AuctionClient] HTTP ${res.status} 발생. ${this.retryBackoffMs}ms 후 1회 재시도합니다.`);
            await this.sleep(this.retryBackoffMs);
            continue;
          }
          throw new AuctionClientError(`HTTP 오류 ${res.status}: ${res.statusText}`, res.status);
        }

        const json = (await res.json()) as AuctionSearchResponse;

        // IP 차단 감지
        if (json?.data?.ipcheck === false) {
          log.error("[AuctionClient] IP 차단 신호 감지 (ipcheck: false)!");
          throw new BlockedError();
        }

        if (json?.errors?.errorMessage) {
          log.warn(`[AuctionClient] 서버 응답 에러 메시지: ${json.errors.errorMessage}`);
        }

        return json;
      } catch (err: any) {
        if (err instanceof BlockedError) throw err;
        if (err instanceof AuctionClientError && (attempt >= 2 || this.requestCount >= this.maxRequestsPerRun)) throw err;
        if (attempt === 1 && this.requestCount < this.maxRequestsPerRun && (err.name === "TypeError" || err.name === "FetchError")) {
          log.warn(`[AuctionClient] 네트워크 오류 발생. ${this.retryBackoffMs}ms 후 1회 재시도합니다: ${err.message}`);
          await this.sleep(this.retryBackoffMs);
          continue;
        }
        throw err;
      }
    }

    throw new AuctionClientError("최대 재시도 횟수를 초과했습니다.");
  }
}
