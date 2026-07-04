import { promises as fs, existsSync } from "node:fs";
import { join } from "node:path";
import { upsertTransaction, makeGraphDedupeKey } from "@myhome/shared";
import { fetchApartmentPricesDirect } from "./fetcher.js";

import { dirname } from "node:path";

function findAndLoadEnv() {
  let currentDir = process.cwd();
  const fileDir = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1');
  
  const dirsToSearch = [currentDir, fileDir];
  for (let startDir of dirsToSearch) {
    let dir = startDir;
    while (true) {
      const envPath = join(dir, ".env");
      if (existsSync(envPath)) {
        process.loadEnvFile(envPath);
        return;
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
}
findAndLoadEnv();

const CONFIG_PATH = join(process.cwd(), "packages", "collector", "config", "targets.json");

type CollectTarget = {
  lawdCode: string;
  displayName: string;
};

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
    console.error("[Collector] 설정 파일을 읽을 수 없습니다.", err);
  }
  return {
    targets: [],
    fetchFromDashboard: true,
    dashboardUrl: "http://127.0.0.1:4174",
  };
}

async function fetchRulesFromDashboard(dashboardUrl: string): Promise<CollectTarget[]> {
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
    console.warn(`[Collector] 대시보드 규칙 조회 실패: ${err.message}`);
    return [];
  }
}

async function main() {
  console.log(`[Collector] 데이터 수집 및 Neo4j 적재 작업 시작 (${new Date().toLocaleString()})`);
  
  if (process.env.GRAPH_DB_ENABLED !== "true") {
    console.warn("[Collector] GRAPH_DB_ENABLED가 true가 아닙니다. Neo4j 적재를 위해 환경 설정을 확인하세요.");
  }

  const config = await loadConfig();
  let finalTargets = [...config.targets];

  if (config.fetchFromDashboard) {
    console.log(`[Collector] 대시보드(${config.dashboardUrl})로부터 알림 규칙 지역 조회 중...`);
    const ruleTargets = await fetchRulesFromDashboard(config.dashboardUrl);
    console.log(`[Collector] 대시보드 규칙에서 ${ruleTargets.length}개 지역 감지됨.`);
    
    // 중복 제거 및 병합
    const map = new Map<string, string>();
    finalTargets.forEach((t) => map.set(t.lawdCode, t.displayName));
    ruleTargets.forEach((t) => map.set(t.lawdCode, t.displayName));
    finalTargets = Array.from(map.entries()).map(([code, name]) => ({
      lawdCode: code,
      displayName: name,
    }));
  }

  if (finalTargets.length === 0) {
    console.log("[Collector] 수집할 대상 지역이 존재하지 않습니다. 종료.");
    return;
  }

  // 최근 2달
  const months = getRecentMonths(2);
  console.log(`[Collector] 대상 지역: ${finalTargets.map((t) => t.displayName).join(", ")}`);
  console.log(`[Collector] 수집 대상 월: ${months.join(", ")}`);

  let totalCollected = 0;
  let totalUpserted = 0;

  for (const target of finalTargets) {
    for (const month of months) {
      console.log(`[Collector] MCP 서버에 직접 요청 중... (${target.displayName} / ${month})`);
      const transactions = await fetchApartmentPricesDirect(target.lawdCode, month);
      console.log(`[Collector] 조회 완료: ${transactions.length}건`);
      totalCollected += transactions.length;

      if (transactions.length > 0 && process.env.GRAPH_DB_ENABLED === "true") {
        const regionInfo = { lawdCode: target.lawdCode, displayName: target.displayName };
        for (const tx of transactions) {
          try {
            const graphKey = makeGraphDedupeKey(target.lawdCode, tx.apartmentName, tx.dealDate, tx.areaM2, tx.floor);
            await upsertTransaction(regionInfo, tx.apartmentName, {
              dedupeKey: graphKey,
              dealDate: tx.dealDate,
              priceEok: tx.priceEok,
              areaM2: tx.areaM2,
              floor: tx.floor,
            });
            totalUpserted++;
          } catch (err: any) {
            console.error(`[Collector] Neo4j 적재 오류 (${tx.apartmentName}): ${err.message}`);
          }
        }
      }
    }
  }

  console.log(`[Collector] 수집 완료 요약:`);
  console.log(`- 수집한 전체 실거래 내역: ${totalCollected}건`);
  console.log(`- Neo4j Aura 적재(MERGE) 성공 건수: ${totalUpserted}건`);
  console.log(`[Collector] 모든 작업 성공적으로 종료.`);
}

main().catch((err) => {
  console.error("[Collector] 실행 중 치명적 오류 발생:", err);
  process.exit(1);
});
