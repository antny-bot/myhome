import { promises as fs, existsSync } from "node:fs";
import { join } from "node:path";
import {
  upsertTransactionBatch,
  makeGraphDedupeKey,
  getAllRules,
  initDb,
  getAllDbRegions,
  maskUrl,
  syncSupplyArea,
  getAreaMapping,
  findAndLoadEnv,
  createLogger,
  type BatchUpsertItem,
} from "@myhome/shared";
import { fetchApartmentPricesDirect } from "./fetcher.js";

findAndLoadEnv();
const log = createLogger("Collector");

const CONFIG_PATH = join(process.cwd(), "packages", "collector", "config", "targets.json");

export type CollectTarget = {
  lawdCode: string;
  displayName: string;
};

export type CollectorFailure = {
  target: string;
  month: string;
  error: string;
  code?: string;
};

export type SupplyAreaStats = {
  total: number;
  success: number;
  skipped: number;
  failed: number;
};

interface SupplyAreaTask {
  complexId: string;
  complexName: string;
  lawdCode: string;
  dongName?: string;
  jibun?: string;
  areaM2: number;
  regionDisplayName: string;
}

type ConfigData = {
  targets: CollectTarget[];
  fetchFromDashboard: boolean;
  dashboardUrl: string;
};

// 최근 2달 월 목록 반환 (YYYYMM)
function getRecentMonths(count: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    result.push(`${yyyy}${mm}`);
  }
  return result;
}

async function loadConfig(): Promise<ConfigData> {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = await fs.readFile(CONFIG_PATH, "utf-8");
      return JSON.parse(content) as ConfigData;
    }
  } catch (err) {
    log.error("[Collector] 설정 파일을 읽을 수 없습니다.", err);
  }
  return {
    targets: [],
    fetchFromDashboard: true,
    dashboardUrl: "http://127.0.0.1:4174",
  };
}

async function fetchRulesFromDashboard(dashboardUrl: string): Promise<CollectTarget[]> {
  // 1. 로컬 SQLite DB 직접 조회 시도 (모노레포 로컬 실행 안정성)
  try {
    initDb();
    const rules = getAllRules();
    if (rules && rules.length > 0) {
      log.info(`[Collector] 로컬 SQLite DB에서 ${rules.length}개의 알림 규칙을 직접 조회했습니다.`);
      const map = new Map<string, string>();
      rules.forEach((r) => {
        if (r.enabled && r.regionCode && r.regionName) {
          map.set(r.regionCode, r.regionName);
        }
      });
      return Array.from(map.entries()).map(([code, name]) => ({
        lawdCode: code,
        displayName: name,
      }));
    }
  } catch (dbErr: any) {
    log.warn(`[Collector] 로컬 DB 직접 조회 실패 (대시보드 API로 Fallback 진행): ${dbErr.message}`);
  }

  // 2. Fallback: 대시보드 API 호출
  try {
    const res = await fetch(`${dashboardUrl}/api/rules`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rules = (await res.json()) as any[];
    
    // 활성화된 규칙에서 중복되지 않는 지역코드 목록 추출
    const map = new Map<string, string>();
    rules.forEach((r) => {
      if (r.enabled && r.regionCode && r.regionName) {
        map.set(r.regionCode, r.regionName);
      }
    });

    return Array.from(map.entries()).map(([code, name]) => ({
      lawdCode: code,
      displayName: name,
    }));
  } catch (err: any) {
    log.warn(`[Collector] 대시보드 규칙 조회 실패: ${err.message}`);
    return [];
  }
}

export async function runCollector(options?: { signal?: AbortSignal }): Promise<{
  totalCollected: number;
  totalUpserted: number;
  failures: CollectorFailure[];
  supplyAreaStats: SupplyAreaStats;
}> {
  const signal = options?.signal;
  log.info(`[Collector] 데이터 수집 및 SQLite 적재 작업 시작 (${new Date().toLocaleString()})`);
  
  if (process.env.GRAPH_DB_ENABLED !== "true") {
    log.warn("[Collector] GRAPH_DB_ENABLED가 true가 아닙니다. 환경 설정을 확인하세요.");
  }

  const config = await loadConfig();
  let finalTargets = [...config.targets];

  const map = new Map<string, string>();
  finalTargets.forEach((t) => map.set(t.lawdCode, t.displayName));

  if (config.fetchFromDashboard) {
    log.info(`[Collector] 대시보드(${config.dashboardUrl})로부터 알림 규칙 지역 조회 중...`);
    const ruleTargets = await fetchRulesFromDashboard(config.dashboardUrl);
    log.info(`[Collector] 대시보드 규칙에서 ${ruleTargets.length}개 지역 감지됨.`);
    ruleTargets.forEach((t) => map.set(t.lawdCode, t.displayName));
  }

  // DB regions 테이블에 등록된 모든 수집 지역 조회 및 추가 (새벽 자동 수집 범위 통합)
  try {
    initDb();
    const dbRegions = getAllDbRegions();
    log.info(`[Collector] DB regions 테이블에서 ${dbRegions.length}개 지역 감지됨.`);
    dbRegions.forEach((r) => {
      if (r.lawdCode && r.displayName) {
        map.set(r.lawdCode, r.displayName);
      }
    });
  } catch (err: any) {
    log.warn(`[Collector] DB 수집 지역 조회 실패: ${err.message}`);
  }

  finalTargets = Array.from(map.entries()).map(([code, name]) => ({
    lawdCode: code,
    displayName: name,
  }));

  const failures: CollectorFailure[] = [];

  const emptyResult = {
    totalCollected: 0,
    totalUpserted: 0,
    failures: [],
    supplyAreaStats: { total: 0, success: 0, skipped: 0, failed: 0 },
  };

  if (finalTargets.length === 0) {
    log.info("[Collector] 수집할 대상 지역이 존재하지 않습니다. 종료.");
    return emptyResult;
  }

  // 최근 2달
  const months = getRecentMonths(2);
  log.info(`[Collector] 대상 지역: ${finalTargets.map((t) => t.displayName).join(", ")}`);
  log.info(`[Collector] 수집 대상 월: ${months.join(", ")}`);

  let totalCollected = 0;
  let totalUpserted = 0;
  let limitExceeded = false;

  // 분양면적 동기화 대상 큐 (중복 제거용 Map)
  const pendingAreaTasks = new Map<string, SupplyAreaTask>();

  for (const target of finalTargets) {
    if (limitExceeded || signal?.aborted) break;

    for (const month of months) {
      if (limitExceeded || signal?.aborted) break;

      log.info(`[Collector] 국토부 API에 직접 요청 중... (${target.displayName} / ${month})`);
      try {
        const fetchResult = await fetchApartmentPricesDirect(target.lawdCode, month);
        const transactions = fetchResult.items;
        log.info(`[Collector] 조회 완료: ${transactions.length}건 (전체 ${fetchResult.totalCount}건 중)`);
        totalCollected += transactions.length;

        if (transactions.length > 0 && process.env.GRAPH_DB_ENABLED === "true") {
          const regionInfo = { lawdCode: target.lawdCode, displayName: target.displayName };
          const batchItems: BatchUpsertItem[] = transactions.map((tx) => ({
            complexName: tx.apartmentName,
            tx: {
              dedupeKey: makeGraphDedupeKey(target.lawdCode, tx.apartmentName, tx.dealDate, tx.areaM2, tx.floor, { aptDong: tx.aptDong, dealingType: tx.dealingType, registeredDate: tx.registeredDate, priceEok: tx.priceEok }),
              dealDate: tx.dealDate,
              priceEok: tx.priceEok,
              areaM2: tx.areaM2,
              areaKey: tx.areaM2 ? Math.round(tx.areaM2 * 100) : undefined,
              floor: tx.floor,
              cancelDate: tx.cancelDate,
              dealingType: tx.dealingType,
              aptDong: tx.aptDong,
            },
            addressInfo: {
              dongName: tx.dongName,
              jibun: tx.jibun,
              roadName: tx.roadName,
            },
          }));
          try {
            // 월단위 전체를 단일 트랜잭션으로 묶어 fsync 병목 해소
            await upsertTransactionBatch(regionInfo, batchItems);
            totalUpserted += batchItems.length;

            // 분양면적 매핑 작업을 큐에 모음
            for (const item of batchItems) {
              if (item.tx.areaM2) {
                const complexId = `${target.lawdCode}|${item.complexName}`;
                const taskKey = `${complexId}|${Math.round(item.tx.areaM2 * 100)}`;
                if (!pendingAreaTasks.has(taskKey)) {
                  pendingAreaTasks.set(taskKey, {
                    complexId,
                    complexName: item.complexName,
                    lawdCode: target.lawdCode,
                    dongName: item.addressInfo?.dongName,
                    jibun: item.addressInfo?.jibun,
                    areaM2: item.tx.areaM2,
                    regionDisplayName: target.displayName,
                  });
                }
              }
            }
          } catch (err: any) {
            log.error(`[Collector] SQLite 배치 적재 오류 (${target.displayName} / ${month}): ${err.message}`);
            failures.push({
              target: target.displayName,
              month,
              error: `DB 적재 실패: ${err.message}`,
            });
          }
        }
      } catch (err: any) {
        const safeMsg = maskUrl(err.message || String(err));
        log.error(`[Collector] 수집 중 오류 발생 (${target.displayName} / ${month}):`, safeMsg);
        failures.push({
          target: target.displayName,
          month,
          error: safeMsg,
          code: err.code,
        });

        if (err.code === "LIMIT_EXCEEDED") {
          log.warn("[Collector] 국토부 API 일일 호출 한도(코드 22)에 도달하여 수집을 조기 종료합니다. 다음 주기에 이어서 재개합니다.");
          limitExceeded = true;
          break;
        }
      }
    }
  }

  // --- 분양면적(공급면적) 동기화 순차/동시성 제어 실행 ---
  const supplyAreaStats: SupplyAreaStats = {
    total: pendingAreaTasks.size,
    success: 0,
    skipped: 0,
    failed: 0,
  };

  if (pendingAreaTasks.size > 0 && process.env.GRAPH_DB_ENABLED === "true") {
    log.info(`[Collector] 총 ${pendingAreaTasks.size}개의 분양면적 매핑 동기화 작업을 시작합니다...`);
    const delayMs = Number(process.env.SUPPLY_AREA_DELAY_MS || "200");

    for (const task of pendingAreaTasks.values()) {
      if (signal?.aborted) {
        log.info("[Collector] 중단 신호(AbortSignal) 감지로 분양면적 동기화를 중지합니다.");
        break;
      }

      // 이미 실측(api) 매핑이 존재하는지 DB 선조회하여 불필요한 API 호출 방지
      try {
        const existing = getAreaMapping(task.complexId, task.areaM2);
        if (existing && existing.source !== "fallback") {
          supplyAreaStats.skipped++;
          continue;
        }

        await syncSupplyArea({
          complexId: task.complexId,
          complexName: task.complexName,
          lawdCode: task.lawdCode,
          dongName: task.dongName,
          jibun: task.jibun,
          areaM2: task.areaM2,
          regionDisplayName: task.regionDisplayName,
        });
        supplyAreaStats.success++;

        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (areaErr: any) {
        supplyAreaStats.failed++;
        log.warn(`[Collector] 분양면적 매핑 수집 실패 (${task.complexName} / ${task.areaM2}㎡):`, areaErr.message);
      }
    }
    log.info(
      `[Collector] 분양면적 동기화 완료: 성공 ${supplyAreaStats.success}건, 스킵 ${supplyAreaStats.skipped}건, 실패 ${supplyAreaStats.failed}건 (전체 ${supplyAreaStats.total}건)`
    );
  }

  log.info(`[Collector] 수집 완료 요약:`);
  log.info(`- 수집한 전체 실거래 내역: ${totalCollected}건`);
  log.info(`- SQLite 적재(INSERT/UPDATE) 성공 건수: ${totalUpserted}건`);
  log.info(`- 분양면적 매핑: 성공 ${supplyAreaStats.success}건, 스킵 ${supplyAreaStats.skipped}건, 실패 ${supplyAreaStats.failed}건`);
  if (failures.length > 0) {
    log.warn(`- 실패 건수: ${failures.length}건`);
  }
  log.info(`[Collector] 작업 종료.`);
  
  return { totalCollected, totalUpserted, failures, supplyAreaStats };
}

// 직접 실행 여부 판별
const isMain = process.argv[1] && (
  process.argv[1].replace(/\\/g, "/").endsWith("packages/collector/dist/index.js") || 
  process.argv[1].replace(/\\/g, "/").endsWith("packages/collector/src/index.ts")
);

if (isMain) {
  runCollector().catch((err) => {
    log.error("[Collector] 실행 중 치명적 오류 발생:", err);
    process.exit(1);
  });
}
