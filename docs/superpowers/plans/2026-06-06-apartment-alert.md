# Apartment Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local React/Tailwind/TypeScript dashboard with a TypeScript API server that checks PlayMCP apartment transaction and complex data and sends Telegram alerts.

**Architecture:** The app is a Vite React frontend served separately from an Express API during development. The backend stores MVP state in `data/app-state.json`, wraps `mcporter call mcp-gateway.*`, evaluates watch rules, runs a timer scheduler, and sends notifications through pluggable adapters.

**Tech Stack:** React, Vite, Tailwind CSS, TypeScript, Express, Zod, Node timers, JSON file storage, mcporter CLI, Telegram Bot API.

---

## File Structure

- `package.json`: root scripts for frontend, backend, build, and typecheck.
- `vite.config.ts`: Vite config with `/api` proxy to backend.
- `tailwind.config.js`, `postcss.config.js`: Tailwind pipeline.
- `src/main.tsx`: React entry.
- `src/App.tsx`: dashboard shell and screen composition.
- `src/api.ts`: typed frontend API client.
- `src/types.ts`: shared frontend/backend DTOs.
- `src/styles.css`: Tailwind layers and app-level styling.
- `server/index.ts`: Express server bootstrap and scheduler startup.
- `server/routes.ts`: REST endpoints for rules, checks, history, and config.
- `server/storage.ts`: JSON file store.
- `server/mcpClient.ts`: mcporter command wrapper.
- `server/ruleEngine.ts`: match and duplicate-alert evaluation.
- `server/notifications.ts`: Telegram adapter and Kakao placeholder adapter.
- `server/scheduler.ts`: interval-based rule runner.
- `server/types.ts`: backend domain types.
- `data/app-state.json`: seeded local state.
- `.env.example`: Telegram and scheduler environment documentation.

## Tasks

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Add root package scripts**

```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:server\" \"npm:dev:web\"",
    "dev:web": "vite --host 127.0.0.1 --port 5173",
    "dev:server": "tsx watch server/index.ts",
    "build": "tsc -p tsconfig.json && vite build && tsc -p tsconfig.node.json",
    "typecheck": "tsc -p tsconfig.json && tsc -p tsconfig.node.json",
    "start:server": "tsx server/index.ts"
  }
}
```

- [ ] **Step 2: Add Vite, TypeScript, Tailwind, and Express config**

Use Vite proxy `/api -> http://127.0.0.1:4174`. Use Tailwind content globs `./index.html` and `./src/**/*.{ts,tsx}`.

- [ ] **Step 3: Add environment example**

```env
PORT=4174
CHECK_INTERVAL_SECONDS=300
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### Task 2: Domain Types And Storage

**Files:**
- Create: `src/types.ts`
- Create: `server/types.ts`
- Create: `server/storage.ts`
- Create: `data/app-state.json`

- [ ] **Step 1: Define watch-rule DTOs**

Rules include `regionName`, `regionCode`, `apartmentKeyword`, `dealMonth`, `minPriceEok`, `maxPriceEok`, `comparisonCriteria`, `intervalMinutes`, `channels`, `enabled`, and timestamps.

- [ ] **Step 2: Define check-result DTOs**

Check results include `ruleId`, `matched`, `summary`, `matches`, `sourceLimitNotice`, `createdAt`, and notification status.

- [ ] **Step 3: Implement JSON storage**

Expose `readState()`, `writeState()`, `upsertRule()`, `appendCheckRun()`, and `appendNotification()`. Ensure `data/app-state.json` is created if missing.

### Task 3: MCP Wrapper And Rule Engine

**Files:**
- Create: `server/mcpClient.ts`
- Create: `server/ruleEngine.ts`

- [ ] **Step 1: Wrap mcporter calls**

Use `spawn` to run `mcporter call mcp-gateway.AptInfo-get_region_code(region_name: "...")` and `mcporter call mcp-gateway.AptInfo-get_apt_price(lawd_cd: "...", deal_ymd: "...")`.

- [ ] **Step 2: Normalize region codes**

Convert region lookup results to a five-digit lawd code using `sidoCode + sggCode`.

- [ ] **Step 3: Evaluate transaction matches**

Match by optional apartment keyword and min/max price in eok. Generate a stable `dedupeKey` from rule id, apartment name, deal date, area, floor, and price.

### Task 4: Notifications And Scheduler

**Files:**
- Create: `server/notifications.ts`
- Create: `server/scheduler.ts`

- [ ] **Step 1: Implement Telegram adapter**

Send to `https://api.telegram.org/bot${token}/sendMessage` when both Telegram env vars exist. If not configured, return skipped status.

- [ ] **Step 2: Add Kakao placeholder adapter**

Expose the same interface but return skipped status with message `Kakao send-to-me is reserved for phase 2`.

- [ ] **Step 3: Implement scheduler**

Every `CHECK_INTERVAL_SECONDS`, run enabled rules whose `lastCheckedAt` is older than `intervalMinutes`.

### Task 5: API Routes

**Files:**
- Create: `server/routes.ts`
- Create: `server/index.ts`

- [ ] **Step 1: Add routes**

Implement:
- `GET /api/health`
- `GET /api/rules`
- `POST /api/rules`
- `PATCH /api/rules/:id`
- `POST /api/rules/:id/run`
- `GET /api/check-runs`
- `GET /api/notifications`
- `GET /api/config`

- [ ] **Step 2: Start scheduler**

Start scheduler after Express listens. Keep manual rule checks usable even if Telegram is not configured.

### Task 6: Frontend Dashboard

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/api.ts`
- Create: `src/styles.css`

- [ ] **Step 1: Build dashboard shell**

Use a utilitarian dashboard layout with summary cards, rule list, form, recent matches, and notification history.

- [ ] **Step 2: Display constraints**

Show the data-source constraint at dashboard top, in the rule form, next to price/comparison controls, and inside alert previews.

- [ ] **Step 3: Implement rule actions**

Support create, enable/disable, and manual run. Surface check status and errors.

### Task 7: Verification

**Files:**
- Modify as needed based on failures.

- [ ] **Step 1: Install dependencies**

Run `npm install`.

- [ ] **Step 2: Build**

Run `npm run build`. Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Start dev server**

Run `npm run dev`. Expected: frontend available at `http://127.0.0.1:5173`, API at `http://127.0.0.1:4174`.

- [ ] **Step 4: Smoke test**

Open the dashboard, create a rule, and confirm the UI shows the data constraints before saving.

## Self-Review

- Spec coverage: MVP dashboard, backend, scheduler, MCP wrapper, Telegram first, Kakao phase-2 placeholder, and visible constraints are covered.
- Placeholder scan: Kakao is intentionally a phase-2 placeholder adapter, explicitly defined as skipped status.
- Type consistency: Rule, check-run, and notification names are consistent across frontend and backend tasks.
