import { AppleAdsClient } from '../client.js';
import { formatKeywordPerformanceCSV, type KeywordPerformanceRow } from '../utils/formatters.js';
import { formatMoney } from '../utils/currency.js';

function parseKeywordId(keywordId: string): number {
  const id = parseInt(keywordId, 10);
  if (isNaN(id)) throw new Error(`Invalid keyword ID: ${keywordId}`);
  return id;
}

export async function getKeywordPerformance(
  client: AppleAdsClient,
  campaignId: string,
  adGroupId: string,
  startDate: string,
  endDate: string,
  granularity?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
): Promise<{ rows: KeywordPerformanceRow[]; csv: string }> {
  // returnRowTotals and granularity are mutually exclusive in Apple Ads API v5.
  // Using both silently inflates totals.
  const body: Record<string, unknown> = {
    startTime: startDate,
    endTime: endDate,
    selector: {
      orderBy: [{ field: 'keywordId', sortOrder: 'ASCENDING' }],
      pagination: { limit: 1000, offset: 0 },
    },
  };
  const useGranularity = !!granularity;
  if (useGranularity) {
    body.granularity = granularity;
  } else {
    body.returnRowTotals = true;
  }
  const result = await client.post(
    `/reports/campaigns/${campaignId}/adgroups/${adGroupId}/keywords`,
    body
  );
  const rows: KeywordPerformanceRow[] = (
    result.data?.reportingDataResponse?.row || []
  ).map((row: any) => {
    // Extract metrics from the correct source
    let metrics: any;
    if (!useGranularity && row.total) {
      metrics = row.total;
    } else {
      // Sum across granularity periods
      const periods: any[] = row.granularity || [];
      const summed = periods.reduce((acc: any, p: any) => ({
        impressions: (acc.impressions || 0) + (p.impressions || 0),
        taps: (acc.taps || 0) + (p.taps || 0),
        totalInstalls: (acc.totalInstalls || 0) + (p.totalInstalls || 0),
        localSpend: {
          amount: String(parseFloat(acc.localSpend?.amount || '0') + parseFloat(p.localSpend?.amount || '0')),
        },
      }), {});
      const impressions = summed.impressions || 0;
      const taps = summed.taps || 0;
      const installs = summed.totalInstalls || 0;
      const spend = parseFloat(summed.localSpend?.amount || '0');
      metrics = {
        ...summed,
        ttr: impressions > 0 ? taps / impressions : 0,
        totalInstallRate: taps > 0 ? installs / taps : 0,
        avgCPT: { amount: taps > 0 ? (spend / taps).toFixed(2) : '0' },
        totalAvgCPI: { amount: installs > 0 ? (spend / installs).toFixed(2) : '0' },
      };
    }
    return {
      keywordId: row.metadata?.keywordId?.toString() || '',
      campaign: row.metadata?.campaignName || campaignId,
      adGroup: row.metadata?.adGroupName || adGroupId,
      keyword: row.metadata?.keyword || '',
      matchType: row.metadata?.matchType || '',
      impressions: metrics.impressions || 0,
      taps: metrics.taps || 0,
      installs: metrics.totalInstalls || 0,
      spend: parseFloat(metrics.localSpend?.amount || '0'),
      ttr: metrics.ttr || 0,
      cr: metrics.totalInstallRate || 0,
      cpt: parseFloat(metrics.avgCPT?.amount || '0'),
      cpa: parseFloat(metrics.totalAvgCPI?.amount || '0'),
      bid: parseFloat(row.metadata?.bidAmount?.amount || '0'),
      suggestedBid: parseFloat(
        row.insights?.bidRecommendation?.suggestedBidAmount?.amount || '0'
      ),
      pkei: null,
      organicRank: 0,
    };
  });
  return { rows, csv: formatKeywordPerformanceCSV(rows) };
}

export async function updateKeywordBid(
  client: AppleAdsClient,
  campaignId: string,
  adGroupId: string,
  keywordId: string,
  newBid: number,
  currency: string
): Promise<{ keyword: any; text: string }> {
  const result = await client.put(
    `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/bulk`,
    [{ id: parseKeywordId(keywordId), bidAmount: { amount: newBid.toFixed(2), currency } }]
  );
  const keywords = result.data || [];
  const keyword = keywords[0];
  const text = `Updated keyword ${keyword?.text || keywordId} bid to ${formatMoney(newBid.toFixed(2), currency)}`;
  return { keyword, text };
}

export async function addKeywords(
  client: AppleAdsClient,
  campaignId: string,
  adGroupId: string,
  keywords: { text: string; matchType: string; bidAmount: number }[],
  currency: string
): Promise<{ added: any[]; text: string }> {
  if (keywords.length === 0) {
    return { added: [], text: 'No keywords to add.' };
  }
  const body = keywords.map((kw) => ({
    text: kw.text,
    matchType: kw.matchType,
    bidAmount: { amount: kw.bidAmount.toFixed(2), currency },
  }));
  const result = await client.post(
    `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/bulk`,
    body
  );
  const added = result.data || [];
  const text = `Added ${added.length} keyword(s): ${added.map((k: any) => k.text).join(', ')}`;
  return { added, text };
}

export async function pauseKeyword(
  client: AppleAdsClient,
  campaignId: string,
  adGroupId: string,
  keywordId: string
): Promise<{ keyword: any; text: string }> {
  const result = await client.put(
    `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/bulk`,
    [{ id: parseKeywordId(keywordId), status: 'PAUSED' }]
  );
  const keywords = result.data || [];
  const keyword = keywords[0];
  const text = `Keyword ${keyword?.text || keywordId} set to PAUSED`;
  return { keyword, text };
}
