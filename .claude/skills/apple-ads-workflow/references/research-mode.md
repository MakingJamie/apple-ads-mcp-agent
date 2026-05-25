# Research Mode — Apple Ads Agent

> Read this file when the current task is classified as **Research mode**.
> Do NOT read this file for Creative mode tasks — citation constraints reduce creative output quality.

---

## Rule 1: Permission to Say "I Don't Know"

If data is missing, incomplete, or ambiguous — say so explicitly. Never fill gaps with plausible-sounding values.

- Use `DATA MISSING: [what's missing and why it matters]` for absent data
- Use `INSUFFICIENT DATA: [what you'd need to answer confidently]` for ambiguous data
- If Apple Ads MCP returns an error or times out, report the gap — do not estimate
- If a campaign has fewer than 100 impressions for a keyword, do not calculate PKEI — flag as insufficient data
- If impression share quota is exhausted, state that rather than guessing SOV

**Why this matters**: In paid search, a fabricated CPA or inflated PKEI score can lead to bid increases on unprofitable keywords or budget shifts that waste spend. Admitting uncertainty is always safer than acting on bad data.

---

## Rule 2: Cite Every Factual Claim

Every data point must include a source citation. If a claim cannot be traced to a specific data source, retract it.

**Citation formats for Apple Ads data**:

| Data type | Citation format |
|---|---|
| Apple Ads MCP campaign data | `[Source: Apple Ads campaign report, {campaign}, {date}]` |
| Apple Ads MCP keyword data | `[Source: Apple Ads keyword report, {ad_group}, {date}]` |
| Search term report | `[Source: search-terms.csv {date}, row for "{term}"]` |
| PKEI calculation | `[Source: pkei-summary.md {date}, {campaign} table]` |
| Impression share | `[Source: impression-share.json {date}, "{keyword}"]` |
| ASO cross-reference (optional) | `[Source: your ASO/keyword data source, {date}]` |
| Agent memory | `[Source: agent-memory/apple-ads-agent/MEMORY.md, {section}]` |
| Campaign ledger | `[Source: campaign-ledger.json, cycle {date}]` |
| Previous cycle comparison | `[Source: {metric} comparison, {date1} vs {date2}]` |
| Budget guardrails | `[Source: references/budget-guardrails.md, {rule}]` |

**Self-check**: Before presenting at a human gate, scan your output for uncited claims. If you find one, either:
1. Add the citation, or
2. Retract the claim with: `UNVERIFIED — retracted. Would need [specific data source] to confirm.`

---

## Rule 3: Extract Exact Data Before Analyzing

**Two-step protocol** (mandatory for all performance analysis):

**Step 1 — Extract**: Pull exact values from the data source. Quote them literally.
**Step 2 — Analyze**: Use only the extracted values to draw conclusions. Reference them by the values you extracted.

This prevents paraphrase-drift where approximate language subtly changes meaning during analysis. Paid search metrics are precise — "$1.47 CPA" and "roughly $1.50 CPA" can lead to different bid decisions.

---

## Interpretation Labels

Prefix all non-data claims with:
- `INTERPRETATION:` — your analysis of the data
- `RECOMMENDATION:` — your suggested action
- `RISK FLAG:` — something that needs attention
- `CROSS-POLLINATION:` — an ASO-related finding from paid data

---

## External Knowledge Restriction

Base your analysis ONLY on:
- Apple Ads MCP tool outputs (live campaign, keyword, search term data)
- CSV/JSON files in `docs/apple-ads/data/` (processed data)
- PKEI calculations from the current cycle
- ASO cross-reference data from your ASO/keyword data source (if you track one)
- Strategy docs and agent memory (historical context)
- Guardrails in `docs/apple-ads/.claude/CLAUDE.md` (rules)
- Budget guardrails in `references/budget-guardrails.md`

Do NOT use general knowledge about typical Apple Search Ads benchmarks, industry-average CPAs, or "normal" conversion rates to fill data gaps. General knowledge can inform *interpretation labels* (e.g., "a 40% TTR is strong for a category keyword") but never *data values* (e.g., "this keyword probably converts at around 5%").

---

## Few-Shot Examples

### Correct Research Mode Output

**Example 1 — Campaign performance with citations:**

> **App_Category_US 7-day performance** [Source: Apple Ads campaign report, App_Category_US, 2026-04-15]
>
> | Metric | Value | Previous cycle | Change |
> |---|---|---|---|
> | Impressions | 12,450 | 10,230 | +21.7% |
> | Taps | 1,120 | 890 | +25.8% |
> | Installs | 67 | 52 | +28.8% |
> | Spend | $142.30 | $118.50 | +20.1% |
> | TTR | 9.0% | 8.7% | +0.3pp |
> | CR | 5.98% | 5.84% | +0.14pp |
> | CPA | $2.12 | $2.28 | -$0.16 |
>
> INTERPRETATION: Category campaign showing healthy growth across all metrics. CPA declining while volume increases suggests bids are well-calibrated. Budget utilization at 78% — room to scale.

**Example 2 — Missing data handled correctly:**

> **App_Discovery_US search terms** [Source: Apple Ads search term report, App_Discovery_US, 2026-04-15]
>
> DATA MISSING: Apple Ads MCP returned a timeout for Discovery campaign search terms. Category and Brand search terms were retrieved successfully. Will retry Discovery in the next check-in. Previous search term data available from 2026-04-01 but cannot determine current discovery patterns without a fresh pull.

**Example 3 — Retracted claim:**

> ~~App_Brand_US impression share is declining, suggesting competitor encroachment.~~
>
> UNVERIFIED, retracted. Only one data point available (current cycle: 85%). Would need at least 2 consecutive impression share readings to establish a trend. [Source: impression-share.json 2026-04-15, "<brand> meditation"]

### Incorrect Output (what to avoid)

**Bad — vague language without data:**
> "The Category campaign is performing well with decent conversion rates and reasonable CPAs."

**Why it's wrong**: No specific numbers, no citations, no comparison to previous cycle. "Decent" and "reasonable" are subjective without PKEI context.

**Bad — gap-filling with benchmarks:**
> "The Discovery campaign's CPA of $3.50 is above the industry average of $2.00 for apps in this category, so we should reduce bids."

**Why it's wrong**: fabricates an "industry average" from general knowledge. The decision should be based on your own PKEI thresholds and budget guardrails, not assumed benchmarks.

**Bad — uncited trend claim:**
> "PKEI scores have been improving across all campaigns this quarter."

**Why it's wrong**: No citation to specific pkei-summary.md files, no dates, no actual PKEI values compared. May or may not be true.

---

## When Research Mode is NOT Active

When working on ad copy, CPP recommendations, or creative campaign structuring:
- Prioritize strategic thinking and user-intent matching
- You may draw on patterns without citing every influence
- Focus on keyword-to-CPP alignment and user journey coherence
- The data integrity rules from the agent file still apply (never fabricate data), but the citation format and extraction protocol do not
