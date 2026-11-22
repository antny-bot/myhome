import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8"));

function getGitCommitHash(): string {
  if (process.env.VITE_COMMIT_HASH) return process.env.VITE_COMMIT_HASH;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["pipe", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
}

const commitHash = getGitCommitHash();
const buildTime = new Date().toISOString();
const appVersion = packageJson.version || "0.3.0";

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  resolve: {
    preserveSymlinks: true
  },
  envDir: "../../",
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4174"
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("recharts")) {
              return "vendor-recharts";
            }
            return "vendor";
          }
        }
      }
    }
  }
});
