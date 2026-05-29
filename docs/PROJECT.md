# PyloMarket: project supplement

Technical notes for this repository only. **Career copy** (role, dates, CV bullets, Upwork wording) is **not** stored here; it lives in the maintainer's private **SA** workspace.

---

## Product (technical)

Prediction-market style web app: users browse markets by category, place limit orders, hold balances, and use **Solana** for deposits/withdrawals. UI is Polymarket-inspired (no affiliation).

---

## Repository map

| Area | Path |
|------|------|
| Server Actions | `app/actions/` (`auth`, `markets`, `orders`, `wallet`, `solana`) |
| REST API (legacy) | `app/api/` |
| UI | `app/components/`, `app/markets/`, `app/wallet/`, `app/auth/` |
| HarperDB schema | `schema.graphql` |
| HarperDB config + Next integration | `config.yaml` |
| Seed data | `seed/*.json` |
| Solana / hot wallet ops | `WALLET_SETUP.md` |
| Deploy | `.github/workflows/deploy.yml`, `Dockerfile` |
| Full setup | `README.md` |

---

## Runtime

- **Dev:** `npm run dev` (HarperDB + Next.js, typically https://localhost:9926)
- **DB/API ports:** 9925 (HarperDB), 9926 (app) per README
- **Production:** single Docker container; secrets via GitHub Environment `production`

---

## Data model (HarperDB)

Tables in `schema.graphql`: `User`, `Wallet`, `Market`, `Order`, `Trade`, `Transaction` (database name `pylomarket`).

---

## Implementation conventions

- Prefer **Server Actions** (`'use server'`) over new `/api/*` routes.
- HarperDB: `import { databases } from "harperdb"` in server actions.
- Auth: JWT in **HttpOnly** cookies (see `app/lib/auth.ts`, `app/actions/auth.ts`).
- Wallet: encrypted private keys; withdrawals via configured hot wallet (`WALLET_SETUP.md`).

---

## Feature checklist (shipped in repo)

- [x] Register / login (+ optional Google OAuth)
- [x] Market list, filters, infinite scroll
- [x] Market detail, orders, order book actions
- [x] Wallet create, balance, transactions
- [x] Solana deposit polling, withdraw API
- [x] Docker + GitHub Actions deploy to DOCR + VPS

---

## Maintainer notes

When adding a major feature, update **`README.md`** and this file if structure or ops change. Update career distill in **SA** separately (`docs/projects/pylomarket.md`).
