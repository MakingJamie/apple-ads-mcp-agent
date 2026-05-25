import { describe, it, expect } from 'vitest';
import {
  formatCampaignPerformanceCSV,
  formatKeywordPerformanceCSV,
  formatSearchTermsCSV,
  formatImpressionShareJSON,
  type CampaignPerformanceRow,
  type KeywordPerformanceRow,
  type SearchTermRow,
  type ImpressionShareEntry,
} from '../../src/utils/formatters.js';

describe('formatCampaignPerformanceCSV', () => {
  const rows: CampaignPerformanceRow[] = [
    {
      campaign: 'Brand_US',
      impressions: 1000,
      taps: 100,
      installs: 60,
      spend: 50.0,
      ttr: 0.1,
      cr: 0.6,
      cpt: 0.5,
      cpa: 0.83,
      dailyCap: 5.0,
      budgetUtilization: 1.0,
    },
  ];

  it('generates valid CSV with header row', () => {
    const csv = formatCampaignPerformanceCSV(rows);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'Campaign,Impressions,Taps,Installs,Spend,TTR,CR,CPT,CPA,DailyCap,BudgetUtilization'
    );
  });

  it('formats data rows correctly', () => {
    const csv = formatCampaignPerformanceCSV(rows);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('Brand_US,1000,100,60,50.00,0.1000,0.6000,0.50,0.83,5.00,1.0000');
  });

  it('handles empty array', () => {
    const csv = formatCampaignPerformanceCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('handles multiple rows', () => {
    const multiRows: CampaignPerformanceRow[] = [
      ...rows,
      {
        campaign: 'Category_US',
        impressions: 5000,
        taps: 500,
        installs: 200,
        spend: 250.0,
        ttr: 0.1,
        cr: 0.4,
        cpt: 0.5,
        cpa: 1.25,
        dailyCap: 25.0,
        budgetUtilization: 0.95,
      },
    ];
    const csv = formatCampaignPerformanceCSV(multiRows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });
});

describe('formatKeywordPerformanceCSV', () => {
  const rows: KeywordPerformanceRow[] = [
    {
      keywordId: '12345',
      campaign: 'Category_US',
      adGroup: 'Core Keywords',
      keyword: 'meditation journal',
      matchType: 'EXACT',
      impressions: 500,
      taps: 50,
      installs: 30,
      spend: 25.0,
      ttr: 0.1,
      cr: 0.6,
      cpt: 0.5,
      cpa: 0.83,
      bid: 1.0,
      suggestedBid: 1.5,
      pkei: 0.12,
      organicRank: 1000,
    },
  ];

  it('generates CSV with correct headers', () => {
    const csv = formatKeywordPerformanceCSV(rows);
    const header = csv.split('\n')[0];
    expect(header).toBe(
      'KeywordID,Campaign,AdGroup,Keyword,MatchType,Impressions,Taps,Installs,Spend,TTR,CR,CPT,CPA,Bid,SuggestedBid,PKEI,OrganicRank'
    );
  });

  it('handles keywords with commas by quoting', () => {
    const rowWithComma: KeywordPerformanceRow[] = [
      {
        ...rows[0],
        keyword: 'meditation, journal',
      },
    ];
    const csv = formatKeywordPerformanceCSV(rowWithComma);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('"meditation, journal"');
  });

  it('formats null PKEI as empty string', () => {
    const rowNullPKEI: KeywordPerformanceRow[] = [
      { ...rows[0], pkei: null },
    ];
    const csv = formatKeywordPerformanceCSV(rowNullPKEI);
    const dataLine = csv.split('\n')[1];
    // PKEI is second-to-last column
    const parts = dataLine.split(',');
    expect(parts[parts.length - 2]).toBe('');
  });
});

describe('formatSearchTermsCSV', () => {
  const rows: SearchTermRow[] = [
    {
      searchTerm: 'meditation for anxiety',
      matchedKeyword: 'anxiety relief',
      campaign: 'Category_US',
      adGroup: 'Core Keywords',
      impressions: 100,
      taps: 15,
      installs: 8,
      spend: 7.5,
      ttr: 0.15,
      cr: 0.533,
      cpt: 0.5,
      cpa: 0.94,
    },
  ];

  it('generates CSV with correct headers', () => {
    const csv = formatSearchTermsCSV(rows);
    const header = csv.split('\n')[0];
    expect(header).toBe(
      'SearchTerm,MatchedKeyword,Campaign,AdGroup,Impressions,Taps,Installs,Spend,TTR,CR,CPT,CPA'
    );
  });

  it('formats data correctly', () => {
    const csv = formatSearchTermsCSV(rows);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
  });
});

describe('formatImpressionShareJSON', () => {
  const entries: ImpressionShareEntry[] = [
    {
      keyword: 'my brand',
      campaign: 'Brand_US',
      impressionShare: '90-100%',
      rank: 1,
      searchPopularity: 5,
    },
  ];

  it('wraps entries with date and metadata', () => {
    const result = formatImpressionShareJSON(entries, '2026-03-22');
    const parsed = JSON.parse(result);
    expect(parsed.date).toBe('2026-03-22');
    expect(parsed.keywords).toHaveLength(1);
    expect(parsed.keywords[0].keyword).toBe('my brand');
  });

  it('handles empty entries', () => {
    const result = formatImpressionShareJSON([], '2026-03-22');
    const parsed = JSON.parse(result);
    expect(parsed.keywords).toHaveLength(0);
  });

  it('produces valid JSON', () => {
    const result = formatImpressionShareJSON(entries, '2026-03-22');
    expect(() => JSON.parse(result)).not.toThrow();
  });
});
