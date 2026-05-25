export interface KeywordMetrics {
  keyword: string;
  impressions: number;
  taps: number;
  installs: number;
  spend: number;
  isOrganic: boolean;
}

export interface PKEIResult {
  keyword: string;
  pkei: number | null;
  cr: number;
  ttr: number;
  cpt: number;
  relevanceMultiplier: number;
  classification: 'strong' | 'moderate' | 'underperformer' | null;
  insufficientData: boolean;
}

const MIN_IMPRESSIONS = 100;
const CPT_FLOOR = 0.01;
const ORGANIC_MULTIPLIER = 1.5;
const THRESHOLD_STRONG = 5.0;
const THRESHOLD_MODERATE = 2.0;

export function calculatePKEI(metrics: KeywordMetrics): PKEIResult {
  const { keyword, impressions, taps, installs, spend, isOrganic } = metrics;

  if (impressions < MIN_IMPRESSIONS) {
    return {
      keyword,
      pkei: null,
      cr: taps > 0 ? installs / taps : 0,
      ttr: impressions > 0 ? taps / impressions : 0,
      cpt: taps > 0 ? spend / taps : 0,
      relevanceMultiplier: isOrganic ? ORGANIC_MULTIPLIER : 1.0,
      classification: null,
      insufficientData: true,
    };
  }

  const cr = taps > 0 ? installs / taps : 0;
  const ttr = taps / impressions;
  const cpt = taps > 0 ? spend / taps : 0;
  const relevanceMultiplier = isOrganic ? ORGANIC_MULTIPLIER : 1.0;

  const pkei = (cr * ttr) / Math.max(cpt, CPT_FLOOR) * relevanceMultiplier;

  let classification: 'strong' | 'moderate' | 'underperformer';
  if (pkei >= THRESHOLD_STRONG) {
    classification = 'strong';
  } else if (pkei >= THRESHOLD_MODERATE) {
    classification = 'moderate';
  } else {
    classification = 'underperformer';
  }

  return {
    keyword,
    pkei,
    cr,
    ttr,
    cpt,
    relevanceMultiplier,
    classification,
    insufficientData: false,
  };
}
