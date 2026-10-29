import { createLogger } from "@myhome/shared";

const log = createLogger("HTTP:Policy");

export interface FetchPolicyOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  circuitBreaker?: CircuitBreaker;
}

export class CircuitBreakerOpenError extends Error {
  constructor(message = "Circuit breaker is OPEN. Fast failing request.") {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  constructor(
    private readonly failureThreshold = 5,
    private readonly resetTimeoutMs = 30000
  ) {}

  isOpen(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        log.info("Circuit breaker transitioned to HALF_OPEN");
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      log.warn(`Circuit breaker transitioned to OPEN (failures: ${this.failureCount})`);
    }
  }

  getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = "CLOSED";
  }
}

/**
 * 타임아웃, 재시도, 서킷 브레이커가 통합된 fetch 정책 래퍼
 */
export async function fetchWithPolicy(
  url: string | URL | Request,
  init?: RequestInit,
  options: FetchPolicyOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 5000,
    retries = 2,
    retryDelayMs = 300,
    circuitBreaker,
  } = options;

  if (circuitBreaker && circuitBreaker.isOpen()) {
    throw new CircuitBreakerOpenError();
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const signal = init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
        : AbortSignal.timeout(timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal,
      });

      if (response.status >= 500) {
        throw new Error(`Upstream server returned HTTP ${response.status}`);
      }

      if (circuitBreaker) {
        circuitBreaker.recordSuccess();
      }
      return response;
    } catch (err: any) {
      attempt++;
      if (circuitBreaker) {
        circuitBreaker.recordFailure();
      }

      if (attempt > retries) {
        throw err;
      }

      const backoff = retryDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw new Error("fetchWithPolicy unreachable");
}
