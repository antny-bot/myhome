# Apartment Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Track steps via checkbox (`- [ ]`).

**Goal:** Build local React/Tailwind/TypeScript dashboard with TypeScript API server. Check PlayMCP apartment transaction/complex data, send Telegram alerts.

**Architecture:** Vite React frontend, Express API server. Store MVP state in `data/app-state.json`. Wrap `mcporter call mcp-gateway.*`, evaluate watch rules, run timer scheduler, send notifications via pluggable adapters.

**Tech Stack:** React, Vite, Tailwind CSS, TypeScript, Express, Zod, Node timers, JSON, mcporter CLI, Telegram Bot API.

---

## File Structure

- `package.json`: scripts for dev, build, typecheck.
- `vite.config.ts`: Vite proxy configurations.
- `tailwind.config.js`, `postcss.config.js`: Tailwind config.
- `src/main.tsx`: React entry point.
- `src/App.tsx`: dashboard frontend UI.
- `src/api.ts`: API client.
- `src/types.ts`: shared DTOs.
- `src/styles.css`: CSS styles.
- `server/index.ts`: backend entry, scheduler startup.
- `server/routes.ts`: Express routes.
- `server/storage.ts`: JSON storage reader/writer.
- `server/mcpClient.ts`: mcporter wrapper.
- `server/ruleEngine.ts`: rule matcher, deduplicator.
- `server/notifications.ts`: Telegram/Kakao adapters.
- `server/scheduler.ts`: interval rule runner.
- `server/types.ts`: backend types.
- `data/app-state.json`: local DB state.
- `.env.example`: env variables description.

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

Use Vite proxy `/api -> http://127.0.0.1:4174`. Tailwind content: `./index.html`, `./src/**/*.{ts,tsx}`.

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

Define rules: `regionName`, `regionCode`, `apartmentKeyword`, `dealMonth`, `minPriceEok`, `maxPriceEok`, `comparisonCriteria`, `intervalMinutes`, `channels`, `enabled`, timestamps.

- [ ] **Step 2: Define check-result DTOs**

Define check-runs: `ruleId`, `matched`, `summary`, `matches`, `sourceLimitNotice`, `createdAt`, notification status.

- [ ] **Step 3: Implement JSON storage**

Implement JSON storage: `readState()`, `writeState()`, `upsertRule()`, `appendCheckRun()`, `appendNotification()`. Create `data/app-state.json` if missing.

### Task 3: MCP Wrapper And Rule Engine

**Files:**
- Create: `server/mcpClient.ts`
- Create: `server/ruleEngine.ts`

- [ ] **Step 1: Wrap mcporter calls**

Wrap `mcporter` via `spawn`: call `mcp-gateway.AptInfo-get_region_code(region_name: "...")` and `mcp-gateway.AptInfo-get_apt_price(lawd_cd: "...", deal_ymd: "...")`.

- [ ] **Step 2: Normalize region codes**

Convert region query result to 5-digit lawd code: `sidoCode + sggCode`.

- [ ] **Step 3: Evaluate transaction matches**

Match by optional keyword, min/max price (eok). Generate stable `dedupeKey`: rule id, apartment name, deal date, area, floor, price.

### Task 4: Notifications And Scheduler

**Files:**
- Create: `server/notifications.ts`
- Create: `server/scheduler.ts`

- [ ] **Step 1: Implement Telegram adapter**

Send Telegram POST to `https://api.telegram.org/bot${token}/sendMessage`. Return skipped status if env vars missing.

- [ ] **Step 2: Add Kakao placeholder adapter**

Kakao adapter placeholder: same interface, return skipped status (`Kakao send-to-me is reserved for phase 2`).

- [ ] **Step 3: Implement scheduler**

Every `CHECK_INTERVAL_SECONDS`, run enabled rules where `lastCheckedAt` exceeds `intervalMinutes`.

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

Start scheduler after Express listen. Keep manual checks functional without Telegram config.

### Task 6: Frontend Dashboard

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/api.ts`
- Create: `src/styles.css`

- [ ] **Step 1: Build dashboard shell**

Build layout: summary cards, rule list, creation form, matches list, notification log.

- [ ] **Step 2: Display constraints**

Show constraints at dashboard top, rule form, price inputs, alert previews.

- [ ] **Step 3: Implement rule actions**

Support rule create, toggle, manual run. Show status and errors.

### Task 7: Verification

**Files:**
- Modify as needed based on failures.

- [ ] **Step 1: Install dependencies**

Run `npm install`.

- [ ] **Step 2: Build**

Run `npm run build`. Must compile successfully.

- [ ] **Step 3: Start dev server**

Run `npm run dev`. Verify web at `http://127.0.0.1:5173`, API at `http://127.0.0.1:4174`.

- [ ] **Step 4: Smoke test**

Open dashboard, create rule, check data constraints display before save.

## Self-Review

- Coverage: MVP dashboard, server, scheduler, mcporter wrapper, Telegram alerts, Kakao phase-2 placeholder, UI constraints.
- Placeholders: Kakao is stubbed as phase-2 skipped status.
- Consistency: Rule, check-run, notification entity names aligned.
