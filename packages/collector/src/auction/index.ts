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
  createLogger,
  type AuctionRecord,
  type AuctionCollectRun,
} from "@myhome/shared";
import { AuctionClient, BlockedError, type AuctionClientOptions } from "./client.js";
import { buildSearchBody } from "./request.js";
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

  log.info(`[AuctionCollector] 총 ${lawdCodes.length}개 대상 지역 수집 진행: ${lawdCodes.join(", ")}`);

  const client = new AuctionClient(options.clientOptions);
  const now = new Date().toISOString();
  let totalFetched = 0;
  let totalUpserted = 0;
  let runCount = 0;
  let isBlocked = false;
  const runs: AuctionCollectRun[] = [];
  const errors: Array<{ lawdCode: string; error: string }> = [];

  for (const lawdCode of lawdCodes) {
    if (options.signal?.aborted) {
      log.info("[AuctionCollector] AbortSignal 에 의해 수집이 중단되었습니다.");
      break;
    }

    const runId = `run_auction_${Date.now()}_${lawdCode}`;
    const runRecord: AuctionCollectRun = {
      id: runId,
      lawdCode,
      startedAt: new Date().toISOString(),
      endedAt: null,
      requestCount: 0,
      httpStatus: 200,
      ipcheck: 1,
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
    let localReqCount = 0;

    try {
      // 지역당 최대 2페이지 (페이지당 50건 = 최대 100건)
      for (let pageNo = 1; pageNo <= 2; pageNo++) {
        if (options.signal?.aborted) break;

        const payload = buildSearchBody({
          lawdCode,
          pageNo,
          pageSize: 50,
        });

        localReqCount++;
        const res = await client.postSearch(payload, options.signal);

        const pageInfo = res.data?.dma_pageInfo;
        const totalCnt = pageInfo?.totalCnt ? Number(pageInfo.totalCnt) : 0;
        regionTotalCnt = totalCnt;

        const rawList = res.data?.dlt_srchResult ?? [];
        if (rawList.length === 0) {
          break;
        }

        const records: AuctionRecord[] = [];
        for (const raw of rawList) {
          const record = normalizeAuctionItem(raw, now);
          records.push(record);

          // 실측 용도 코드 저장
          if (record.usageL && record.usageM && record.usageS && record.usageName) {
            saveAuctionUsageCode({
              usageL: record.usageL,
              usageM: record.usageM,
              usageS: record.usageS,
              name: record.usageName,
              observedAt: now,
            });
          }

          // 지역 코드 캐시 저장
          if (raw.daepyoSidoCd && raw.daepyoSiguCd) {
            setAuctionRegionCode({
              lawdCode,
              sidoCd: String(raw.daepyoSidoCd).trim(),
              sggCd: String(raw.daepyoSiguCd).trim(),
              displayName: [raw.hjguSido, raw.hjguSigu].filter(Boolean).join(" "),
              verifiedAt: now,
            });
          }
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

      runRecord.endedAt = new Date().toISOString();
      runRecord.requestCount = localReqCount;
      runRecord.totalCnt = regionTotalCnt;
      runRecord.fetched = regionFetched;
      updateAuctionCollectRun(runId, {
        endedAt: runRecord.endedAt,
        requestCount: localReqCount,
        totalCnt: regionTotalCnt,
        fetched: regionFetched,
        ipcheck: 1,
      });
      runs.push(runRecord);

      log.info(`[AuctionCollector] 지역 ${lawdCode} 수집 완료: ${regionFetched}건 적재 (전체 ${regionTotalCnt}건)`);
    } catch (err: any) {
      const endedAt = new Date().toISOString();
      if (err instanceof BlockedError) {
        isBlocked = true;
        const coolDownUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        saveSystemConfigDb({ "auction.blockedUntil": coolDownUntil });
        updateAuctionCollectRun(runId, {
          endedAt,
          requestCount: localReqCount,
          blocked: 1,
          ipcheck: 0,
          error: err.message,
        });
        errors.push({ lawdCode, error: err.message });
        log.error(`[AuctionCollector] IP 차단 감지되어 수집 즉시 중단 (1시간 쿨다운: ${coolDownUntil})`);
        break;
      } else {
        updateAuctionCollectRun(runId, {
          endedAt,
          requestCount: localReqCount,
          error: err.message,
        });
        errors.push({ lawdCode, error: err.message });
        log.error(`[AuctionCollector] 지역 ${lawdCode} 수집 중 오류: ${err.message}`);
      }
    }
  }

  // 성공 일자 갱신 (차단되지 않고 최소 1건 이상 지역 수집 성공 시)
  if (!isBlocked && runCount > 0 && errors.length < lawdCodes.length) {
    const todayStr = now.substring(0, 10);
    saveSystemConfigDb({ "auction.lastSuccessDate": todayStr });
  }

  return {
    totalFetched,
    totalUpserted,
    runCount,
    blocked: isBlocked,
    blockedUntil: isBlocked ? getSystemConfigDb()["auction.blockedUntil"] : null,
    runs,
    errors,
  };
}

export * from "./request.js";
export * from "./client.js";
export * from "./normalize.js";
