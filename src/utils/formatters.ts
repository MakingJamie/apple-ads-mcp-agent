export interface CampaignPerformanceRow {
  campaign: string;
  impressions: number;
  taps: number;
  installs: number;
  spend: number;
  ttr: number;
  cr: number;
  cpt: number;
  cpa: number;
  dailyCap: number;
  budgetUtilization: number;
}

export interface KeywordPerformanceRow {
  keywordId: string;
  campaign: string;
  adGroup: string;
  keyword: string;
  matchType: string;
  impressions: number;
  taps: number;
  installs: number;
  spend: number;
  ttr: number;
  cr: number;
  cpt: number;
  cpa: number;
  bid: number;
  suggestedBid: number;
  pkei: number | null;
  organicRank: number;
}

export interface SearchTermRow {
  searchTerm: string;
  matchedKeyword: string;
  campaign: string;
  adGroup: string;
  impressions: number;
  taps: number;
  installs: number;
  spend: number;
  ttr: number;
  cr: number;
  cpt: number;
  cpa: number;
}

export interface ImpressionShareEntry {
  keyword: string;
  campaign: string;
  impressionShare: string;
  rank: number;
  searchPopularity: number;
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatCampaignPerformanceCSV(rows: CampaignPerformanceRow[]): string {
  const header = 'Campaign,Impressions,Taps,Installs,Spend,TTR,CR,CPT,CPA,DailyCap,BudgetUtilization';
  const lines = rows.map((r) => [
    escapeCSVField(r.campaign),
    r.impressions,
    r.taps,
    r.installs,
    r.spend.toFixed(2),
    r.ttr.toFixed(4),
    r.cr.toFixed(4),
    r.cpt.toFixed(2),
    r.cpa.toFixed(2),
    r.dailyCap.toFixed(2),
    r.budgetUtilization.toFixed(4),
  ].join(','));
  return [header, ...lines].join('\n');
}

export function formatKeywordPerformanceCSV(rows: KeywordPerformanceRow[]): string {
  const header =
    'KeywordID,Campaign,AdGroup,Keyword,MatchType,Impressions,Taps,Installs,Spend,TTR,CR,CPT,CPA,Bid,SuggestedBid,PKEI,OrganicRank';
  const lines = rows.map((r) => [
    escapeCSVField(r.keywordId),
    escapeCSVField(r.campaign),
    escapeCSVField(r.adGroup),
    escapeCSVField(r.keyword),
    r.matchType,
    r.impressions,
    r.taps,
    r.installs,
    r.spend.toFixed(2),
    r.ttr.toFixed(4),
    r.cr.toFixed(4),
    r.cpt.toFixed(2),
    r.cpa.toFixed(2),
    r.bid.toFixed(2),
    r.suggestedBid.toFixed(2),
    r.pkei !== null ? r.pkei.toFixed(2) : '',
    r.organicRank,
  ].join(','));
  return [header, ...lines].join('\n');
}

export function formatSearchTermsCSV(rows: SearchTermRow[]): string {
  const header =
    'SearchTerm,MatchedKeyword,Campaign,AdGroup,Impressions,Taps,Installs,Spend,TTR,CR,CPT,CPA';
  const lines = rows.map((r) => [
    escapeCSVField(r.searchTerm),
    escapeCSVField(r.matchedKeyword),
    escapeCSVField(r.campaign),
    escapeCSVField(r.adGroup),
    r.impressions,
    r.taps,
    r.installs,
    r.spend.toFixed(2),
    r.ttr.toFixed(4),
    r.cr.toFixed(4),
    r.cpt.toFixed(2),
    r.cpa.toFixed(2),
  ].join(','));
  return [header, ...lines].join('\n');
}

export function formatImpressionShareJSON(entries: ImpressionShareEntry[], date: string): string {
  return JSON.stringify(
    {
      date,
      keywords: entries,
    },
    null,
    2
  );
}
