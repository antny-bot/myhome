import { promises as fs, existsSync } from "node:fs";
import { join } from "node:path";
import {
  initDb,
  getAllDbRegions,
  getAllRules,
  getSystemConfigDb,
  saveSystemConfigDb,
  upsertAuctions,
  createAuctionCollectRun,
  updateAuctionCollectRun,
  saveAuctionUsageCode,
  setAuctionRegionCode,
  getTodayAuctionRequestCount,
  createLogger,
  type AuctionRecord,
  type AuctionCollectRun,
  type AuctionUsageCode,
  type AuctionRegionCode,
} from "@myhome/shared";
import { AuctionClient, AuctionClientError, BlockedError, type AuctionClientOptions } from "./client.js";
import { buildSearchBody, getKstDateStr } from "./request.js";
import { normalizeAuctionItem } from "./normalize.js";

const log = createLogger("AuctionCollector");
const TARGETS_CONFIG_PATH = join(process.cwd(), "packages", "collector", "config", "targets.json");

export interface AuctionCollectorOptions {
  lawdCodes?: string[];
  signal?: AbortSignal;
  clientOptions?: AuctionClientOptions;
  onAuctionCollected?: (auction: AuctionRecord) => Promise<void> | void;
}

export interface AuctionCollectorResult {
  totalFetched: number;
  totalUpserted: number;
  runCount: number;
  blocked: boolean;
  blockedUntil?: string | null;
  consecutiveFailures?: number;
  runs: AuctionCollectRun[];
  errors: Array<{ lawdCode: string; error: string }>;
}

async function resolveAuctionTargets(providedCodes?: string[]): Promise<string[]> {
  if (providedCodes && providedCodes.length > 0) {
    return Array.from(new Set(providedCodes));
  }

  const targets = new Set<string>();

  // 1. DB regions
  try {
    const dbRegions = getAllDbRegions();
    for (const r of dbRegions) {
      if (r.lawdCode) targets.add(r.lawdCode);
    }
  } catch (err: any) {
    log.warn(`[AuctionCollector] DB regions 조회 실패: ${err.message}`);
  }

  // 2. 활성 룰의 region_code
  try {
    const rules = getAllRules();
    for (const rule of rules) {
      if (rule.enabled && rule.regionCode) {
        targets.add(rule.regionCode);
      }
    }
  } catch (err: any) {
    log.warn(`[AuctionCollector] 활성 룰 조회 실패: ${err.message}`);
  }

  // 3. targets.json
  try {
    if (existsSync(TARGETS_CONFIG_PATH)) {
      const content = await fs.readFile(TARGETS_CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.targets)) {
        for (const t of parsed.targets) {
          if (t.lawdCode) targets.add(t.lawdCode);
        }
      }
    }
  } catch (err: any) {
    log.warn(`[AuctionCollector] targets.json 읽기 실패: ${err.message}`);
  }

  return Array.from(targets);
}

/**
 * 대법원 법원경매 진행 물건 수집기
 */
export async function runAuctionCollector(options: AuctionCollectorOptions = {}): Promise<AuctionCollectorResult> {
  initDb();
  log.info("[AuctionCollector] 법원경매 데이터 수집 작업 시작");

  const config = getSystemConfigDb();

  // 1. 활성화 여부 확인
  if (config["auction.enabled"] === "false") {
    log.info("[AuctionCollector] auction.enabled = false 설정되어 있어 수집을 건너뜁니다.");
    return {
      totalFetched: 0,
      totalUpserted: 0,
      runCount: 0,
      blocked: false,
      runs: [],
      errors: [],
    };
  }

  // 2. IP 차단 쿨다운 게이트 확인
  const blockedUntil = config["auction.blockedUntil"];
  if (blockedUntil) {
    const blockedTime = new Date(blockedUntil).getTime();
    if (Date.now() < blockedTime) {
      log.warn(`[AuctionCollector] IP 차단 쿨다운 중입니다 (해제 예정: ${blockedUntil}). 수집을 건너뜁니다.`);
      return {
        totalFetched: 0,
        totalUpserted: 0,
        runCount: 0,
        blocked: true,
        blockedUntil,
        runs: [],
        errors: [{ lawdCode: "ALL", error: `IP 차단 쿨다운 중 (${blockedUntil})` }],
      };
    }
  }

  const lawdCodes = await resolveAuctionTargets(options.lawdCodes);
  if (lawdCodes.length === 0) {
    log.info("[AuctionCollector] 수집 대상 지역이 없습니다.");
    return {
      totalFetched: 0,
      totalUpserted: 0,
      runCount: 0,
      blocked: false,
      runs: [],
      errors: [],
    };
  }

  const nowDate = new Date();
  const now = nowDate.toISOString();
  const todayKstStr = getKstDateStr(nowDate);

  // 당일 누적 요청 수 확인 (단일 실행에 clientOptions.maxRequestsPerRun이 명시되지 않은 경우 일일 20회 예산 공유)
  const maxDailyBudget = options.clientOptions?.maxRequestsPerRun ?? 20;
  const usedToday = options.clientOptions?.initialRequestCount ?? getTodayAuctionRequestCount(todayKstStr);
  if (usedToday >= maxDailyBudget) {
    log.warn(`[AuctionCollector] 당일 요청 예산 상한(${usedToday}/${maxDailyBudget}회)에 이미 도달하여 수집을 건너뜁니다.`);
    return {
      totalFetched: 0,
      totalUpserted: 0,
      runCount: 0,
      blocked: false,
      runs: [],
      errors: [{ lawdCode: "ALL", error: `일일 요청 상한(${maxDailyBudget}회) 도달` }],
    };
  }

  log.info(`[AuctionCollector] 총 ${lawdCodes.length}개 대상 지역 수집 진행: ${lawdCodes.join(", ")} (당일 누적 요청: ${usedToday}/${maxDailyBudget})`);

  const client = new AuctionClient({
    ...options.clientOptions,
    maxRequestsPerRun: maxDailyBudget,
    initialRequestCount: usedToday,
  });

  let totalFetched = 0;
  let totalUpserted = 0;
  let runCount = 0;
  let isBlocked = false;
  let successRegionCount = 0;
  const runs: AuctionCollectRun[] = [];
  const errors: Array<{ lawdCode: string; error: string }> = [];

  for (const lawdCode of lawdCodes) {
    if (options.signal?.aborted) {
      log.info("[AuctionCollector] AbortSignal 에 의해 수집이 중단되었습니다.");
      break;
    }

    if (client.getRequestCount() >= maxDailyBudget) {
      log.warn(`[AuctionCollector] 요청 상한(${maxDailyBudget}회) 도달로 남은 지역 수집을 중단합니다.`);
      break;
    }

    const runId = `run_auction_${Date.now()}_${lawdCode}`;
    const runRecord: AuctionCollectRun = {
      id: runId,
      lawdCode,
      startedAt: new Date().toISOString(),
      endedAt: null,
      requestCount: 0,
      httpStatus: null,
      ipcheck: null,
      totalCnt: 0,
      fetched: 0,
      matched: 0,
      unmatched: 0,
      blocked: 0,
      error: null,
    };
    createAuctionCollectRun(runRecord);
    runCount++;

    let regionFetched = 0;
    let regionTotalCnt = 0;
    const reqBeforeRegion = client.getRequestCount();

    try {
      // 지역당 최대 2페이지 (페이지당 50건 = 최대 100건)
      for (let pageNo = 1; pageNo <= 2; pageNo++) {
        if (options.signal?.aborted) break;

        const payload = buildSearchBody({
          lawdCode,
          pageNo,
          pageSize: 50,
        });

        const res = await client.postSearch(payload, options.signal);

        const pageInfo = res.data?.dma_pageInfo;
        const totalCnt = pageInfo?.totalCnt ? Number(pageInfo.totalCnt) : 0;
        regionTotalCnt = totalCnt;

        const rawList = res.data?.dlt_srchResult ?? [];
        if (rawList.length === 0) {
          break;
        }

        const records: AuctionRecord[] = [];
        const usageMap = new Map<string, AuctionUsageCode>();
        const regionMap = new Map<string, AuctionRegionCode>();

        for (const raw of rawList) {
          const record = normalizeAuctionItem(raw, now);
          records.push(record);

          // 실측 용도 코드 중복 제거 수집
          if (record.usageL && record.usageM && record.usageS && record.usageName) {
            const uKey = `${record.usageL}|${record.usageM}|${record.usageS}`;
            usageMap.set(uKey, {
              usageL: record.usageL,
              usageM: record.usageM,
              usageS: record.usageS,
              name: record.usageName,
              observedAt: now,
            });
          }

          // 지역 코드 캐시 중복 제거 수집
          if (raw.daepyoSidoCd && raw.daepyoSiguCd) {
            regionMap.set(lawdCode, {
              lawdCode,
              sidoCd: String(raw.daepyoSidoCd).trim(),
              sggCd: String(raw.daepyoSiguCd).trim(),
              displayName: [raw.hjguSido, raw.hjguSigu].filter(Boolean).join(" "),
              verifiedAt: now,
            });
          }
        }

        for (const uCode of usageMap.values()) {
          saveAuctionUsageCode(uCode);
        }
        for (const rCode of regionMap.values()) {
          setAuctionRegionCode(rCode);
        }

        upsertAuctions(records);
        regionFetched += records.length;
        totalFetched += records.length;
        totalUpserted += records.length;

        // 콜백 트리거
        if (options.onAuctionCollected) {
          for (const rec of records) {
            await options.onAuctionCollected(rec);
          }
        }

        // 전체 건수가 현재 페이지까지의 건수 이하면 다음 페이지 요청 불필요
        if (totalCnt <= pageNo * 50) {
          break;
        }
      }

      const localReqCount = client.getRequestCount() - reqBeforeRegion;
      runRecord.endedAt = new Date().toISOString();
      runRecord.requestCount = localReqCount;
      runRecord.httpStatus = 200;
      runRecord.ipcheck = 1;
      runRecord.totalCnt = regionTotalCnt;
      runRecord.fetched = regionFetched;
      updateAuctionCollectRun(runId, {
        endedAt: runRecord.endedAt,
        requestCount: localReqCount,
        httpStatus: 200,
        totalCnt: regionTotalCnt,
        fetched: regionFetched,
        ipcheck: 1,
      });
      runs.push(runRecord);
      successRegionCount++;

      log.info(`[AuctionCollector] 지역 ${lawdCode} 수집 완료: ${regionFetched}건 적재 (전체 ${regionTotalCnt}건)`);
    } catch (err: any) {
      const endedAt = new Date().toISOString();
      const localReqCount = client.getRequestCount() - reqBeforeRegion;
      if (err instanceof BlockedError) {
        isBlocked = true;
        const coolDownUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        saveSystemConfigDb({ "auction.blockedUntil": coolDownUntil });
        runRecord.endedAt = endedAt;
        runRecord.requestCount = localReqCount;
        runRecord.httpStatus = 200;
        runRecord.blocked = 1;
        runRecord.ipcheck = 0;
        runRecord.error = err.message;
        updateAuctionCollectRun(runId, {
          endedAt,
          requestCount: localReqCount,
          httpStatus: 200,
          blocked: 1,
          ipcheck: 0,
          error: err.message,
        });
        runs.push(runRecord);
        errors.push({ lawdCode, error: err.message });
        log.error(`[AuctionCollector] IP 차단 감지되어 수집 즉시 중단 (1시간 쿨다운: ${coolDownUntil})`);
        break;
      } else {
        const httpStatus = err instanceof AuctionClientError && err.httpStatus ? err.httpStatus : null;
        runRecord.endedAt = endedAt;
        runRecord.requestCount = localReqCount;
        runRecord.httpStatus = httpStatus;
        runRecord.ipcheck = null;
        runRecord.error = err.message;
        updateAuctionCollectRun(runId, {
          endedAt,
          requestCount: localReqCount,
          httpStatus,
          ipcheck: null,
          error: err.message,
        });
        runs.push(runRecord);
        errors.push({ lawdCode, error: err.message });
        log.error(`[AuctionCollector] 지역 ${lawdCode} 수집 중 오류: ${err.message}`);

        if (client.getRequestCount() >= maxDailyBudget) {
          log.warn(`[AuctionCollector] 요청 상한(${maxDailyBudget}회) 도달로 루프를 중단합니다.`);
          break;
        }
      }
    }
  }

  let consecutiveFailures = Number(config["auction.consecutiveFailures"] || "0");

  // 성공 일자 갱신 (차단되지 않고 최소 1건 이상 지역 수집 성공 시)
  if (!isBlocked && successRegionCount > 0) {
    consecutiveFailures = 0;
    saveSystemConfigDb({
      "auction.lastSuccessDate": todayKstStr,
      "auction.consecutiveFailures": "0",
    });
  } else if (isBlocked || errors.length > 0) {
    consecutiveFailures += 1;
    saveSystemConfigDb({
      "auction.consecutiveFailures": String(consecutiveFailures),
    });
  }

  return {
    totalFetched,
    totalUpserted,
    runCount,
    blocked: isBlocked,
    blockedUntil: isBlocked ? getSystemConfigDb()["auction.blockedUntil"] : null,
    consecutiveFailures,
    runs,
    errors,
  };
}

export * from "./request.js";
export * from "./client.js";
export * from "./normalize.js";

