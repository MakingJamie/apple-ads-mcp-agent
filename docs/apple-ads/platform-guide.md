# Apple Search Ads — Platform Guide

Comprehensive reference for Apple Search Ads (ASA) best practices and API details, with a worked category example (meditation/wellness) at the end to make the patterns concrete.

---

## Apple Search Ads Overview

Apple Search Ads places your app at the top of App Store search results. Two tiers exist:
- **Search Ads Advanced** (the tier this tool targets): full keyword control, bid management, audience targeting, reporting API
- **Search Ads Basic**: simplified, pay-per-install, no keyword control

### API Details
- **Campaign Management API v5**: `https://api.searchads.apple.com/api/v5/`
- **No sandbox environment** — all API calls hit production. Test with low bids and paused campaigns.
- **Authentication**: OAuth 2.0 with ES256 JWT-signed private keys (generated in Apple Search Ads UI under Settings > API)
- **Rate limits**: Rolling 60-minute window tracked via `X-Rate-Limit` response header. Monitor after each request.
- **Impression share reports**: Max 10 per day, max 30-day date range per report

### Ad Placements
- **Search Results** (primary): appears at top of search results — highest intent, highest CVR
- **Search Tab**: appears on the search landing page before user types — awareness play, lower CVR
- **Today Tab**: featured on the App Store home screen — brand awareness, lowest CVR
- **Product Pages**: appears in "You Might Also Like" section — intercept competitors

This tool focuses on **Search Results** placement, typically the highest-ROI placement.

---

## Campaign Types

### 1. Brand Campaign
- **Purpose**: Defend owned brand terms (your app name and its common misspellings)
- **Match type**: Exact only
- **Expected CVR**: 50-70% (users already know the app)
- **Budget share**: 12-15%
- **Key rule**: NEVER pause, regardless of PKEI or CPA

### 2. Category Campaign
- **Purpose**: Capture users searching for category terms aligned with app features
- **Match type**: Exact
- **Expected CVR**: 10-30%
- **Budget share**: 50-60%
- **Examples**: meditation journal, anxiety relief, guided meditation, breathing exercises

### 3. Competitor Campaign
- **Purpose**: Intercept users searching for competitor apps
- **Match type**: Exact
- **Expected CPT**: 20-30% higher than category terms
- **Budget share**: 15-25% (when activated)
- **Key rule**: Requires explicit human approval before activation
- **Status**: Optional (off by default)

### 4. Discovery Campaign
- **Purpose**: Mine new keyword opportunities via Search Match and broad match
- **Match type**: Broad + Search Match (automatic)
- **Expected CVR**: Lower than Category (exploratory)
- **Budget share**: 10-15% (15-20% when entering new market)
- **Key rule**: Must have all Brand/Category exact-match keywords as negatives

---

## Match Types

### Exact Match
- Matches the specific keyword and close variants (plurals, misspellings)
- Tightest control, highest relevance
- Use for: Brand terms, proven category terms, competitor names

### Broad Match
- Matches keyword variants, synonyms, related phrases, and partial matches
- Wider reach, lower precision
- Use for: Discovery campaign keyword mining

### Search Match
- Apple automatically matches your ad to relevant search queries based on app metadata, category, and similar apps
- No keyword selection needed — Apple decides
- Use for: Discovery campaign alongside broad match
- Key risk: can match irrelevant terms without negative keyword management

---

## Metrics & Benchmarks (2025-2026)

| Metric | Definition | Benchmark | Notes |
|--------|-----------|-----------|-------|
| TTR | Taps / Impressions | 11.4% | Health & Fitness category average |
| CR | Installs / Taps | 67.2% | Health & Fitness category average |
| CPT | Spend / Taps | $0.92 median, $2.50 US | US is significantly above median |
| CPA | Spend / Installs | $2.90 | Varies widely by keyword competitiveness |
| SOV | Impression share % | 90-100% brand, 70-90% category | Reported as percentage ranges by Apple |

### Metric Relationships
- TTR reflects ad relevance and creative quality
- CR reflects App Store page quality (screenshots, ratings, description)
- CPT reflects keyword competition (more bidders = higher cost)
- CPA = CPT / CR (lower CR means higher CPA)
- Improving CR (App Store page) lowers CPA without increasing bids

---

## Bidding Strategies

### Tiered Approach
- **Tier 1** (exact match, high-performing): Highest bids — proven converters
- **Tier 2** (strong broad match): Moderate bids — validated but less precise
- **Tier 3** (exploratory): Lowest bids — testing new keywords

### Using Apple's Suggested Bid
- The `suggested_bid_amount` field (v5 API) provides Apple's recommended bid range
- Use as starting point for new keywords
- Adjust based on actual performance after 100+ impressions

### Bid Adjustment Rules
- **Increase bid**: Converting keyword with low impression share (SOV < 50%)
- **Decrease bid**: High-CPA keyword (CPA > 2x target)
- **Hold bid**: Keyword performing within target ranges
- **Incremental changes**: Adjust by 10-20% per cycle, not dramatic swings

---

## Budget Allocation

| Campaign Type | Budget Share | Rationale |
|--------------|-------------|-----------|
| Discovery | 10-15% | 15-20% when entering a new market |
| Brand | 12-15% | Defensive — must maintain SOV |
| Category | 50-60% | Primary acquisition channel |
| Competitor | 15-25% | When activated — higher CPT expected |

### Budget Management
- Set daily caps per campaign (not lifetime budgets)
- Monitor budget utilization — underspending means bids are too low or keywords too narrow
- Overspending (hitting cap early) means bids are competitive but volume is capped

---

## Custom Product Pages (CPPs)

- Up to 70 CPP variations per app in App Store Connect
- **42% higher TTR** when CPP creative aligns with keyword intent
- **9% higher CR** for ad variations vs default product page
- Each CPP can have unique screenshots, promotional text, and app preview videos

### CPP Strategy (example: a meditation app)
Create one CPP per high-intent keyword theme, and point matching keywords at it:
- **CPP 1, Sleep theme**: for keywords like sleep meditation, nsdr, yoga nidra (screenshots showing sleep features)
- **CPP 2, Stress/Anxiety theme**: for anxiety relief, stress relief, breathing exercises (screenshots showing calming features)
- **CPP 3, Journal/Mindfulness theme**: for meditation journal, guided meditation, ai meditation (screenshots showing journal and AI features)

Adapt the themes to your own app's top keyword clusters.

### CPP Best Practices
- Match creative intent to search query intent (not demographics)
- First 3 screenshots are most impactful — lead with the most relevant feature
- Test CPP performance against default page before scaling

---

## Audience Targeting

- **Customer type**: All users (default), New users, Returning users, Users of other apps
- **Demographics**: Age 18+, Gender (optional — avoid narrowing unless data supports it)
- **Device**: iPhone, iPad, or both
- **Default recommendation**: Target all to maximize volume; narrow only for specific campaigns with clear demographic data

---

## Day-Parting & Seasonality

### Day-Parting
- Wellness app users skew toward evening usage (7-10pm) and weekends
- Higher bids during peak hours can yield 15-25% ROAS improvement
- Implementation: Clone ad groups for time segments if day-parting

### Seasonal Opportunities
- **New Year (Dec-Jan)**: Highest wellness app demand — increase budgets 2-4 weeks before
- **Mental Health Awareness Month (May)**: Elevated search volume for anxiety, stress, mindfulness
- **Back to school (Aug-Sep)**: Moderate uptick in stress/anxiety searches
- **World Meditation Day (May 21)**: Niche but relevant traffic spike

---

## Negative Keyword Management

### Match Types for Negatives
- **Exact negative**: Blocks that exact search term only
- **Broad negative**: Blocks searches where all words in the negative keyword are present (order-independent)

### Negative Keyword Strategy
- **Discovery campaign**: Add all Brand, Category, and Competitor exact-match keywords as negatives — prevents duplicate spend across campaigns
- **Weekly**: Review search term report → negate non-converting terms with meaningful spend (>$5, zero installs)
- **Balance**: Over-negating limits keyword discovery; under-negating wastes budget on irrelevant terms

---

## Search Term Report Analysis

Available via Apple Ads MCP `get_search_terms` tool.

### Analysis Workflow
1. **Pull search term report** for the cycle period
2. **Identify high-converting terms** (CPA below target) not yet added as exact-match keywords
3. **Promote winners**: Add high-converting search terms to Category campaign as exact-match keywords at higher bid
4. **Negate losers**: Add non-converting terms (spend > $5, zero installs) as exact-match negatives in Discovery
5. **Flag for ASO**: Terms not in your organic keyword tracking are candidates to add there too

This is the primary keyword mining mechanism and the core of the Discovery → Exact Match funnel.

---

## Common Mistakes to Avoid

1. **Single campaign with all keywords** → uncontrollable spending, no budget isolation
2. **Over-reliance on Search Match** → irrelevant matches drain budget
3. **No attribution tracking** → flying blind on CPA and ROAS
4. **Pausing campaigns based on TTR alone** → TTR is misleading for non-Search Results placements
5. **Ignoring negative keyword management** → wasted spend on irrelevant and duplicate queries
6. **Not aligning CPP creative with keyword intent** → lower TTR and CR
7. **Dramatic bid changes** → destabilizes campaign learning; use 10-20% increments
8. **No brand defense** → competitors bid on your brand terms and steal installs

---

## API Rate Limits

- Rolling 60-minute window tracked via `X-Rate-Limit` response header
- Monitor `X-Rate-Limit` header after each request for remaining quota
- Impression share reports: max 10 per day, max 30-day date range per report
- Back off if approaching limits — failed requests still count against quota

---

## Worked Example: Meditation/Wellness Category

This section is an illustrative deep-dive for one vertical, to show how the patterns above apply in practice. Replace it with intelligence for your own category.

### Competitive Landscape
- **BetterSleep** bids on 5,400+ keywords (highest ASA score in Health & Fitness)
- **Calm** dominates category impression share with aggressive bidding
- **Headspace** focuses on brand defense and select category terms
- **Insight Timer** competes primarily on "free meditation" positioning

### Keyword Intelligence
- Feature-specific keywords ("sleep stories", "breathing exercises") outperform generic ("meditation app")
- Long-tail keywords ("meditation journal for anxiety") have lower competition and higher CR
- Localized keywords outperform English in non-English markets
- "AI meditation" is a growing search trend with low competition (an example of a feature-led differentiator to lean into)

### Category Trends
- Wellness app market growing 20%+ annually
- AI-powered features increasingly searched (low competition, high opportunity)
- NSDR/Yoga Nidra gaining mainstream awareness (niche but growing)
- Polyvagal theory terms have near-zero competition
