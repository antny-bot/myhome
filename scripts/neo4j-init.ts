/**
 * Neo4j Aura 초기화 스크립트
 * 
 * 최초 1회 또는 DB 재생성 시 실행:
 *   npx tsx scripts/neo4j-init.ts
 * 
 * 제약조건(Constraint)과 인덱스(Index)를 생성한다.
 */

import { existsSync } from "node:fs";
import neo4j from "neo4j-driver";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const uri      = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME ?? "neo4j";
const password = process.env.NEO4J_PASSWORD;
const database = process.env.NEO4J_DATABASE ?? "neo4j";

if (!uri || !password) {
  console.error("❌ NEO4J_URI 또는 NEO4J_PASSWORD 환경변수가 없습니다.");
  process.exit(1);
}

const driver  = neo4j.driver(uri, neo4j.auth.basic(username, password));
const session = driver.session({ database });

const queries = [
  // 유니크 제약조건 — dedupeKey는 Transaction의 PK 역할
  `CREATE CONSTRAINT region_lawdCode IF NOT EXISTS
   FOR (r:Region) REQUIRE r.lawdCode IS UNIQUE`,

  `CREATE CONSTRAINT transaction_dedupeKey IF NOT EXISTS
   FOR (t:Transaction) REQUIRE t.dedupeKey IS UNIQUE`,

  // 복합 인덱스 — Complex는 (name + lawdCode) 조합으로 식별
  `CREATE INDEX complex_name_lawdCode IF NOT EXISTS
   FOR (c:Complex) ON (c.name, c.lawdCode)`,

  // 날짜 인덱스 — 월별 추이 조회 시 사용
  `CREATE INDEX transaction_dealDate IF NOT EXISTS
   FOR (t:Transaction) ON (t.dealDate)`,
];

console.log("🔗 Neo4j에 연결 중…");

try {
  for (const cypher of queries) {
    const label = cypher.trim().split("\n")[0].trim();
    process.stdout.write(`  ⏳ ${label} … `);
    await session.run(cypher);
    console.log("✅");
  }

  console.log("\n✅ 초기화 완료!");
  console.log("   제약조건과 인덱스가 Neo4j에 생성되었습니다.");
} catch (err) {
  console.error("\n❌ 초기화 실패:", err);
  process.exit(1);
} finally {
  await session.close();
  await driver.close();
}
