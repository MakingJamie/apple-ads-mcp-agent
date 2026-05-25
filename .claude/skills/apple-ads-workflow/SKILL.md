---
name: apple-ads-workflow
description: "Apple Search Ads campaign management workflow. Guides performance data collection via Apple Ads MCP, PKEI analysis, bid optimization, keyword mining from search term reports, and budget allocation. Covers campaign structure (Brand, Category, Competitor, Discovery) and optional ASO cross-pollination. Triggers: Apple Ads, ASA, campaigns, bids, search ads, ad spend. Does not handle: App Store Connect metadata, organic keyword optimization, screenshot design, attribution SDK setup."
user-invocable: false
---

# Apple Ads Workflow

This skill provides the domain knowledge for Apple Search Ads campaign management. It is designed to be loaded by the Apple Ads agent (`.claude/agents/apple-ads-agent.md`) and provides workflow instructions, file path references, and pointers to validation rules.

> **Authoritative guardrails**: `docs/apple-ads/.claude/CLAUDE.md`. Always read at the start of each cycle. The CLAUDE.md guardrails override anything in this skill if there is a conflict.

---

## Workflow Overview

```
Phase 1: Data Collection  →  Phase 2: Analysis  →  [HUMAN GATE 1]
    →  Phase 3: Recommendations  →  [HUMAN GATE 2]  →  Phase 4: Documentation
```

Each full cycle takes the agent through all 4 phases sequentially. Lighter invocations (check-ins, bid reviews, search term mining) use subsets of these phases.

---

## Phase 1: Data Collection

### Step 1: Create the data folder

```bash
mkdir -p docs/apple-ads/data/YYYY-MM-DD
```

Use today's date. If a folder already exists for today, use it (don't create a duplicate).

### Step 2: Pull campaign performance via Apple Ads MCP

Call `get_campaign_performance` with DAILY granularity.
- **Check-in**: last 7 days
- **Full cycle**: last 30 days

Write to `docs/apple-ads/data/YYYY-MM-DD/campaign-performance.csv`

### Step 3: Pull keyword performance

Call `get_keyword_performance` for each campaign.

Write to `docs/apple-ads/data/YYYY-MM-DD/keyword-performance.csv`

### Step 4: Pull search terms

Call `get_search_terms` for each campaign.

Write to `docs/apple-ads/data/YYYY-MM-DD/search-terms.csv`

### Step 5: Pull impression share (rate-limit aware)

Check: have fewer than 10 impression share reports been requested today?

- **If yes**: call `get_impression_share` for brand keywords first (priority), then category.
  Write to `docs/apple-ads/data/YYYY-MM-DD/impression-share.json`
- **If no**: skip, note "Impression share quota exhausted" in agent-notes.md

### Step 6: Pull budget summary

Call `get_budget_summary`.

Merge into campaign-performance.csv (DailyCap, BudgetUtilization columns).

### Step 7: Calculate PKEI

For all keywords with >=100 impressions, calculate:

```
PKEI = (CR x TTR) / max(CPT, 0.01) x relevance_multiplier
```

Where `relevance_multiplier` = 1.5 if the keyword also ranks organically (rank <= 50) in your ASO/keyword data source, else 1.0. If you do not track ASO data, use 1.0 for all keywords.

Write analysis to `docs/apple-ads/data/YYYY-MM-DD/pkei-summary.md`

See `references/pkei-formula.md` for the full formula specification and threshold definitions.

### Step 8: Cross-reference ASO data (optional)

This step applies only if you track App Store Optimization (organic keyword) data. If you do, read your ASO keyword/ranking data and note:
- Organic rankings for all keywords being bid on
- High-opportunity organic keywords not yet in any campaign

If you do not maintain an ASO data source, skip this step and use a relevance multiplier of 1.0 throughout.

---

## Phase 2: Analysis

**Non-English locale rule (applies to ALL steps below):**
For any non-English storefront (examples: BR, DE, ES, FR), ALL keyword and search term tables must include an **"EN Translation"** column with the English translation or explanation. This applies to PKEI tables, search term tables, negation candidates, graduation candidates, and any table where a keyword or search term is presented for evaluation. Proper nouns (brand names) should be labeled as such with a brief description (e.g., "Acme Bank, a banking brand"). This ensures the operator can evaluate terms without needing to translate them independently.

### Step 1: Read pkei-summary.md

Start with high performers (PKEI > 5.0), then underperformers (PKEI < 2.0).

### Step 2: Compare to previous cycle

Find second-most-recent date folder in `docs/apple-ads/data/`. Identify:
- **PKEI risers/fallers**: keywords with significant PKEI movement
- **Spend changes**: campaigns spending more or less than previous period
- **SOV movements**: impression share gains or losses on brand terms

### Step 3: Keyword graduation analysis (Discovery → Category funnel)

Review Discovery campaign search terms for keywords ready to graduate to exact-match in Category campaigns. This is the systematic mechanism for converting exploratory Discovery spend into targeted, optimized Category spend.

**Graduation criteria** (ALL must be met):
1. PKEI ≥ 1.5
2. ≥ 50 impressions (≥ 100 preferred)
3. Conversion rate > 0%
4. Not already exact-match in any Category/Brand campaign
5. CPA ≤ 2× campaign average

**Cross-check**: For keywords that already exist as exact-match in Category, compare impression volume between Discovery (broad) and Category (exact). If Discovery is getting significantly more impressions at a lower bid, the Category bid is likely too low to win auctions. Flag for bid increase.

**Watchlist**: Keywords with ≥ 30 impressions and CR > 0% that haven't yet reached the 50-impression threshold. Note estimated days to graduation based on daily impression rate.

### Step 4: Search term analysis

From search-terms.csv, identify:
- **High-converting terms not yet exact-match**: promote candidates (check against graduation candidates from Step 3 to avoid duplication)
- **Negation candidates**: systematic scan, not anecdotal. Criteria (any ONE sufficient):
  - Navigational/brand terms for other apps or services
  - Completely unrelated to your app's category
  - ≥ 15 impressions with spend above zero but 0 installs, AND not topically relevant
  - Cross-check: verify not already negated (check changelog for prior negation actions)
  - Do NOT negate topically relevant terms that just haven't converted yet
- **Terms revealing user language patterns**: ASO cross-pollination opportunities (if you track ASO data)

### Step 5: Budget utilization review

From campaign-performance.csv:
- Campaigns consistently hitting daily cap: consider increasing
- Campaigns under 50% utilization: consider reducing or pausing underperforming keywords

### Step 6: Cross-pollination findings (optional, if you track ASO data)

- Search terms not yet tracked organically: flag to add to your ASO/keyword data source
- Organic keywords with high opportunity but poor organic rank: bid candidates
- Impression share data showing competitor pressure: flag for organic brand defense

### Step 7: Write to scratchpad

Write all findings to `docs/apple-ads/strategy/YYYY-MM-DD/agent-notes.md`

---

## Human Gate 1: Strategy Brief

Present to the operator using `references/strategy-brief-template.md` format.

Required sections:
1. Campaign Performance Summary (table)
2. PKEI Top 10 Performers + Bottom 10 Underperformers
3. Budget Utilization (spend vs cap per campaign)
4. Search Term Mining Results
5. ASO Cross-Pollination Findings (if you track ASO data)
6. SOV/Impression Share Status
7. Risk Flags (overspend, brand SOV drop, PKEI cliff)
8. Questions for the operator

**PAUSE AND WAIT** for the operator's response before proceeding.

---

## Phase 3: Recommendations

Based on the operator's feedback from Gate 1:

### Step 1: Bid adjustments

For each keyword recommendation:
- Current bid -> Proposed bid
- PKEI score and trend
- Expected impact (more impressions, lower CPA, etc.)
- Rationale

### Step 2: Budget reallocation

If shifting budget between campaigns:
- Current allocation -> Proposed allocation
- Percentage change (must not exceed 30% shift ceiling, see `references/budget-guardrails.md`)
- Rationale

### Step 3: Keyword additions

From search term mining and ASO cross-pollination:
- Keyword, target campaign, proposed bid, match type
- PKEI prediction (based on search term performance)
- Rationale

### Step 4: Negative keyword additions

Non-converting search terms:
- Term, negate at campaign or ad group level, match type
- Spend wasted to date
- Rationale

### Step 5: CPP recommendations (if applicable)

- Keyword theme to CPP alignment (see `references/campaign-structure.md` for CPP mappings)
- Expected TTR improvement

---

## Human Gate 2: Final Review

Present specific changes with before/after values:

1. **Bid changes table** (keyword, current bid, new bid, PKEI, rationale)
2. **Budget changes table** (campaign, current cap, new cap, % change)
3. **Keywords to add table** (keyword, campaign, bid, match type)
4. **Keywords to pause table** (keyword, campaign, PKEI, impressions, rationale)
5. **Negatives to add table** (term, level, match type, wasted spend)
6. **Total daily spend impact** (current total -> new total)

**PAUSE AND WAIT** for the operator's approval before proceeding.

---

## Phase 4: Documentation

### Step 1: Update changelog

Append to `docs/apple-ads/changelog.md` with date, changes made, approval status.

### Step 2: Update cycle notes

Add the operator's feedback and final decisions to `docs/apple-ads/strategy/YYYY-MM-DD/agent-notes.md`

### Step 3: Update agent memory

Write cycle learnings to `.claude/agent-memory/apple-ads-agent/MEMORY.md`:
- Performance patterns discovered
- The operator's preferences noted
- PKEI calibration observations

### Step 4: Update campaign ledger

Append cycle record to `.claude/agent-memory/apple-ads-agent/campaign-ledger.json`.

Include all changes with `pre_metrics`, `rationale`, `approval` status, `post_metrics: null`.

```json
{
  "date": "YYYY-MM-DD",
  "cycle_type": "full|check-in",
  "changes": [
    {
      "type": "bid_change|keyword_add|keyword_pause|negative_add|budget_change",
      "campaign": "App_Category_US",
      "keyword": "<example category keyword>",
      "pre_metrics": { "bid": 0.50, "pkei": 3.2, "cpa": 2.10 },
      "new_value": { "bid": 0.65 },
      "rationale": "PKEI rising, increase bid to capture more impressions",
      "approval": "approved",
      "post_metrics": null
    }
  ],
  "summary": {
    "total_daily_spend_before": 35.00,
    "total_daily_spend_after": 38.00,
    "keywords_added": 2,
    "keywords_paused": 1,
    "negatives_added": 3
  }
}
```

### Step 5: Flag graduations

If any pattern has repeated across 2+ cycles, flag it for promotion to CLAUDE.md guardrails.

---

## File Path Reference

### Guardrails & Strategy
- `docs/apple-ads/.claude/CLAUDE.md`: authoritative guardrails
- `docs/apple-ads/strategy/asa-strategy.md`: evergreen strategy
- `docs/apple-ads/changelog.md`: campaign change log

### Templates
- `docs/apple-ads/strategy/_templates/cycle-review.md`
- `docs/apple-ads/strategy/_templates/campaign-plan.md`

### Data
- `docs/apple-ads/data/YYYY-MM-DD/campaign-performance.csv`
- `docs/apple-ads/data/YYYY-MM-DD/keyword-performance.csv`
- `docs/apple-ads/data/YYYY-MM-DD/search-terms.csv`
- `docs/apple-ads/data/YYYY-MM-DD/impression-share.json`
- `docs/apple-ads/data/YYYY-MM-DD/pkei-summary.md`

### ASO Cross-Reference (optional)
If you track App Store Optimization data, point these at your own ASO/keyword data source. The public template does not ship an ASO data set; these are placeholders for the cross-pollination methodology.
- your organic keyword/ranking export (per locale)
- your organic keyword opportunity summary
- your organic gap analysis

### Agent Memory
- `.claude/agent-memory/apple-ads-agent/MEMORY.md`
- `.claude/agent-memory/apple-ads-agent/campaign-ledger.json`

### Skill References
- `.claude/skills/apple-ads-workflow/references/research-mode.md`
- `.claude/skills/apple-ads-workflow/references/strategy-brief-template.md`
- `.claude/skills/apple-ads-workflow/references/campaign-structure.md`
- `.claude/skills/apple-ads-workflow/references/pkei-formula.md`
- `.claude/skills/apple-ads-workflow/references/budget-guardrails.md`

---

## What This Skill Does NOT Cover

- App Store Connect metadata changes (handle with your ASO/organic workflow)
- Organic keyword optimization (handle with your ASO/organic workflow)
- Screenshot design or A/B testing setup
- Attribution SDK implementation
- Apple Search Ads account creation or API credential setup
