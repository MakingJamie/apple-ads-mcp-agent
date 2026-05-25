import { AppleAdsClient } from '../client.js';
import { formatMoney } from '../utils/currency.js';

interface BudgetCampaignSummary {
  id: string;
  name: string;
  dailyBudget: number;
  todaySpend: number;
  utilization: number;
  currency?: string;
}

export async function getBudgetSummary(
  client: AppleAdsClient,
  startDate: string,
  endDate: string
): Promise<{
  campaigns: BudgetCampaignSummary[];
  totalDailyBudget: number;
  totalSpend: number;
  text: string;
}> {
  const campaignResult = await client.get('/campaigns');
  const allCampaigns = campaignResult.data || [];

  // Only include enabled campaigns
  const enabledCampaigns = allCampaigns.filter(
    (c: any) => c.status === 'ENABLED'
  );

  if (enabledCampaigns.length === 0) {
    return { campaigns: [], totalDailyBudget: 0, totalSpend: 0, text: 'No enabled campaigns.' };
  }

  const campaigns: BudgetCampaignSummary[] = await Promise.all(
    enabledCampaigns.map(async (c: any) => {
      const dailyBudget = parseFloat(c.dailyBudgetAmount?.amount || '0');
      // returnRowTotals and granularity are mutually exclusive in Apple Ads API v5
      const body = {
        startTime: startDate,
        endTime: endDate,
        selector: {
          orderBy: [{ field: 'campaignId', sortOrder: 'ASCENDING' }],
          pagination: { limit: 100, offset: 0 },
        },
        returnRowTotals: true,
      };
      const report = await client.post('/reports/campaigns', body);
      const allRows = report.data?.reportingDataResponse?.row || [];
      const campaignRow = allRows.find((r: any) => String(r.metadata?.campaignId) === String(c.id));
      const todaySpend = campaignRow
        ? parseFloat(campaignRow.total?.localSpend?.amount || '0')
        : 0;
      const utilization = dailyBudget > 0 ? todaySpend / dailyBudget : 0;

      return {
        id: c.id,
        name: c.name,
        dailyBudget,
        todaySpend,
        utilization,
        currency: c.dailyBudgetAmount?.currency,
      };
    })
  );

  const totalDailyBudget = campaigns.reduce((sum, c) => sum + c.dailyBudget, 0);
  const totalSpend = campaigns.reduce((sum, c) => sum + c.todaySpend, 0);
  // One Apple Ads account uses a single currency, so the total reuses any campaign's.
  const accountCurrency = campaigns[0]?.currency;

  const lines = campaigns.map(
    (c) =>
      `${c.name}: ${formatMoney(c.todaySpend.toFixed(2), c.currency)}/${formatMoney(c.dailyBudget.toFixed(2), c.currency)} (${(c.utilization * 100).toFixed(1)}%)`
  );
  lines.push(`Total: ${formatMoney(totalSpend.toFixed(2), accountCurrency)}/${formatMoney(totalDailyBudget.toFixed(2), accountCurrency)}`);
  const text = lines.join('\n');

  return { campaigns, totalDailyBudget, totalSpend, text };
}
