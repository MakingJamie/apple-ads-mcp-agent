# Budget Guardrails: Apple Search Ads

These guardrails define spending limits, allocation rules, and escalation protocols for all Apple Search Ads campaigns. The agent must never exceed these limits without explicit human gate approval.

Set the numeric values in this file to match your own budget before running the agent. The figures shown below are EXAMPLE placeholders that illustrate the structure: replace them with your real caps, then treat the file as authoritative.

---

## Hard Limits

### Daily Budget Cap

**Your daily budget cap across all campaigns (example: $50/day).**

This is the absolute ceiling. The sum of all campaign daily caps must not exceed your cap. If a new campaign is added, budget must be reallocated from existing campaigns to stay within the cap.

### Per-Keyword Bid Cap

**Your maximum bid on any single keyword (example: $3.00).**

A useful starting point is roughly 2x your category's estimated CPT benchmark. No keyword bid may exceed your cap regardless of PKEI score. If a keyword requires a bid above the cap to maintain position, flag it at the next human gate for the operator's decision.

### Budget Shift Ceiling

**Maximum 30% budget shift between campaigns in a single cycle.**

When reallocating budget from one campaign to another, no campaign's daily cap may change by more than 30% in a single cycle. Larger shifts require explicit approval at Human Gate 2.

Example: if a Category campaign has a $25 daily cap, the maximum increase in one cycle is $7.50 (to $32.50) and the maximum decrease is $7.50 (to $17.50).

---

## ROAS Floor

**Flag any keyword with CPA > 2x estimated app LTV.**

If a keyword's cost per acquisition exceeds twice the estimated lifetime value of an acquired user, flag it as a `RISK FLAG` in the strategy brief. The keyword should be considered for bid reduction or pausing.

LTV estimate source: the operator provides this figure. If no LTV estimate is available, use a conservative placeholder (e.g., $5.00) until the operator provides an updated number. Document the placeholder usage in the strategy brief.

---

## Initial Allocation

When launching campaigns for a new locale, allocate the daily cap across campaigns. A common pattern is to weight the bulk toward Category (the acquisition engine) and reserve a smaller slice for Discovery (opportunity-finding), holding back a buffer under the hard cap for scaling once data justifies it.

Example starting allocation (replace with your own figures):

| Campaign | Daily Cap | % of Allocated |
|----------|----------|-----------|
| App_Category_{Locale} | $25.00 | ~76% |
| App_Discovery_{Locale} | $8.00 | ~24% |
| **Total allocated** | **$33.00** | **100%** |

**Why allocate below the hard cap**: leaving headroom (here, ~$33 allocated against a ~$50 hard cap) gives room to scale after 2+ cycles with data, without immediately renegotiating the ceiling. Whether to also run Brand and Competitor campaigns is a strategy decision: record it in your guardrails. The example above runs Category + Discovery only.

**Budget for expansion**: when adding new locales, carve budget from existing campaigns or from the buffer to the hard cap. Total never exceeds the hard cap without explicit approval.

---

## Budget Increase Process

Increasing the daily hard cap requires:

1. Full cycle (not check-in) human gate approval
2. Demonstration that current budget is constraining profitable growth:
   - Category campaign hitting daily cap > 5 days in the cycle
   - PKEI distribution showing strong performers being capped
   - CPA trending at or below target across campaigns
3. Proposed new cap with per-campaign breakdown
4. The operator's explicit approval

The agent may recommend a budget increase but must never implement one without Human Gate 2 approval.

---

## Escalation Protocol

### Level 1: Flag at Next Check-In

- Daily spend exceeds 90% of total cap for 3+ consecutive days
- Any single campaign spending >110% of its daily cap (can happen with Apple's pacing)
- PKEI median dropping across 2 consecutive check-ins
- Discovery campaign generating fewer than 5 new search terms per week

### Level 2: Flag Immediately (Regardless of Cycle Timing)

- Any keyword's CPA suddenly doubles compared to previous cycle average
- Total spend on a single day exceeds the daily hard cap
- A single keyword's CPA exceeds 3x estimated LTV
- Apple Ads account-level budget alert triggered

### Level 3: Immediate Human Gate (Pause and Wait)

- Total monthly spend exceeds budget by >10% (projected or actual)
- Multiple keywords exceeding 3x LTV CPA simultaneously
- Evidence of click fraud or anomalous traffic patterns (sudden spike in taps with near-zero CR)
- Apple Ads policy violation or account warning

For Level 2 and Level 3 escalations, the agent should:
1. Document the issue in `docs/apple-ads/strategy/YYYY-MM-DD/agent-notes.md`
2. Present to the operator immediately with the relevant data and citations
3. Do NOT make any bid or budget changes until the operator responds

---

## Spend Tracking

### Per-Cycle Tracking

At each full cycle, record in the campaign ledger:

```json
{
  "spend_summary": {
    "total_daily_cap": 33.00,
    "avg_daily_spend": 27.50,
    "utilization_pct": 83.3,
    "days_at_cap": 2,
    "total_cycle_spend": 192.50,
    "by_campaign": {
      "App_Category_US": { "cap": 25.00, "avg_spend": 21.30, "utilization": 85.2 },
      "App_Discovery_US": { "cap": 8.00, "avg_spend": 6.20, "utilization": 77.5 }
    }
  }
}
```

### Monthly Rollup

At the start of each month, calculate the previous month's total spend from the campaign ledger records. Compare against the monthly budget expectation (daily cap x days in month). Flag if actual spend deviates by more than 10% from expected.

---

## Seasonal Adjustments

Most app categories show seasonal demand patterns. The agent should be aware of these but NOT adjust budgets automatically: seasonal changes go through normal human gate approval.

The relevant high- and low-demand periods depend on your category. Identify them from your own data and your category's calendar.

Example (for a meditation/wellness app):
- **Higher-demand periods** (consider budget increase requests): January (New Year's resolutions), Mental Health Awareness Month (May), World Meditation Day (May 21), back-to-school/work stress (September)
- **Lower-demand periods** (consider budget conservation): summer holidays (June-August, lower search volume), late November to December (holiday distraction, though "gift" searches may spike)

Seasonal patterns should be validated against your app's own data (at least 2 cycles in the same period from a prior year) before acting on them. Do not rely on general industry assumptions.
