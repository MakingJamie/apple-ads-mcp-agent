import { AppleAdsClient } from '../client.js';
import { formatCampaignPerformanceCSV, type CampaignPerformanceRow } from '../utils/formatters.js';
import { formatMoney } from '../utils/currency.js';

export async function getCampaigns(client: AppleAdsClient): Promise<{ campaigns: any[]; text: string }> {
  const result = await client.get('/campaigns');
  const campaigns = result.data || [];
  const text = campaigns
    .map((c: any) => {
      const budget = c.budgetAmount?.amount || 'N/A';
      const dailyCap = c.dailyBudgetAmount?.amount || 'N/A';
      const countries = c.countriesOrRegions?.join(', ') || 'N/A';
      // Currency comes from the account's own amount objects, so display is always
      // correct regardless of the account's currency.
      const currency = c.budgetAmount?.currency || c.dailyBudgetAmount?.currency;
      return `[ID: ${c.id}] ${c.name}: ${c.status} | Budget: ${formatMoney(budget, currency)} | Daily cap: ${formatMoney(dailyCap, currency)} | Countries: ${countries}`;
    })
    .join('\n');
  return { campaigns, text };
}

// Extract metrics from either row.total (returnRowTotals mode) or by summing
// row.granularity[] entries (granularity mode). These are mutually exclusive in
// Apple Ads API v5 — using both silently inflates totals.
function extractMetrics(row: any, useGranularity: boolean) {
  if (!useGranularity && row.total) {
    return row.total;
  }
  // Sum across granularity periods
  const periods: any[] = row.granularity || [];
  if (periods.length === 0) return {};
  return periods.reduce((acc: any, p: any) => ({
    impressions: (acc.impressions || 0) + (p.impressions || 0),
    taps: (acc.taps || 0) + (p.taps || 0),
    totalInstalls: (acc.totalInstalls || 0) + (p.totalInstalls || 0),
    localSpend: {
      amount: String(
        parseFloat(acc.localSpend?.amount || '0') +
        parseFloat(p.localSpend?.amount || '0')
      ),
    },
    // Rates must be recalculated from sums, not averaged
    ttr: 0,
    totalInstallRate: 0,
    avgCPT: { amount: '0' },
    totalAvgCPI: { amount: '0' },
  }), {});
}

function recalculateRates(metrics: any) {
  const impressions = metrics.impressions || 0;
  const taps = metrics.taps || 0;
  const installs = metrics.totalInstalls || 0;
  const spend = parseFloat(metrics.localSpend?.amount || '0');
  return {
    ...metrics,
    ttr: impressions > 0 ? taps / impressions : 0,
    totalInstallRate: taps > 0 ? installs / taps : 0,
    avgCPT: { amount: taps > 0 ? (spend / taps).toFixed(2) : '0' },
    totalAvgCPI: { amount: installs > 0 ? (spend / installs).toFixed(2) : '0' },
  };
}

export async function getCampaignPerformance(
  client: AppleAdsClient,
  campaignId: string,
  startDate: string,
  endDate: string,
  granularity?: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
): Promise<{ rows: CampaignPerformanceRow[]; csv: string }> {
  // returnRowTotals and granularity are mutually exclusive in Apple Ads API v5.
  // Using both silently inflates totals.
  const body: Record<string, unknown> = {
    startTime: startDate,
    endTime: endDate,
    selector: {
      orderBy: [{ field: 'campaignId', sortOrder: 'ASCENDING' }],
      pagination: { limit: 1000, offset: 0 },
    },
  };
  const useGranularity = !!granularity;
  if (useGranularity) {
    body.granularity = granularity;
  } else {
    body.returnRowTotals = true;
  }
  // Campaign reports use /reports/campaigns (no ID in path) — filter from response
  const result = await client.post('/reports/campaigns', body);
  const allRows = result.data?.reportingDataResponse?.row || [];
  const filtered = campaignId
    ? allRows.filter((r: any) => String(r.metadata?.campaignId) === String(campaignId))
    : allRows;
  const rows: CampaignPerformanceRow[] = filtered.map((row: any) => {
    const raw = extractMetrics(row, useGranularity);
    const metrics = useGranularity ? recalculateRates(raw) : raw;
    return {
      campaign: row.metadata?.campaignName || campaignId,
      impressions: metrics.impressions || 0,
      taps: metrics.taps || 0,
      installs: metrics.totalInstalls || 0,
      spend: parseFloat(metrics.localSpend?.amount || '0'),
      ttr: metrics.ttr || 0,
      cr: metrics.totalInstallRate || 0,
      cpt: parseFloat(metrics.avgCPT?.amount || '0'),
      cpa: parseFloat(metrics.totalAvgCPI?.amount || '0'),
      dailyCap: parseFloat(row.metadata?.dailyBudget?.amount || '0'),
      budgetUtilization: 0,
    };
  });
  return { rows, csv: formatCampaignPerformanceCSV(rows) };
}
