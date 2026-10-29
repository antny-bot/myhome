/**
 * 객체의 키를 알파벳 순으로 정렬하여 직렬화함으로써 동일한 속성의 순서 차이로 인한 캐시 미스를 방지합니다.
 */
export function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== "object") return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }

  const keys = Object.keys(obj).sort();
  const entries: string[] = [];
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${stableStringify(val)}`);
    }
  }
  return "{" + entries.join(",") + "}";
}

export class GraphCache {
  private cache = new Map<string, { value: any; expiry: number }>();
  private readonly maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    // LRU 갱신: 가장 최근에 접근한 항목을 맨 뒤로 이동
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = 300_000): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 가장 오래된 항목(Map의 첫 번째 키) 제거
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }

  get size(): number {
    return this.cache.size;
  }

  /**
   * 특정 키 접두사를 가진 캐시 항목들만 선택적으로 무효화합니다.
   * 데이터베이스에 수집/변경이 발생할 때 전체 캐시 폭파를 방지하여 성능을 보존합니다.
   */
  invalidateByPrefix(prefix: string): void {
    console.log(`[GraphCache] Invalidating caches starting with prefix: "${prefix}"`);
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    console.log("[GraphCache] Clearing all caches due to DB modification.");
    this.cache.clear();
  }
}

export const graphCache = new GraphCache(500);

/**
 * 캐시 조회 및 적재 패턴(loader) 래퍼 헬퍼
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = graphCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  const fresh = await loader();
  graphCache.set(key, fresh, ttlMs);
  return fresh;
}

// 데이터 성격에 따른 권한화된 TTL 상수 (밀리초 단위)
export const TTL = {
  STATIC: 60 * 60 * 1000,    // 1시간 (db-regions, regions-summary 등 거의 변하지 않는 정적 데이터)
  TREND: 15 * 60 * 1000,     // 15분 (실거래가 월간 추이 등 주기적으로 갱신되는 통계)
  SEARCH: 5 * 60 * 1000,     // 5분 (사용자 필터 조건 검색 및 복잡한 드릴다운 렌더링용)
};
