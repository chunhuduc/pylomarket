# Agent notes (PyloMarket)

Brief pointer for humans and coding agents working in **this repository**.

## What this repo is

**PyloMarket**: prediction-market style platform on **Next.js 15** + **HarperDB 4.7** (`@harperdb/nextjs`) with **Solana** wallet flows. Public source: https://github.com/chunhuduc/pylomarket

## Project docs (this repo)

| File | Purpose |
|------|---------|
| [`README.md`](README.md) | Setup, architecture, API/actions reference |
| [`docs/PROJECT.md`](docs/PROJECT.md) | Repo map, conventions, feature checklist |
| [`WALLET_SETUP.md`](WALLET_SETUP.md) | Hot wallet and Solana flows |
| [`schema.graphql`](schema.graphql) | Database tables |

## Career / CV (outside this repo)

CV bullets, role, dates, Upwork copy, and NDA-safe public wording are maintained in the private **SA** career workspace (not committed here). When implementing features that affect how the project is described publicly, the owner updates SA separately.

For agents with access to the local **BRAINSTORM** folder layout: see `../SA/docs/projects/pylomarket.md` and `../SA/docs/projects/SUMMARIES.md`.

## Dev commands

```bash
npm install
npm run dev
npm run build
npm start
```

## Agent behavior

- Prefer **Server Actions** over new REST routes unless HTTP is required.
- Do not commit secrets (`.env`, wallet keys).
- Do not add revenue, user count, or trading volume claims in docs unless the owner provides verified numbers.
- In Markdown you add here: avoid Unicode em dash / en dash; use commas, colons, or `to` for ranges.
