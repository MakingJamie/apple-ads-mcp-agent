# Campaign Structure — Apple Search Ads

This document defines the campaign architecture, naming conventions, match type strategy, negative keyword rules, CPP alignment, and targeting defaults.

Throughout, illustrative examples are drawn from a meditation app to make the methodology concrete. Replace them with keywords and themes from your own app's category.

---

## Campaign Types

The recommended structure is a four-campaign architecture per locale. Each campaign serves a distinct strategic purpose. Not every account runs all four (some skip Brand or Competitor depending on strategy and budget). Decide which to run in your guardrails.

### Brand campaign — `<Prefix>_Brand_{Locale}`

**Purpose**: Defend brand terms and capture navigational searches.

- **Keywords**: your brand name and its variants, plus brand misspellings. Example (for a meditation app called "Acme"): "acme", "acme meditation", "acme journal".
- **Match type**: Exact match only
- **Goal**: Maintain >=90% impression share on brand terms
- **Bid strategy**: Bid enough to hold SOV. Brand keywords typically have high CR and low CPA
- **Budget priority**: Lowest absolute spend but highest priority. Never pause, never underbid
- **CPP**: Default product page (brand searchers already know the app)

> **When to skip Brand**: if your brand name has very little search volume, brand defense may not be worth the spend at an early stage. This is a strategy decision to record in your guardrails.

### Category campaign — `<Prefix>_Category_{Locale}`

**Purpose**: Capture high-intent category searches from users looking for an app like yours.

- **Keywords**: the generic, high-intent terms for your category. Example keywords for a meditation app: "meditation app", "guided meditation", "meditation timer", "breathing exercises", "sleep meditation", "mindfulness app", "yoga nidra", "nsdr", "stress relief app", "anxiety relief", "meditation journal".
- **Match type**: Exact match for proven converters, broad match for exploration (promote to exact once validated)
- **Goal**: Acquire users at or below target CPA
- **Bid strategy**: PKEI-driven. Increase bids on high-PKEI keywords, decrease on low-PKEI
- **Budget priority**: Highest absolute spend. This is the primary acquisition engine
- **CPP**: Theme-aligned (see CPP Alignment section below)

### Competitor campaign — `<Prefix>_Competitor_{Locale}`

**Purpose**: Intercept users searching for competing apps.

- **Keywords**: your competitors' brand names (the app names users type when shopping for an alternative in your category)
- **Match type**: Exact match only. Broad match on competitor terms wastes budget
- **Goal**: Capture users comparison-shopping at efficient CPA
- **Bid strategy**: Conservative. Competitor keywords typically have lower CR; only bid if CPA is within 1.5x target
- **Budget priority**: Lowest priority. First to reduce if budget is tight
- **CPP**: Feature-focused product page highlighting your app's differentiators (the features that set you apart in your category)
- **Important**: Ad copy must NEVER mention competitor names. Apple Search Ads policy prohibits this
- **When to skip Competitor**: many accounts choose not to bid on competitor terms at all. This is a strategy decision to record in your guardrails.

### Discovery campaign — `<Prefix>_Discovery_{Locale}`

**Purpose**: Find new converting search terms through Search Match and broad keywords.

- **Keywords**: Search Match enabled + broad match on high-level terms. Example (for a meditation app): "meditation", "mindfulness", "relax".
- **Match type**: Search Match (Apple's automated matching) + broad match
- **Goal**: Surface new keyword opportunities for promotion to Category or Brand campaigns
- **Bid strategy**: Lower bids than Category. Discovery is about finding opportunities, not volume
- **Budget priority**: Moderate. Enough to generate meaningful search term data
- **CPP**: Default product page

---

## Naming Convention

All campaigns follow the pattern: `<Prefix>_{Type}_{Locale}`

Choose a short prefix for your app (the examples below use `App_`). Use a consistent prefix so campaigns sort and filter cleanly in the dashboard.

| Type | Locale examples |
|------|----------------|
| Brand | App_Brand_US, App_Brand_UK, App_Brand_DE |
| Category | App_Category_US, App_Category_UK, App_Category_DE |
| Competitor | App_Competitor_US, App_Competitor_UK |
| Discovery | App_Discovery_US, App_Discovery_UK, App_Discovery_DE |

Ad groups within campaigns follow: `{Theme}_{MatchType}`
- Example (for a meditation app): `Sleep_Exact`, `Anxiety_Broad`, `General_SearchMatch`

---

## Match Type Definitions

### Exact Match
- Targets the specific keyword and close variants (plurals, common misspellings)
- Use for: proven converters, brand terms, competitor terms
- Highest control, highest predictability

### Broad Match
- Targets the keyword and related terms Apple deems relevant
- Use for: category exploration in Discovery campaign, new keyword testing in Category
- Requires active monitoring — add negatives for irrelevant matches
- Promote high-converting broad matches to exact match in Category campaign

### Search Match
- Apple automatically matches your ad to relevant searches based on app metadata
- Use for: Discovery campaign only
- No keyword control — relies entirely on Apple's matching algorithm
- Critical to negate all Brand + Category exact-match keywords to avoid cannibalizing those campaigns

---

## Negative Keyword Management

### Mandatory Negatives for Discovery Campaign

The Discovery campaign MUST negate all keywords that are exact-matched in Brand, Category, and Competitor campaigns. This prevents Discovery from cannibalizing traffic that should flow to higher-intent campaigns with optimized bids.

**Process**: After adding any keyword as exact match to Brand/Category/Competitor, immediately add it as an exact-match negative in Discovery.

### Non-Converter Negatives

- Any search term with spend above a small threshold (e.g., a few dollars) and zero installs: negate at the campaign level
- Any search term with meaningful spend and zero taps: negate at the campaign level
- Match type for negatives: exact match (unless the term is a root word that generates many variants, then use broad)

Set the exact spend thresholds in your budget guardrails so they are calibrated to your daily cap.

### Never Negate

- Your brand terms (your brand name and its variants): never negate anywhere
- High-converting organic keywords (rank <= 10 in your ASO data, if you track it): even if paid CPA is high, organic + paid synergy matters
- Terms with low spend and few impressions (e.g., under your minimum-data thresholds): insufficient data to judge

### Review Cadence

- Review Discovery search terms every cycle (weekly for check-ins, bi-weekly for full cycles)
- Review Category broad match search terms every full cycle
- Brand and Competitor campaigns on exact match should rarely generate irrelevant terms

---

## CPP (Custom Product Page) Alignment

The principle: create a CPP for each major keyword intent theme in your category, then route keywords to the CPP that matches their intent. Matching keywords to the right CPP improves TTR (tap-through rate) by showing users a product page that reflects what they searched for.

Identify your own intent themes from your category and keyword data. The example below shows three themes for a meditation app to illustrate the pattern. Build the equivalent set for your app.

### Example CPP 1: Sleep Theme (meditation app)

**Example keywords that would use this CPP:**
- sleep meditation
- nsdr
- yoga nidra
- sleep sounds
- bedtime meditation
- insomnia help
- sleep app

**Product page emphasis**: Sleep-focused screenshots, sleep session examples, NSDR/Yoga Nidra features, bedtime routine integration.

### Example CPP 2: Stress/Anxiety Theme (meditation app)

**Example keywords that would use this CPP:**
- anxiety relief
- stress relief
- breathing exercises
- calm anxiety
- panic attack help
- stress management
- relaxation app

**Product page emphasis**: Stress relief screenshots, breathing exercise features, anxiety-focused guided sessions, mood tracking integration.

### Example CPP 3: Journal/Mindfulness Theme (meditation app)

**Example keywords that would use this CPP:**
- meditation journal
- guided meditation
- ai meditation
- mindfulness app
- meditation app
- daily meditation
- meditation for beginners

**Product page emphasis**: Journal interface screenshots, AI-guided meditation features, daily practice tracking, meditation timer, session history.

### Default Product Page

Used for brand terms (users already know the app) and discovery/broad matches where intent is unclear. Shows the general app overview.

---

## Audience Targeting Defaults

- **User type**: All users (new + returning)
- **Device type**: All devices (iPhone + iPad)
- **Age range**: All ages (18+ by default for wellness category)
- **Gender**: All
- **Location**: Match to campaign locale (US campaigns target US, UK campaigns target UK, etc.)

### Day-Parting Guidance

Concentrate spend in the hours and days where your app converts best. The right windows depend on your category and audience: discover them from your own hourly performance data rather than assuming.

Example (for a meditation app, where usage skews toward wind-down and routine moments):
- **Evenings**: 7:00 PM - 10:00 PM local time (pre-bedtime wind-down)
- **Weekends**: Saturday and Sunday full day (more leisure time for app exploration)
- **Early morning**: 6:00 AM - 8:00 AM local time (morning routine seekers)

Day-parting is optional and should only be applied if budget is constrained and data supports concentration. Do not implement day-parting without at least 2 full cycles of hourly performance data to validate the pattern for your app.

---

## Locale Expansion

When launching campaigns in a new locale:

1. Start with Brand + Category campaigns only (skip Competitor + Discovery initially)
2. Seed the Category keyword set from your localized keyword data (translated category terms for that market). If you track ASO data, use that locale's keyword list as the starting set
3. Set initial bids modestly below an established locale's average CPT for equivalent keywords (e.g., around 80%), then tune from data
4. Run for 2 full cycles before adding the Discovery campaign
5. Add a Competitor campaign only if the locale has identifiable competing apps in that market and your strategy permits competitor bidding
6. Document the launch in `docs/apple-ads/changelog.md`
