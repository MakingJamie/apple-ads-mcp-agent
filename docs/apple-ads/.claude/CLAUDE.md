# Apple Search Ads Working Directory

This folder holds your Apple Search Ads (ASA) campaign data, strategy, and guardrails. The agent reads this file first on every invocation; it is the authoritative rule set.

> Customize this file for your account: set your real budget caps, locales, currency, and any keyword filters. Everything generated over time (data snapshots, cycle notes, the change ledger, agent memory) is gitignored by default, so your account data never gets committed.

## Structure
- `platform-guide.md` — Apple Search Ads best practices and API reference
- `strategy/_templates/` — skeletons for new cycle reviews and campaign plans (committed)
- `strategy/YYYY-MM-DD/` — per-cycle analysis (agent-notes.md, check-in-*.md) (gitignored)
- `data/YYYY-MM-DD/` — date-stamped snapshots: campaign-performance.csv, keyword-performance.csv, search-terms.csv, impression-share.json, pkei-summary.md (gitignored)
- `changelog.md` — log of all campaign changes you make (gitignored)

## Conventions
- Campaign naming: `{Prefix}_{Type}_{Locale}` (e.g. `App_Category_US`, `App_Discovery_BR`). A single-app account can drop the prefix and use `{Locale}_{Type}` (e.g. `US_Category`).
- Ad group naming: `{Theme} ({MatchType})`, e.g. `Core Terms (Exact)`, `Discovery (Broad and Search Match)`. Apple disallows square brackets in ad group names; use parentheses, and always include the match type so strategy is visible at a glance.
- Date folders use `YYYY-MM-DD`.
- To start a cycle: copy `strategy/_templates/` into `strategy/YYYY-MM-DD/` and fill it in.
- Always update `changelog.md` when you change campaigns.

---

## Guardrails (MANDATORY)

### Anti-patterns, NEVER do these
- **NEVER** create campaigns or ad groups in ENABLED status. Always create as PAUSED so a human activates them after reviewing in the dashboard.
- **NEVER** change bids or budgets without human-gate approval.
- **NEVER** exceed the daily budget cap you define below.
- **NEVER** recommend a bid exceeding 2x the campaign's average CPT without explicitly flagging it.
- **NEVER** shift more than 30% of total budget between campaigns in a single cycle.
- **NEVER** make a bid recommendation on a keyword with fewer than 100 impressions (insufficient data).
- **NEVER** add brand terms or high-performing organic keywords as negative keywords.
- **NEVER** request more than 10 impression share reports per day (Apple API hard limit; max 30-day range).
- **NEVER** fabricate, guess, or estimate campaign metrics, PKEI scores, or performance data.
- **NEVER** edit previous cycles' strategy documents (each cycle lives in its own dated folder).
- **NEVER** put competitor brand names in ad copy (Apple Search Ads policy prohibits it).

### Your account configuration (fill these in)
- **Account currency**: set `APPLE_ADS_CURRENCY` to match (e.g. USD, EUR, GBP).
- **Daily budget hard cap**: _e.g. $50/day_. The agent must never recommend exceeding this.
- **Active locales**: _e.g. US, GB_. List each with its per-campaign daily caps.
- **Competitor / out-of-category keyword filter** (optional): list brand names of competitors and obviously-irrelevant terms to discount from analysis. The agent treats these as never-bid unless you say otherwise.

### Campaign architecture
A common structure uses up to four campaign types per locale. Use the subset that fits your stage:

| Type | Purpose | Match types | Typical budget share |
|------|---------|-------------|----------------------|
| Brand | Defend your own brand terms | Exact | Small but high priority |
| Category | High-intent, feature-aligned terms | Exact (proven) + Broad (testing) | Largest, the acquisition engine |
| Competitor | Intercept competitor searches (optional) | Exact | Small, off by default |
| Discovery | Mine new terms via Search Match + broad | Broad + Search Match | Moderate |

The Discovery → Category funnel is the core mechanic: Discovery surfaces converting search terms, which graduate to exact-match keywords in Category.

### Negative keyword rules
- The Discovery campaign MUST have all Category (and Brand/Competitor) exact-match keywords as **campaign-level** negatives, so it does not cannibalize higher-intent campaigns.
- Add non-converting search terms (meaningful spend, zero conversions) as exact-match negatives.
- NEVER add brand terms or high-converting organic keywords as negatives.

### Bid hierarchy
- Keyword-level bids override the ad group default bid. Set the ad group `defaultBidAmount` to the lowest bid you would want for any keyword in that group.
- Always specify explicit keyword-level bids when adding keywords; never rely on the ad group default.

### Custom Product Pages (CPPs)
- Align CPP creative with keyword intent theme for materially higher TTR.
- Create CPPs for your top keyword themes and match creative intent to search intent, not demographics.

---

## PKEI (Paid Keyword Effectiveness Index)

```
PKEI = (CR × TTR) / max(CPT, 0.01) × relevance_multiplier
```

- `relevance_multiplier`: 1.5 if the keyword also ranks organically (from your ASO data), else 1.0.
- Minimum data: 100 impressions before scoring.
- Suggested starting bands (calibrate to your own volume and category after a few cycles):
  - Strong: increase bid to capture more volume
  - Moderate: hold
  - Underperformer: reduce bid or pause unless strategically important
- Brand keywords: never pause regardless of PKEI (brand-defense floor).
- **Volatility guard**: only act on a band change after a keyword holds the new band for 2+ consecutive check-ins, to avoid small-sample whipsaw.

Full specification: `.claude/skills/apple-ads-workflow/references/pkei-formula.md`.

---

## Data Integrity (MANDATORY)
- All campaign data must originate from Apple Ads MCP tools or existing data files, never fabricated.
- All PKEI scores must be calculated from actual metrics, never estimated by hand.
- Flag missing data with `DATA MISSING:`, never fill gaps with plausible values.
- Prefix analysis with `INTERPRETATION:` and suggestions with `RECOMMENDATION:` to keep them distinct from facts.

---

## Iteration cadence (suggested)
- **Weekly**: check-in. Pull performance, flag anomalies, track spend vs budget.
- **Bi-weekly**: bid optimization. PKEI analysis, bid adjustments, search-term mining, negatives.
- **Monthly**: full cycle. Two human gates, budget reallocation, structure changes.
- **Quarterly**: deep review. Architecture audit, PKEI threshold recalibration.

---

## ASO cross-pollination (optional)
If you track organic keyword rankings, cross-reference them each cycle:
1. Feed paid search terms that you don't yet track organically into your ASO keyword list.
2. Bid on high-value organic keywords that rank poorly.

---

## Apple Ads MCP Tools Reference

| Tool | Purpose |
|------|---------|
| `get_campaigns` | List campaigns with status, budget, daily cap |
| `get_campaign_performance` | Campaign metrics: impressions, taps, installs, spend, TTR, CR, CPT, CPA |
| `get_keyword_performance` | Keyword metrics per ad group (includes suggested bid) |
| `get_search_terms` | Actual search queries triggering ads |
| `get_impression_share` | SOV per keyword (max 10/day, max 30-day range) |
| `update_keyword_bid` | Adjust a keyword's bid |
| `add_keywords` | Add targeting keywords to an ad group |
| `pause_keyword` | Set a keyword to PAUSED |
| `add_negative_keywords` | Add negative keywords (campaign or ad group level) |
| `get_budget_summary` | Daily spend vs daily cap per campaign |
| `update_ad_group` | Update ad group default bid or status |
| `update_campaign` | Update campaign daily cap, total budget, status, or name |
| `list_ad_groups` | List ad groups with IDs, status, default bid, Search Match setting |
