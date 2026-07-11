# Apartment Alert Design

## Goal

Build local full-stack app. Regularly check apartment transactions, alert on condition matches. Dashboard uses React, Tailwind CSS, TypeScript. Backend uses Node/TypeScript for API, scheduler, notifications.

## Data Source And Product Constraints

MVP uses PlayMCP `mcp-gateway` via `mcporter`.

Available data:
- Region code lookup
- Apartment complex lists/details
- Monthly transaction prices
- Bulk complex comparison

Not available in MVP:
- Current listings
- Asking prices
- Listing alerts
- Naver Real Estate listings

Must display constraint in 4 locations:
- Condition creation screen top
- Dashboard data-source card
- Price/comparison control inputs
- Telegram alert footers

## MVP Features

- Save rules: region, optional name, min/max price, comparison, interval.
- Normalize regions via `AptInfo-get_region_code`.
- Check monthly deals via `AptInfo-get_apt_price`.
- Optional complex list/details for matching.
- Local storage for rules, runs, matches, alerts.
- External alerts via Telegram.
- Kakao adapter placeholder for phase 2.
- Deduplication of transaction alerts.

## Architecture

- Frontend: Vite, React, Tailwind CSS, TypeScript.
- Backend: Express API.
- Scheduler: Node timer loop.
- MCP client: `mcporter call mcp-gateway.<tool>` wrapper.
- Storage: JSON store (`data/app-state.json`).
- Notifications: Telegram adapter (env vars).

## Key Screens

- Dashboard: summary cards, constraints, recent matches, recent alerts.
- Watch Rules: CRUD, toggle, manual run.
- Rule Form: region, keyword, deal month, price limits, interval, Telegram toggle.
- Alert History: notification logs.

## Environment

Required: `mcporter` with `mcp-gateway` configured.
Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Verification

- TypeScript and Vite build pass.
- API rules list, manual run functional.
- UI displays constraints (alerts based on historical transaction data).
