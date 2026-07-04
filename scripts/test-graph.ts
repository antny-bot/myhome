import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");

const { getGraphStats } = await import("../server/graphDb.js");
const stats = await getGraphStats();
console.log("✅ Neo4j 연결 성공:", JSON.stringify(stats));
process.exit(0);
