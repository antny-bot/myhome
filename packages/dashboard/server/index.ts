import { existsSync } from "node:fs";
import express from "express";
import { createRouter } from "./routes.js";
import { createGraphRouter } from "./routes-graph.js";
import { startScheduler } from "./scheduler.js";
import { closeGraphDb } from "@myhome/shared";

import { join, dirname } from "node:path";

function findAndLoadEnv() {
  let currentDir = process.cwd();
  // tsx watch 등으로 실행되는 파일 디렉토리 기준으로도 탐색할 수 있도록 __dirname 지원
  const fileDir = dirname(new URL(import.meta.url).pathname).replace(/^\/([a-zA-Z]:)/, '$1'); // Windows drive letter 정규화
  
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

const app = express();
const port = Number(process.env.PORT ?? "4174");

app.use(express.json());
app.use("/api", createRouter());
app.use("/api/graph", createGraphRouter());

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Apartment Alert API listening on http://127.0.0.1:${port}`);
  if (process.env.GRAPH_DB_ENABLED === "true") {
    console.log("📊 Neo4j 그래프 DB 연동 활성화됨");
  }
  startScheduler();
});

// Graceful shutdown — Neo4j 드라이버 해제
async function shutdown(signal: string) {
  console.log(`\n[${signal}] 서버 종료 중…`);
  server.close(async () => {
    await closeGraphDb();
    console.log("Neo4j 연결 해제 완료. 종료.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
