import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));
    return pkg.version || "0.6.1";
  } catch {
    return "0.6.1";
  }
}

function getCommitHash(): string {
  if (process.env.COMMIT_HASH) return process.env.COMMIT_HASH;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
}

export const SERVER_VERSION = getPackageVersion();
export const SERVER_COMMIT_HASH = getCommitHash();
export const SERVER_BUILD_TIME = new Date().toISOString();
