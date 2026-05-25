import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDefaultCurrency, getDefaultAdamId } from '../src/config.js';

describe('getDefaultCurrency', () => {
  const original = process.env.APPLE_ADS_CURRENCY;
  afterEach(() => {
    if (original === undefined) delete process.env.APPLE_ADS_CURRENCY;
    else process.env.APPLE_ADS_CURRENCY = original;
  });

  it('returns USD when APPLE_ADS_CURRENCY is unset', () => {
    delete process.env.APPLE_ADS_CURRENCY;
    expect(getDefaultCurrency()).toBe('USD');
  });

  it('returns the configured currency when set', () => {
    process.env.APPLE_ADS_CURRENCY = 'EUR';
    expect(getDefaultCurrency()).toBe('EUR');
  });
});

describe('getDefaultAdamId', () => {
  const original = process.env.APPLE_ADS_DEFAULT_ADAM_ID;
  afterEach(() => {
    if (original === undefined) delete process.env.APPLE_ADS_DEFAULT_ADAM_ID;
    else process.env.APPLE_ADS_DEFAULT_ADAM_ID = original;
  });

  it('returns undefined when the env var is unset', () => {
    delete process.env.APPLE_ADS_DEFAULT_ADAM_ID;
    expect(getDefaultAdamId()).toBeUndefined();
  });

  it('returns undefined for a blank/whitespace value', () => {
    process.env.APPLE_ADS_DEFAULT_ADAM_ID = '   ';
    expect(getDefaultAdamId()).toBeUndefined();
  });

  it('returns the trimmed App Store ID when set', () => {
    process.env.APPLE_ADS_DEFAULT_ADAM_ID = ' 1234567890 ';
    expect(getDefaultAdamId()).toBe('1234567890');
  });
});
