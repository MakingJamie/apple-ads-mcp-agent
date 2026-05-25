# apple-ads-mcp-agent

**An autonomous Apple Search Ads campaign manager for Claude.** It runs the full optimization loop for you: review performance, score every keyword, propose bid changes, mine search terms for new keywords, and reallocate budget. Every change that spends money waits for your approval.

It is a complete system in three layers:

1. **The agent** (`.claude/agents/apple-ads-agent.md`): a Claude subagent that runs campaign cycles and weekly check-ins, with human-approval gates on anything that touches spend.
2. **The MCP server** (`src/`): a tested [Model Context Protocol](https://modelcontextprotocol.io) server wrapping the Apple Search Ads Campaign Management API v5. 15 tools, ES256 JWT auth, rate-limit awareness.
3. **The skill** (`.claude/skills/apple-ads-workflow/`): the methodology the agent follows, including the PKEI keyword-scoring formula and the data-integrity rules that keep it honest.

[![CI](https://github.com/MakingJamie/apple-ads-mcp-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/MakingJamie/apple-ads-mcp-agent/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

> Not affiliated with, endorsed by, or sponsored by Apple Inc. "Apple Search Ads" is a trademark of Apple Inc., used here only to describe what this tool integrates with.

---

## Why this exists

Apple Search Ads rewards constant attention: bids drift, search terms surface new demand daily, junk queries quietly burn budget, and the dashboard makes all of it slow to act on. Most teams either overspend or leave wins on the table because the manual loop is too tedious to run often.

There are already thin API wrappers for Apple Search Ads. This is different in three ways:

- **It is a system, not just an endpoint.** The agent encodes an actual optimization methodology, not "call the API and hope the model reasons well."
- **Decisions are auditable.** Keywords are scored by a deterministic formula (PKEI, below), not opaque model judgment, and every change is logged with its rationale.
- **It is tested.** 140 unit and integration tests cover the auth flow, the client, every tool, and the scoring math. The goal is boring and reliable, which is what a tool that moves your ad budget needs to be.

---

## How it works

```
┌──────────────┐   natural language    ┌───────────────────┐   Apple Search Ads
│  You + Claude │ ───────────────────▶ │  apple-ads agent  │      API v5
│  (Claude Code │ ◀─────────────────── │  + workflow skill │ ───────────────┐
│  or Desktop)  │   approval gates      └─────────┬─────────┘                │
└──────────────┘                                  │ MCP tool calls           ▼
                                                   ▼                ┌───────────────────┐
                                          ┌───────────────────┐    │  Apple OAuth2 +    │
                                          │  MCP server (this │───▶│  Campaign Mgmt API │
                                          │  repo): 15 tools  │    └───────────────────┘
                                          └───────────────────┘
```

You ask in plain language ("how are campaigns doing this week?", "optimize bids", "what should we negate?"). The agent pulls fresh data through the MCP server, scores it, and presents recommendations. You approve, and only then does it write changes back.

---

## The 15 MCP tools

| Tool | What it does |
|---|---|
| `get_campaigns` | List campaigns with status, budget, daily cap |
| `list_ad_groups` | List ad groups in a campaign (bid, Search Match state) |
| `get_campaign_performance` | Campaign metrics: impressions, taps, installs, spend, TTR, CR, CPT, CPA |
| `get_keyword_performance` | Keyword metrics including the API's suggested bid |
| `get_search_terms` | The actual queries that triggered ads (the keyword-mining goldmine) |
| `get_impression_share` | Share of Voice per keyword (rate-limit aware: 10 reports/day) |
| `get_budget_summary` | Daily spend vs cap per campaign, with utilization |
| `update_keyword_bid` | Adjust a keyword's bid |
| `add_keywords` | Add targeting keywords to an ad group |
| `pause_keyword` | Pause a keyword |
| `add_negative_keywords` | Add negatives at campaign or ad-group level |
| `update_ad_group` | Change an ad group's default bid or status |
| `update_campaign` | Change a campaign's budget, daily cap, status, or name |
| `create_campaign` | Create a campaign (always starts PAUSED) |
| `create_ad_group` | Create an ad group within a campaign |

All reporting tools return pre-formatted CSV so the agent can store snapshots directly. Currency for display is read from the API's own response, so amounts are always labeled in your account currency.

---

## PKEI: the scoring formula

The agent ranks keywords with the **Paid Keyword Effectiveness Index**, a single deterministic score so decisions are repeatable and explainable rather than left to model intuition:

```
PKEI = (CR × TTR) / max(CPT, 0.01) × relevanceMultiplier
```

- **CR** (conversion rate) = installs / taps
- **TTR** (tap-through rate) = taps / impressions
- **CPT** (cost per tap) = spend / taps
- **relevanceMultiplier** = 1.5 if the keyword also ranks organically (rank ≤ 50), else 1.0

Keywords with fewer than 100 impressions are flagged as insufficient-data and excluded from scoring. Thresholds for "strong / moderate / underperformer" are calibrated per account (they depend on your volume and category), so treat the defaults as a starting point. The full rationale lives in `.claude/skills/apple-ads-workflow/references/pkei-formula.md`.

---

## Quickstart

```bash
git clone https://github.com/MakingJamie/apple-ads-mcp-agent.git
cd apple-ads-mcp-agent
npm install
npm run build
npm test          # 140 tests
```

Then create your Apple credentials (below), point your MCP client at the built server, and ask Claude to run a check-in.

---

## Getting Apple Search Ads API credentials

The Apple Search Ads API has no sandbox, so you authenticate against your real account. This is the fiddliest part of setup, so here it is end to end.

1. **Enable API access.** In [Apple Search Ads](https://searchads.apple.com), go to **Account Settings → API**. You need an Admin role. Create an API certificate. Apple gives you a **client ID** and a **key ID**, and lets you download a private key (`.pem`). Certificates are valid for 24 months, so note the renewal date.
2. **Find your Team ID and Org ID.** The **Team ID** is shown alongside the API credentials. The **Org ID** is in your dashboard URL: `searchads.apple.com/cm/app/overview?orgId=XXXXXXX`.
3. **Store the private key** somewhere outside the repo, for example `/path/to/your/private-key.pem`. Never commit it.
4. **Configure environment variables.** Copy `.env.example` to `.env` (or set them in your MCP client config, below):

   ```bash
   APPLE_ADS_TEAM_ID=...
   APPLE_ADS_CLIENT_ID=...
   APPLE_ADS_KEY_ID=...
   APPLE_ADS_PRIVATE_KEY_PATH=/absolute/path/to/private-key.pem
   APPLE_ADS_ORG_ID=...
   # Optional:
   APPLE_ADS_CURRENCY=USD              # your account currency (EUR, GBP, ...)
   APPLE_ADS_DEFAULT_ADAM_ID=          # your App Store app ID, to avoid repeating it
   ```

The server signs a short-lived ES256 JWT, exchanges it for an OAuth2 access token (cached and auto-refreshed 60s before expiry), and sends it as a bearer token with your `orgId` context on every request.

---

## Connecting it to Claude

The server speaks MCP over stdio. Point your client at the built entry point.

**Claude Code** (`.mcp.json` in your project, or user config):

```json
{
  "mcpServers": {
    "apple-ads": {
      "command": "node",
      "args": ["/absolute/path/to/apple-ads-mcp-agent/dist/index.js"],
      "env": {
        "APPLE_ADS_TEAM_ID": "...",
        "APPLE_ADS_CLIENT_ID": "...",
        "APPLE_ADS_KEY_ID": "...",
        "APPLE_ADS_PRIVATE_KEY_PATH": "/absolute/path/to/private-key.pem",
        "APPLE_ADS_ORG_ID": "...",
        "APPLE_ADS_CURRENCY": "USD"
      }
    }
  }
}
```

**Claude Desktop** uses the same shape in `claude_desktop_config.json`.

The agent and skill in `.claude/` are picked up automatically when you open this repo in Claude Code. Ask: *"Run an Apple Ads check-in."*

---

## Using the agent

The agent has modes for different jobs:

- **Check-in**: pull the last 7 days, diff against the previous check-in, flag new developments, surface keywords ready to graduate from Discovery to exact match, and scan for negation candidates.
- **Bid optimization**: score keywords by PKEI and propose increases for strong performers and cuts for budget-burners, gated on your approval.
- **Keyword mining**: find high-converting search terms not yet targeted, and non-converting terms to negate.
- **Budget review**: spend vs cap, utilization trends, reallocation proposals.
- **Full cycle**: all of the above with a strategy brief and two approval gates.

It will never create campaigns or ad groups in ENABLED status (always PAUSED for your review), never change bids or budgets without approval, and never fabricate a metric. If data is missing, it says so.

---

## Data and privacy

This is important: **the agent accumulates local context over time** (campaign snapshots, a change ledger, strategy notes, its own memory), and **none of it is committed by default.**

The included `.gitignore` excludes everything the agent generates:

- `docs/apple-ads/data/**` (your real performance CSVs)
- `docs/apple-ads/strategy/**` except `_templates/` (your analysis and decisions)
- `docs/apple-ads/changelog.md`, `contacts.md`, and any private notes
- `.claude/agent-memory/**` (the agent's cross-cycle memory and change ledger)
- `.env` and any private keys

What ships in the repo are the **templates and methodology**, not anyone's data. You get the full power of local memory and history, and there is no path for your account data to leak into a commit. Run `git status --ignored` after your first cycle to confirm your generated files are ignored.

---

## Project structure

```
src/
├── index.ts            MCP server entry (15 tool definitions)
├── auth.ts             ES256 JWT signing, token cache + auto-refresh
├── client.ts           HTTP client: retry, rate-limit parsing, pagination
├── config.ts           Env-driven defaults (currency, default adamId)
├── tools/              One module per tool group
└── utils/
    ├── pkei.ts         PKEI scoring (pure function)
    ├── currency.ts     Currency symbol / money formatting
    └── formatters.ts   CSV / JSON output
test/                   140 tests (Vitest), mirroring src/
.claude/
├── agents/             The autonomous agent
└── skills/             The workflow methodology + PKEI reference
docs/apple-ads/         Templates and structure (your data stays gitignored)
```

---

## Development

```bash
npm test            # run all tests
npm run test:watch  # watch mode
npm run build       # compile TypeScript to dist/
npm start           # run the server (needs credentials)
```

The Apple Search Ads API has no sandbox, so all tests mock at the client boundary. PKEI and formatting are pure functions with their own unit tests.

---

## Contributing

Issues and pull requests are welcome. Please keep the test suite green (`npm test`) and add coverage for new behavior.

## License

[Apache License 2.0](./LICENSE). Copyright 2026 Jamie Murphy.
