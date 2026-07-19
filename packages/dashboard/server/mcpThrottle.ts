type LimiterOptions = {
  minIntervalMs: number;
  cacheTtlMs: number;
  retryDelaysMs: number[];
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRateLimitError(error: unknown) {
  return error instanceof Error && /\bHTTP 429\b/.test(error.message);
}

export function createMcporterLimiter({
  minIntervalMs,
  cacheTtlMs,
  retryDelaysMs,
  sleep = defaultSleep,
  now = Date.now
}: LimiterOptions) {
  let chain = Promise.resolve();
  let lastRunAt = 0;
  const inflight = new Map<string, Promise<unknown>>();
  const cache = new Map<string, CacheEntry<unknown>>();

  async function runWithRetries<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!isRateLimitError(error) || attempt === retryDelaysMs.length) {
          throw error;
        }
        await sleep(retryDelaysMs[attempt]);
      }
    }
    throw lastError;
  }

  async function schedule<T>(operation: () => Promise<T>): Promise<T> {
    const previous = chain;
    let release!: () => void;
    chain = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    try {
      const waitMs = Math.max(0, minIntervalMs - (now() - lastRunAt));
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      const result = await runWithRetries(operation);
      lastRunAt = now();
      return result;
    } finally {
      release();
    }
  }

  return {
    async run<T>(key: string, operation: () => Promise<T>): Promise<T> {
      const cached = cache.get(key);
      if (cached && cached.expiresAt > now()) {
        return cached.value as T;
      }

      const pending = inflight.get(key);
      if (pending) {
        return pending as Promise<T>;
      }

      const promise = schedule(operation)
        .then((value) => {
          if (cacheTtlMs > 0) {
            cache.set(key, { value, expiresAt: now() + cacheTtlMs });
          }
          return value;
        })
        .finally(() => {
          inflight.delete(key);
        });

      inflight.set(key, promise);
      return promise;
    }
  };
}
