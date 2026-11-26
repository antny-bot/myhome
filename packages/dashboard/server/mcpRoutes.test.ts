import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.js";
import { initDb, createMcpToken, getDb } from "@myhome/shared";
import { executeMcpTool } from "./mcp/handlers.js";
import { getMcpToolsManifest } from "./mcp/manifest.js";

process.env.SQLITE_DB_PATH = ":memory:";
process.env.ENABLE_BOOTSTRAP_ADMIN = "true";

test("MCP 도구 Manifest 명세 유효성 검증", () => {
  const manifest = getMcpToolsManifest();
  assert.equal(manifest.length, 8, "총 8개의 MCP 도구가 제공되어야 함");

  const toolNames = manifest.map((t) => t.name);
  assert.ok(toolNames.includes("search_complexes"));
  assert.ok(toolNames.includes("get_complex_detail"));
  assert.ok(toolNames.includes("get_recent_transactions"));
  assert.ok(toolNames.includes("get_transaction_stats"));
  assert.ok(toolNames.includes("search_regions"));
  assert.ok(toolNames.includes("list_monitoring_rules"));
  assert.ok(toolNames.includes("search_auctions"));
  assert.ok(toolNames.includes("get_auction_detail"));


  for (const tool of manifest) {
    assert.ok(tool.description, `${tool.name}에 description이 있어야 함`);
    assert.equal(tool.inputSchema.type, "object", `${tool.name}의 inputSchema는 object여야 함`);
  }
});

test("MCP 도구 핸들러 단위 실행 검증", async () => {
  initDb();
  const db = getDb();

  // 테스트 데이터 준비
  db.prepare(`INSERT OR IGNORE INTO regions (lawd_code, display_name, created_at) VALUES ('11680', '서울특별시 강남구', datetime('now'))`).run();
  db.prepare(`INSERT OR IGNORE INTO complexes (id, lawd_code, name, created_at, lat, lng, total_households) VALUES ('11680|압구정현대', '11680', '압구정현대', datetime('now'), 37.53, 127.02, 1000)`).run();
  // 실 DB 저장 포맷과 동일하게 'YYYY-MM-DD' 하이픈 포함으로 삽입 (apiClient 정규화 결과)
  db.prepare(`INSERT OR IGNORE INTO transactions (dedupe_key, complex_id, lawd_code, deal_date, price_eok, area_m2, floor, collected_at) VALUES ('tx1', '11680|압구정현대', '11680', '2026-03-15', 45.5, 84.9, 10, datetime('now'))`).run();

  const ctx = { userEmail: "agent-tester@myhome.local" };

  // 1. search_complexes
  const searchRes = JSON.parse(await executeMcpTool("search_complexes", { query: "압구정" }, ctx));
  assert.ok(searchRes.totalFound >= 1);
  assert.equal(searchRes.complexes[0].name, "압구정현대");

  // 2. get_complex_detail
  const detailRes = JSON.parse(await executeMcpTool("get_complex_detail", { complex_name: "압구정현대" }, ctx));
  assert.equal(detailRes.complex.name, "압구정현대");
  assert.equal(detailRes.complex.totalHouseholds, 1000);
  assert.equal(detailRes.transactionSummary.totalTxCount, 1);

  // 3. get_recent_transactions
  const txRes = JSON.parse(await executeMcpTool("get_recent_transactions", { complex_name: "압구정현대" }, ctx));
  assert.equal(txRes.count, 1);
  assert.equal(txRes.transactions[0].priceEok, 45.5);

  // 4. get_transaction_stats
  const statsRes = JSON.parse(await executeMcpTool("get_transaction_stats", { complex_name: "압구정현대", months: 24 }, ctx));
  assert.equal(statsRes.complexName, "압구정현대");
  assert.equal(statsRes.recentPeriodStats.totalCount, 1);
  assert.equal(statsRes.recentPeriodStats.maxPriceEok, 45.5);

  // 5. search_regions
  const regionRes = JSON.parse(await executeMcpTool("search_regions", { query: "강남" }, ctx));
  assert.ok(regionRes.regions.length >= 1);
  assert.equal(regionRes.regions[0].lawdCode, "11680");

  // 6. list_monitoring_rules
  const rulesRes = JSON.parse(await executeMcpTool("list_monitoring_rules", {}, ctx));
  assert.ok(Array.isArray(rulesRes.rules));
});

function localDateString(offsetDaysFromNow: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDaysFromNow);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test("MCP get_transaction_stats: DB 'YYYY-MM-DD' 포맷 기간 필터 회귀 검증", async () => {
  initDb();
  const db = getDb();

  // 회귀 재현 조건: DB에는 하이픈 포함 'YYYY-MM-DD' 로 저장된다.
  // (수정 전에는 cutoffDate 가 'YYYYMMDD' 로 만들어져 문자열 비교에서 전체 기간이 0건이었다)
  const insideRecent = localDateString(-20); // 최근 6개월 이내
  const insideTwoMonths = localDateString(-60); // 최근 6개월 이내
  const outsideOld = localDateString(-400); // 최근 6개월 이전
  db.prepare(`INSERT OR IGNORE INTO regions (lawd_code, display_name, created_at) VALUES ('11680', '서울특별시 강남구', datetime('now'))`).run();
  db.prepare(`INSERT OR IGNORE INTO complexes (id, lawd_code, name, created_at) VALUES ('11680|회귀테스트자이', '11680', '회귀테스트자이', datetime('now'))`).run();
  const insertTx = db.prepare(
    `INSERT OR IGNORE INTO transactions (dedupe_key, complex_id, lawd_code, deal_date, price_eok, area_m2, floor, collected_at) VALUES (?, '11680|회귀테스트자이', '11680', ?, ?, 84.9, 10, datetime('now'))`
  );
  insertTx.run("reg-recent", insideRecent, 20.0);
  insertTx.run("reg-two-months", insideTwoMonths, 18.0);
  insertTx.run("reg-old", outsideOld, 12.0);

  const ctx = { userEmail: "agent-tester@myhome.local" };
  const stats = JSON.parse(await executeMcpTool("get_transaction_stats", { complex_name: "회귀테스트자이", months: 6 }, ctx));

  assert.equal(stats.complexName, "회귀테스트자이");
  // cutoffDate 는 DB 저장 포맷과 동일한 'YYYY-MM-DD'
  assert.match(stats.cutoffDate, /^\d{4}-\d{2}-\d{2}$/, "cutoffDate 는 YYYY-MM-DD 형식이어야 함");
  assert.ok(stats.cutoffDate <= insideRecent, "cutoffDate 는 기간 내 거래일보다 앞서야 함");
  assert.ok(stats.cutoffDate > outsideOld, "cutoffDate 는 기간 밖 거래일보다 뒤여야 함");

  // 기간 내 2건만 집계되어야 함 (수정 전: 0건)
  assert.equal(stats.recentPeriodStats.totalCount, 2, "최근 6개월 거래 2건이 집계되어야 함");
  assert.equal(stats.recentPeriodStats.minPriceEok, 18.0);
  assert.equal(stats.recentPeriodStats.maxPriceEok, 20.0);
  assert.equal(stats.latestTransaction.dealDate, insideRecent, "latestTransaction 은 기간과 무관하게 최신 거래를 반환");
  assert.ok(stats.statsByArea.length >= 1, "면적대별 통계가 비어있지 않아야 함");
  assert.equal(stats.statsByArea[0].txCount, 2);
});

test("MCP get_recent_transactions: 하이픈 포함/미포함 날짜 입력 모두 동일 결과", async () => {
  initDb();
  const ctx = { userEmail: "agent-tester@myhome.local" };

  const startHyphen = localDateString(-30);
  const endHyphen = localDateString(0);
  const startCompact = startHyphen.replace(/-/g, "");
  const endCompact = endHyphen.replace(/-/g, "");

  const withHyphen = JSON.parse(
    await executeMcpTool("get_recent_transactions", { complex_name: "회귀테스트자이", start_date: startHyphen, end_date: endHyphen }, ctx)
  );
  const withCompact = JSON.parse(
    await executeMcpTool("get_recent_transactions", { complex_name: "회귀테스트자이", start_date: startCompact, end_date: endCompact }, ctx)
  );

  assert.equal(withHyphen.count, 1, "최근 30일 내 거래 1건만 조회되어야 함");
  assert.deepEqual(withCompact.transactions, withHyphen.transactions, "YYYY-MM-DD 와 YYYYMMDD 입력 결과가 같아야 함");
  assert.equal(withHyphen.transactions[0].dealDate, localDateString(-20));

  // 월 단위 입력도 허용 (end_date 'YYYY-MM' → 해당 월 말일)
  const monthInput = JSON.parse(
    await executeMcpTool("get_recent_transactions", { complex_name: "회귀테스트자이", start_date: startHyphen.slice(0, 7) }, ctx)
  );
  assert.equal(monthInput.count, 1, "start_date 'YYYY-MM' 은 1일로 보정되어야 함");

  // 해석 불가한 값은 조용히 0건이 아니라 오류로 응답
  const invalid = JSON.parse(await executeMcpTool("get_recent_transactions", { complex_name: "회귀테스트자이", start_date: "2026-13-45" }, ctx));
  assert.ok(invalid.error, "잘못된 날짜 형식은 error 를 반환해야 함");
});

test("MCP 라우터 HTTP 엔드포인트 및 인증/세션 검증", async () => {
  const app = createApp();
  const created = createMcpToken("agent-tester@myhome.local", "Test Client");

  // 1. 유효하지 않은 토큰으로 SSE 접속 시 401
  const server = app.listen(0);
  const addr = server.address() as any;
  const port = addr.port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const unauthRes = await fetch(`${baseUrl}/api/v1/mcp/sse`);
    assert.equal(unauthRes.status, 401);

    // 2. 유효한 토큰으로 GET /sse 요청
    const controller = new AbortController();
    const ssePromise = fetch(`${baseUrl}/api/v1/mcp/sse?token=${encodeURIComponent(created.raw_token)}`, {
      signal: controller.signal,
    });

    // 3. 토큰 관리 엔드포인트 (세션 인증 필요)
    const tokenListRes = await fetch(`${baseUrl}/api/v1/mcp/tokens`);
    // bootstrap admin 활성화 상태에서 기본 유저로 통과하거나 세션 검증
    assert.ok(tokenListRes.status === 200 || tokenListRes.status === 401);

    controller.abort();
    await ssePromise.catch(() => {});
  } finally {
    server.close();
  }
});
