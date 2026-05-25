// Resolves deployment-specific defaults from environment variables. Keeping env
// access here (rather than scattered through the tools) keeps the tool functions
// pure and testable, and gives a single place to document configuration.

/**
 * Default ISO 4217 currency for write operations (bids, budgets) when a caller
 * does not specify one. Set APPLE_ADS_CURRENCY to your Apple Ads account currency
 * (e.g. EUR, GBP). Falls back to USD.
 */
export function getDefaultCurrency(): string {
  return process.env.APPLE_ADS_CURRENCY || 'USD';
}

/**
 * Default App Store app ID (adamId) used when creating campaigns, if the caller
 * does not pass one. Set APPLE_ADS_DEFAULT_ADAM_ID to your app's App Store ID to
 * avoid repeating it. Returns undefined when unset, in which case adamId is required.
 */
export function getDefaultAdamId(): string | undefined {
  const value = process.env.APPLE_ADS_DEFAULT_ADAM_ID;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
