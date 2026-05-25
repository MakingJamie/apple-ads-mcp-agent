// Currency presentation helpers. The Apple Search Ads API returns ISO 4217 codes
// (e.g. "USD", "EUR") on every amount object; we render them for human-readable
// output. Single-glyph currencies get their symbol; everything else falls back to
// the ISO code so unusual currencies are never silently mislabeled.

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
};

/**
 * Returns a display symbol for an ISO 4217 currency code, falling back to the
 * uppercased code itself when there is no well-known single-glyph symbol.
 * Returns '' when no currency is provided.
 */
export function currencySymbol(code?: string | null): string {
  if (!code) return '';
  const upper = code.toUpperCase();
  return CURRENCY_SYMBOLS[upper] ?? upper;
}

/**
 * Formats a monetary amount with its currency symbol.
 *   formatMoney('1.50', 'EUR') -> '€1.50'
 *   formatMoney('5.00', 'AUD') -> 'AUD 5.00'
 *   formatMoney('1.00')        -> '1.00'
 * Multi-character symbols (ISO-code fallbacks) are separated from the amount with
 * a space for readability. The amount is passed through verbatim, so non-numeric
 * placeholders like 'N/A' are preserved.
 */
export function formatMoney(amount: number | string, code?: string | null): string {
  const symbol = currencySymbol(code);
  if (!symbol) return `${amount}`;
  const separator = symbol.length > 1 ? ' ' : '';
  return `${symbol}${separator}${amount}`;
}
