# Apartment Alert Design

## Goal

Build a local full-stack app that regularly checks apartments the user cares about and sends alerts when saved conditions match. The app uses React, Tailwind CSS, and TypeScript for the dashboard, and a Node/TypeScript backend for API, scheduled checks, and notifications.

## Data Source And Product Constraints

The first version uses PlayMCP `mcp-gateway` through `mcporter`.

Available data:
- Region code lookup
- Apartment complex lists
- Apartment complex details
- Monthly apartment transaction prices
- Bulk complex comparison based on available complex details

Not available in MVP:
- Current sale listings
- Asking prices
- Listing creation/deletion alerts
- Real-time Naver Real Estate listings

The app must show this constraint in four places:
- At the top of the condition creation screen
- In a data-source card on the dashboard
- Next to price and comparison condition controls
- At the bottom of Telegram alert messages

## MVP Features

- Save watch rules using region, optional apartment name, max/min price, comparison criteria, and check interval.
- Normalize region names through `AptInfo-get_region_code`.
- Check monthly transaction prices through `AptInfo-get_apt_price`.
- Optionally use apartment list/detail APIs for complex-based matching and comparison.
- Store rules, check runs, matches, and notification history locally.
- Send external alerts through Telegram first.
- Reserve a notification adapter interface for Kakao "send to me" later.
- Avoid duplicate alerts for the same rule and transaction.

## Architecture

- Frontend: Vite React app with Tailwind CSS and TypeScript.
- Backend: Express API in TypeScript.
- Scheduler: Node timer loop that executes active watch rules.
- MCP client: small wrapper around `mcporter call mcp-gateway.<tool>`.
- Storage: JSON file store under `data/app-state.json` for the MVP.
- Notifications: Telegram adapter enabled by environment variables.

## Key Screens

- Dashboard: summary cards, data-source constraints, recent matches, recent alerts.
- Watch Rules: list, create, edit, enable/disable, run manually.
- Rule Form: region, apartment keyword, deal month, price bounds, comparison criteria, interval, Telegram toggle.
- Alert History: sent/skipped/failed notifications with timestamps.

## Environment

Required:
- `mcporter` configured with `mcp-gateway`

Optional for Telegram:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Verification

- TypeScript build must pass.
- Frontend production build must pass.
- API can list rules and run a manual check.
- UI visibly states that alerts are based on transaction and complex data, not current listings.
