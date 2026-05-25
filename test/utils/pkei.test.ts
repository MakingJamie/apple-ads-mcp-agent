import { describe, it, expect } from 'vitest';
import { calculatePKEI, type KeywordMetrics } from '../../src/utils/pkei.js';

describe('calculatePKEI', () => {
  const baseMetrics: KeywordMetrics = {
    keyword: 'meditation journal',
    impressions: 500,
    taps: 50,
    installs: 30,
    spend: 25.0,
    isOrganic: false,
  };

  it('calculates PKEI correctly for standard metrics', () => {
    // CR = 30/50 = 0.6, TTR = 50/500 = 0.1, CPT = 25/50 = 0.5
    // PKEI = (0.6 * 0.1) / 0.5 * 1.0 = 0.12
    const result = calculatePKEI(baseMetrics);
    expect(result.pkei).toBeCloseTo(0.12, 4);
    expect(result.cr).toBeCloseTo(0.6, 4);
    expect(result.ttr).toBeCloseTo(0.1, 4);
    expect(result.cpt).toBeCloseTo(0.5, 4);
  });

  it('applies 1.5x relevance multiplier for organic keywords', () => {
    const organicMetrics = { ...baseMetrics, isOrganic: true };
    const result = calculatePKEI(organicMetrics);
    // 0.12 * 1.5 = 0.18
    expect(result.pkei).toBeCloseTo(0.18, 4);
    expect(result.relevanceMultiplier).toBe(1.5);
  });

  it('uses 1.0x multiplier for non-organic keywords', () => {
    const result = calculatePKEI(baseMetrics);
    expect(result.relevanceMultiplier).toBe(1.0);
  });

  it('handles zero CPT by using floor of 0.01', () => {
    const freeMetrics: KeywordMetrics = {
      keyword: 'test',
      impressions: 200,
      taps: 20,
      installs: 10,
      spend: 0,
      isOrganic: false,
    };
    // CR = 0.5, TTR = 0.1, CPT = max(0, 0.01) = 0.01
    // PKEI = (0.5 * 0.1) / 0.01 = 5.0
    const result = calculatePKEI(freeMetrics);
    expect(result.pkei).toBeCloseTo(5.0, 4);
    expect(result.cpt).toBe(0);
  });

  it('returns null PKEI for insufficient impressions (< 100)', () => {
    const lowMetrics = { ...baseMetrics, impressions: 50, taps: 5, installs: 3 };
    const result = calculatePKEI(lowMetrics);
    expect(result.pkei).toBeNull();
    expect(result.insufficientData).toBe(true);
  });

  it('handles zero taps gracefully', () => {
    const noTaps = { ...baseMetrics, taps: 0, installs: 0, spend: 0 };
    const result = calculatePKEI(noTaps);
    // CR = 0/0 → 0, TTR = 0/500 = 0, PKEI = 0
    expect(result.pkei).toBeCloseTo(0, 4);
    expect(result.cr).toBe(0);
    expect(result.ttr).toBe(0);
  });

  it('handles zero impressions gracefully', () => {
    const noImpressions: KeywordMetrics = {
      keyword: 'test',
      impressions: 0,
      taps: 0,
      installs: 0,
      spend: 0,
      isOrganic: false,
    };
    const result = calculatePKEI(noImpressions);
    expect(result.pkei).toBeNull();
    expect(result.insufficientData).toBe(true);
  });

  it('classifies high PKEI as strong', () => {
    // Engineer metrics for PKEI > 5.0
    const highMetrics: KeywordMetrics = {
      keyword: 'polyvagal',
      impressions: 200,
      taps: 100,
      installs: 80,
      spend: 5.0,
      isOrganic: true,
    };
    // CR = 0.8, TTR = 0.5, CPT = 0.05
    // PKEI = (0.8 * 0.5) / 0.05 * 1.5 = 12.0
    const result = calculatePKEI(highMetrics);
    expect(result.classification).toBe('strong');
  });

  it('classifies moderate PKEI correctly', () => {
    const modMetrics: KeywordMetrics = {
      keyword: 'meditation',
      impressions: 1000,
      taps: 100,
      installs: 50,
      spend: 50.0,
      isOrganic: false,
    };
    // CR = 0.5, TTR = 0.1, CPT = 0.5
    // PKEI = (0.5 * 0.1) / 0.5 = 0.1 → actually underperformer
    // Let me recalculate for moderate range
    const modMetrics2: KeywordMetrics = {
      keyword: 'sleep meditation',
      impressions: 500,
      taps: 150,
      installs: 100,
      spend: 30.0,
      isOrganic: true,
    };
    // CR = 100/150 = 0.667, TTR = 150/500 = 0.3, CPT = 30/150 = 0.2
    // PKEI = (0.667 * 0.3) / 0.2 * 1.5 = 1.5
    // Wait, that's still < 2.0. Let me adjust.
    const modMetrics3: KeywordMetrics = {
      keyword: 'guided meditation',
      impressions: 300,
      taps: 100,
      installs: 80,
      spend: 10.0,
      isOrganic: true,
    };
    // CR = 0.8, TTR = 0.333, CPT = 0.1
    // PKEI = (0.8 * 0.333) / 0.1 * 1.5 = 4.0
    const result = calculatePKEI(modMetrics3);
    expect(result.classification).toBe('moderate');
    expect(result.pkei).toBeGreaterThanOrEqual(2.0);
    expect(result.pkei).toBeLessThan(5.0);
  });

  it('classifies low PKEI as underperformer', () => {
    const result = calculatePKEI(baseMetrics);
    expect(result.classification).toBe('underperformer');
  });

  it('returns null classification for insufficient data', () => {
    const lowMetrics = { ...baseMetrics, impressions: 50 };
    const result = calculatePKEI(lowMetrics);
    expect(result.classification).toBeNull();
  });

  it('preserves keyword name in result', () => {
    const result = calculatePKEI(baseMetrics);
    expect(result.keyword).toBe('meditation journal');
  });
});
