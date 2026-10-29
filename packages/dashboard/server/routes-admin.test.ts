import test from "node:test";
import assert from "node:assert/strict";
import { parseAndValidateAdminQuery } from "./routes-admin.js";

test("parseAndValidateAdminQuery: 빈 쿼리 또는 유효하지 않은 입력 거부", () => {
  const emptyRes = parseAndValidateAdminQuery("");
  assert.ok("error" in emptyRes);
  assert.equal(emptyRes.status, 400);

  const semicolonOnly = parseAndValidateAdminQuery(";;;");
  assert.ok("error" in semicolonOnly);
  assert.equal(semicolonOnly.status, 400);
});

test("parseAndValidateAdminQuery: 다중 구문 (세미콜론 분기) 거부", () => {
  const multiRes = parseAndValidateAdminQuery("SELECT 1; SELECT 2;");
  assert.ok("error" in multiRes);
  assert.equal(multiRes.status, 400);
  assert.ok(multiRes.error.includes("다중 구문"));

  // 구문 끝의 단일 세미콜론은 정상 허용
  const singleRes = parseAndValidateAdminQuery("SELECT * FROM transactions;");
  assert.equal("error" in singleRes, false);
});

test("parseAndValidateAdminQuery: 위험 및 파괴적 구문 (ATTACH, DETACH, DROP, PRAGMA writable_schema) 거부", () => {
  const dropRes = parseAndValidateAdminQuery("DROP TABLE transactions;");
  assert.ok("error" in dropRes);
  assert.equal(dropRes.status, 400);
  assert.ok(dropRes.error.includes("보안 정책상"));

  const attachRes = parseAndValidateAdminQuery("ATTACH DATABASE 'malicious.db' AS evil;");
  assert.ok("error" in attachRes);
  assert.equal(attachRes.status, 400);

  const writableSchemaRes = parseAndValidateAdminQuery("PRAGMA writable_schema = ON;");
  assert.ok("error" in writableSchemaRes);
  assert.equal(writableSchemaRes.status, 400);
});

test("parseAndValidateAdminQuery: 쓰기 쿼리는 confirmWrite: true 필수", () => {
  const updateWithoutConfirm = parseAndValidateAdminQuery("UPDATE transactions SET price_eok = 10 WHERE id = 1;");
  assert.ok("error" in updateWithoutConfirm);
  assert.equal(updateWithoutConfirm.status, 400);
  assert.ok(updateWithoutConfirm.error.includes("confirmWrite: true"));

  const updateWithConfirm = parseAndValidateAdminQuery("UPDATE transactions SET price_eok = 10 WHERE id = 1;", true);
  assert.equal("error" in updateWithConfirm, false);
  if (!("error" in updateWithConfirm)) {
    assert.equal(updateWithConfirm.type, "write");
    assert.equal(updateWithConfirm.finalSql, "UPDATE transactions SET price_eok = 10 WHERE id = 1");
  }
});

test("parseAndValidateAdminQuery: CTE 기반 쓰기 우회 시도 차단", () => {
  const cteInsert = "WITH temp AS (SELECT * FROM transactions) INSERT INTO transactions (id) SELECT id FROM temp;";
  // 1. 다중 구문 여부와 무관하게 CTE 내 쓰기 키워드 포함 시 confirmWrite 요구
  const cteInsertRes = parseAndValidateAdminQuery("WITH temp AS (SELECT 1) INSERT INTO transactions DEFAULT VALUES;");
  assert.ok("error" in cteInsertRes);
  assert.equal(cteInsertRes.status, 400);
  assert.ok(cteInsertRes.error.includes("confirmWrite: true"));
});

test("parseAndValidateAdminQuery: 읽기 쿼리 자동 LIMIT 1000 부여 및 기존 LIMIT 보존", () => {
  // 1. LIMIT 없는 SELECT -> LIMIT 1000 추가
  const noLimitRes = parseAndValidateAdminQuery("SELECT * FROM transactions");
  assert.equal("error" in noLimitRes, false);
  if (!("error" in noLimitRes)) {
    assert.equal(noLimitRes.type, "read");
    assert.ok(noLimitRes.finalSql.endsWith("LIMIT 1000"));
  }

  // 2. 이미 LIMIT 50이 명시된 경우 -> 기존 LIMIT 유지
  const existingLimitRes = parseAndValidateAdminQuery("SELECT * FROM transactions LIMIT 50;");
  assert.equal("error" in existingLimitRes, false);
  if (!("error" in existingLimitRes)) {
    assert.equal(existingLimitRes.type, "read");
    assert.equal(existingLimitRes.finalSql, "SELECT * FROM transactions LIMIT 50");
  }

  // 3. EXPLAIN 구문은 LIMIT을 붙이지 않음
  const explainRes = parseAndValidateAdminQuery("EXPLAIN QUERY PLAN SELECT * FROM transactions;");
  assert.equal("error" in explainRes, false);
  if (!("error" in explainRes)) {
    assert.equal(explainRes.type, "read");
    assert.equal(explainRes.finalSql, "EXPLAIN QUERY PLAN SELECT * FROM transactions");
  }
});
