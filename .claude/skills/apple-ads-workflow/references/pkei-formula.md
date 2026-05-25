# PKEI (Paid Keyword Efficiency Index) — Formula Specification

PKEI measures the paid search efficiency of a keyword, combining conversion performance with cost efficiency and organic relevance. It is the paid-search counterpart to a KEI (Keyword Effectiveness Index) for organic rankings, if you track one.

---

## Formula

```
PKEI = (CR x TTR) / max(CPT, 0.01) x relevance_multiplier
```

### Parameters

| Parameter | Definition | Source |
|---|---|---|
| **CR** (Conversion Rate) | Installs / Taps, expressed as a decimal (e.g., 0.05 for 5%) | Apple Ads keyword report |
| **TTR** (Tap-Through Rate) | Taps / Impressions, expressed as a decimal (e.g., 0.08 for 8%) | Apple Ads keyword report |
| **CPT** (Cost Per Tap) | Total spend / Taps, in dollars | Apple Ads keyword report |
| **relevance_multiplier** | Organic relevance bonus (see below) | ASO cross-reference |

### Relevance Multiplier

The relevance multiplier rewards keywords where paid and organic presence reinforce each other:

- **1.5**: keyword also ranks organically (rank <= 50) in your ASO/keyword data source
- **1.0**: keyword not found in your ASO data, organic rank > 50, or you do not track ASO data

**Rationale**: keywords where your app has organic visibility benefit from a "halo effect": users who see both an organic listing and a paid ad have higher trust signals. The 1.5x multiplier reflects this synergy. If you do not track organic rankings, use 1.0 for all keywords and PKEI reduces to a pure paid-efficiency score.

### CPT Floor

`max(CPT, 0.01)` prevents division by zero for keywords with zero spend (e.g., paused keywords with historical data). The 0.01 floor ensures PKEI remains finite.

---

## Threshold Definitions

| PKEI Range | Classification | Action |
|---|---|---|
| > 10.0 | Exceptional | Increase bid to capture more volume — this keyword is highly efficient |
| 5.0 - 10.0 | Strong | Maintain or slightly increase bid — monitor for consistency |
| 3.0 - 5.0 | Good | Hold current bid — performing well within acceptable range |
| 2.0 - 3.0 | Moderate | Review bid and CPA — may need optimization or CPP alignment |
| 1.0 - 2.0 | Weak | Reduce bid or pause — reassess keyword-to-CPP match |
| < 1.0 | Poor | Pause unless brand keyword — investigate why it's underperforming |

---

## Minimum Data Requirements

- **Minimum impressions**: 100 — do not calculate PKEI for keywords with fewer than 100 impressions
- **Minimum taps**: 5 — keywords with fewer than 5 taps have unreliable CR; flag as `INSUFFICIENT DATA`
- **Reporting window**: Use the full cycle window (7 days for check-ins, 30 days for full cycles) to aggregate metrics before calculating PKEI

Keywords below minimum thresholds should be listed separately in `pkei-summary.md` under "Insufficient Data" with their current impression/tap counts.

---

## Special-Treatment Keywords

If your strategy excludes brand defense and competitor campaigns, then all keywords are evaluated purely on PKEI efficiency: no keyword gets special treatment, and any keyword whose PKEI drops below the weak threshold is considered for bid reduction or pausing regardless of what it is.

If you DO run a Brand campaign, brand keywords are the exception. They are typically held even at lower PKEI because defending navigational searches has strategic value beyond raw efficiency. Record which exceptions apply in your guardrails.

---

## Calibration

PKEI thresholds are initial estimates based on the formula's mathematical properties. After the first 3 full cycles with real data, review the actual distribution of PKEI scores:

- If most keywords cluster above 5.0, thresholds may be too generous — tighten them
- If most keywords cluster below 2.0, thresholds may be too strict — loosen them
- Track calibration observations in `.claude/agent-memory/apple-ads-agent/MEMORY.md`

**Recalibration process**:
1. Export PKEI values from the last 3 cycles
2. Calculate P25, P50, P75 percentiles
3. Propose adjusted thresholds where: P25 = weak/moderate boundary, P50 = moderate/good boundary, P75 = good/strong boundary
4. Present proposed recalibration at Human Gate 1 for the operator's approval
5. If approved, update the threshold table in this file and note the change in `docs/apple-ads/changelog.md`

---

## Normalization Note

The raw PKEI formula produces small decimal values because it multiplies two rates (both < 1.0) and divides by a dollar amount. Typical raw values range from 0.001 to 0.1.

**After the first cycle**, examine the actual distribution. If raw values are consistently below 0.1, apply a normalization factor (e.g., multiply by 100) to make the thresholds more intuitive. Document the normalization factor in:
- This file (update the formula section)
- Agent memory (`.claude/agent-memory/apple-ads-agent/MEMORY.md`)
- The strategy brief where the change is introduced

Until normalization is applied, use the raw values and adjust thresholds proportionally at the first recalibration.

---

## Relationship to ASO KEI (optional)

This section applies only if you also track an organic KEI. If you do not, PKEI stands alone as a pure paid-efficiency score.

| Metric | Domain | Measures | Source |
|---|---|---|---|
| **KEI** | Organic (ASO) | Keyword opportunity for metadata optimization | your ASO/keyword data source |
| **PKEI** | Paid (Apple Ads) | Keyword efficiency for bid optimization | Apple Ads MCP + workflow calculation |

**Cross-pollination matrix** (when you track both):

| KEI | Organic Rank | PKEI | Interpretation | Action |
|---|---|---|---|---|
| High | Low (poor) | High | Paid compensating for weak organic. Synergy opportunity. | Prioritize organic optimization to reduce paid dependency |
| High | High (strong) | High | Strong keyword overall. Paid reinforces organic. | Maintain both; consider increasing paid bid for dominance |
| Low | Any | High | Converts well in paid but limited organic opportunity. | Continue paid investment; organic unlikely to improve |
| High | Low (poor) | Low | Organic opportunity exists but paid is inefficient. | Focus on organic; reduce paid spend or improve CPP alignment |
| High | High (strong) | Low | Good organic position but paid is inefficient. | May not need paid — organic carries the traffic. Consider pausing paid |
| Low | Any | Low | Weak in both channels. | Deprioritize entirely unless brand term |

---

## Example Calculation

Example (for a meditation app):

```
Keyword: "meditation journal"   (an example category keyword)
Campaign: App_Category_US

Impressions: 2,450
Taps: 220
Installs: 15
Spend: $132.00

CR  = 15 / 220 = 0.0682
TTR = 220 / 2,450 = 0.0898
CPT = $132.00 / 220 = $0.60

ASO check: keyword ranks organically at rank 8 in the ASO data source
relevance_multiplier = 1.5

PKEI = (0.0682 x 0.0898) / max(0.60, 0.01) x 1.5
     = 0.006128 / 0.60 x 1.5
     = 0.01021 x 1.5
     = 0.01532
```

Raw PKEI = 0.01532. If normalization factor of 100 is applied: PKEI = 1.532 (Weak — review bid and CPP alignment).

---

## PKEI Summary Output Format

The `pkei-summary.md` file should follow this structure:

```markdown
# PKEI Summary — YYYY-MM-DD

## Overview
- Keywords analyzed: {N}
- Keywords with sufficient data (>=100 impressions): {N}
- Keywords with insufficient data: {N}
- Average PKEI: {X}
- Median PKEI: {X}
- Normalization factor: {1 or 100, as determined after first cycle}

## App_Brand_US
| Keyword | Impressions | Taps | Installs | CR | TTR | CPT | CPA | Organic Rank | Relevance | PKEI | Trend |
|---------|-----------|------|----------|----|----|-----|-----|-------------|-----------|------|-------|

## App_Category_US
(same table format)

## App_Discovery_US
(same table format)

## Top Performers (sorted by PKEI descending)
(top 10 across all campaigns)

## Underperformers (sorted by PKEI ascending, >=100 impressions)
(bottom 10 across all campaigns)

## Insufficient Data
| Keyword | Campaign | Impressions | Taps | Notes |
|---------|----------|-----------|------|-------|
```
