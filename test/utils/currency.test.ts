import { describe, it, expect } from 'vitest';
import { currencySymbol, formatMoney } from '../../src/utils/currency.js';

describe('currencySymbol', () => {
  it('returns the glyph for common currencies', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('JPY')).toBe('¥');
  });

  it('is case-insensitive', () => {
    expect(currencySymbol('eur')).toBe('€');
    expect(currencySymbol('usd')).toBe('$');
  });

  it('falls back to the uppercased ISO code for currencies without a known glyph', () => {
    expect(currencySymbol('AUD')).toBe('AUD');
    expect(currencySymbol('brl')).toBe('BRL');
  });

  it('returns an empty string when no currency is given', () => {
    expect(currencySymbol(undefined)).toBe('');
    expect(currencySymbol(null)).toBe('');
    expect(currencySymbol('')).toBe('');
  });
});

describe('formatMoney', () => {
  it('prefixes single-glyph currencies with no separator', () => {
    expect(formatMoney('1.50', 'EUR')).toBe('€1.50');
    expect(formatMoney(2, 'USD')).toBe('$2');
    expect(formatMoney('3.00', 'GBP')).toBe('£3.00');
  });

  it('separates multi-character (ISO-code fallback) symbols with a space', () => {
    expect(formatMoney('5.00', 'AUD')).toBe('AUD 5.00');
    expect(formatMoney('10.00', 'BRL')).toBe('BRL 10.00');
  });

  it('omits the symbol entirely when currency is missing', () => {
    expect(formatMoney('1.00', undefined)).toBe('1.00');
    expect(formatMoney('1.00', null)).toBe('1.00');
  });

  it('passes through non-numeric amounts (e.g. N/A) unchanged', () => {
    expect(formatMoney('N/A', 'EUR')).toBe('€N/A');
    expect(formatMoney('N/A', undefined)).toBe('N/A');
  });
});
