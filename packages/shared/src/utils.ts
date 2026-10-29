import { existsSync } from "node:fs";
import { join, dirname } from "node:path";

export function generateDedupeKey(
  lawdCode: string,
  apartmentName: string,
  dealDate: string,
  areaM2: number | undefined,
  floor: number | undefined
): string {
  return [lawdCode, apartmentName, dealDate, areaM2 ?? "", floor ?? ""].join("|");
}

/**
 * Promise.all의 병렬 작업 처리를 동시성 한도(limit) 내에서 실행하도록 제한하는 헬퍼 함수.
 * 외부 API에 대한 Rate Limit이나 커넥션 고갈을 예방합니다.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * 상위 디렉터리를 탐색하며 .env 파일을 자동으로 탐색하고 로드합니다.
 */
export function findAndLoadEnv(): string | null {
  const currentDir = process.cwd();
  const fileDir = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, "$1");
  const dirsToSearch = [currentDir, fileDir];

  for (const startDir of dirsToSearch) {
    let dir = startDir;
    while (true) {
      const envPath = join(dir, ".env");
      if (existsSync(envPath)) {
        if (typeof (process as any).loadEnvFile === "function") {
          (process as any).loadEnvFile(envPath);
        }
        return envPath;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}
