import { createLogger } from "@myhome/shared";

const log = createLogger("AuctionClient");

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
  minDelayMs?: number;       // 기본 3000ms
  jitterMaxMs?: number;      // 기본 2000ms
  retryBackoffMs?: number;   // 기본 30000ms (테스트 시 축소 가능)
  maxRequestsPerRun?: number;// 기본 20회
}

export class AuctionClient {
  private baseUrl: string;
  private minDelayMs: number;
  private jitterMaxMs: number;
  private retryBackoffMs: number;
  private maxRequestsPerRun: number;
  private requestCount = 0;
  private lastRequestAt = 0;

  constructor(options: AuctionClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "https://www.courtauction.go.kr";
    this.minDelayMs = options.minDelayMs ?? 3000;
    this.jitterMaxMs = options.jitterMaxMs ?? 2000;
    this.retryBackoffMs = options.retryBackoffMs ?? 30000;
    this.maxRequestsPerRun = options.maxRequestsPerRun ?? 20;
  }

  public getRequestCount(): number {
    return this.requestCount;
  }

  public resetRequestCount(): void {
    this.requestCount = 0;
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

  /**
   * 대법원 경매 검색 API 호출
   */
  public async postSearch(payload: Record<string, any>, signal?: AbortSignal): Promise<AuctionSearchResponse> {
    if (this.requestCount >= this.maxRequestsPerRun) {
      throw new AuctionClientError(
        `1회 수집 상한(${this.maxRequestsPerRun}회)에 도달하여 추가 요청이 중단되었습니다.`
      );
    }

    await this.throttle();
    this.requestCount++;

    const url = `${this.baseUrl}/pgj/pgjsearch/searchControllerMain.on`;
    const headers = {
      "Content-Type": "application/json; charset=UTF-8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Origin: this.baseUrl,
      Referer: `${this.baseUrl}/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml&pgjId=151F00`,
      "X-Requested-With": "XMLHttpRequest",
      submissionid: "mf_wfm_mainFrame_sbm_selectGdsDtlSrch",
      "sc-userid": "SYSTEM",
    };

    let attempt = 0;
    while (attempt < 2) {
      attempt++;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal,
        });

        if (!res.ok) {
          if (attempt === 1) {
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
        if (err instanceof AuctionClientError && attempt >= 2) throw err;
        if (attempt === 1 && (err.name === "TypeError" || err.name === "FetchError")) {
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
