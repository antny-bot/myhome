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
  assert.equal(manifest.length, 6, "총 6개의 MCP 도구가 제공되어야 함");

  const toolNames = manifest.map((t) => t.name);
  assert.ok(toolNames.includes("search_complexes"));
  assert.ok(toolNames.includes("get_complex_detail"));
  assert.ok(toolNames.includes("get_recent_transactions"));
  assert.ok(toolNames.includes("get_transaction_stats"));
  assert.ok(toolNames.includes("search_regions"));
  assert.ok(toolNames.includes("list_monitoring_rules"));

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
  db.prepare(`INSERT OR IGNORE INTO transactions (dedupe_key, complex_id, lawd_code, deal_date, price_eok, area_m2, floor, collected_at) VALUES ('tx1', '11680|압구정현대', '11680', '20260315', 45.5, 84.9, 10, datetime('now'))`).run();

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
