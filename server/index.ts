import { existsSync } from "node:fs";
import express from "express";
import { createRouter } from "./routes.js";
import { startScheduler } from "./scheduler.js";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const app = express();
const port = Number(process.env.PORT ?? "4174");

app.use(express.json());
app.use("/api", createRouter());

app.listen(port, "127.0.0.1", () => {
  console.log(`Apartment Alert API listening on http://127.0.0.1:${port}`);
  startScheduler();
});
