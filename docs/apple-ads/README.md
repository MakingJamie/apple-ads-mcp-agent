# Apple Search Ads workspace

This is the agent's working directory. It holds your campaign guardrails, methodology, reusable templates, and (once you start running cycles) your own data, analysis, and change history.

## What's committed vs local

**Committed** (the reusable system):
- `.claude/CLAUDE.md` — your guardrails and account configuration (edit this for your account)
- `platform-guide.md` — Apple Search Ads reference and a worked category example
- `strategy/_templates/` — skeletons for cycle reviews and campaign plans

**Local only** (gitignored, your data, never committed):
- `data/YYYY-MM-DD/` — performance snapshots (CSV/JSON) and PKEI summaries
- `strategy/YYYY-MM-DD/` — per-cycle analysis, check-ins, agent notes
- `changelog.md` — your log of campaign changes
- `investigations/`, `meetings/`, and anything else the agent writes over time

This split means you get full local history and memory, while the repo only ever carries templates and methodology. After your first cycle, run `git status --ignored` to confirm your generated files are excluded.

## Getting started

1. Open `.claude/CLAUDE.md` and fill in your budget cap, locales, currency, and optional keyword filters.
2. Read `platform-guide.md` for the strategy reference.
3. Ask the agent to "run an Apple Ads check-in." It will create the dated folders as it goes.
