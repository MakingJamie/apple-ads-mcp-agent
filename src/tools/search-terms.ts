import { AppleAdsClient } from '../client.js';
import { formatSearchTermsCSV, type SearchTermRow } from '../utils/formatters.js';

export async function getSearchTerms(
  client: AppleAdsClient,
  campaignId: string,
  startDate: string,
  endDate: string
): Promise<{ rows: SearchTermRow[]; csv: string }> {
  // Search terms API: returnRowTotals and granularity are mutually exclusive
  const body = {
    startTime: startDate,
    endTime: endDate,
    selector: {
      orderBy: [{ field: 'impressions', sortOrder: 'DESCENDING' }],
      pagination: { limit: 1000, offset: 0 },
    },
    returnRowTotals: true,
  };
  const result = await client.post(`/reports/campaigns/${campaignId}/searchterms`, body);
  const rows: SearchTermRow[] = (
    result.data?.reportingDataResponse?.row || []
  ).map((row: any) => ({
    searchTerm: row.metadata?.searchTermText || '',
    matchedKeyword: row.metadata?.keyword || '',
    campaign: row.metadata?.campaignName || campaignId,
    adGroup: row.metadata?.adGroupName || '',
    impressions: row.total?.impressions || 0,
    taps: row.total?.taps || 0,
    installs: row.total?.totalInstalls || 0,
    spend: parseFloat(row.total?.localSpend?.amount || '0'),
    ttr: row.total?.ttr || 0,
    cr: row.total?.totalInstallRate || 0,
    cpt: parseFloat(row.total?.avgCPT?.amount || '0'),
    cpa: parseFloat(row.total?.totalAvgCPI?.amount || '0'),
  }));
  return { rows, csv: formatSearchTermsCSV(rows) };
}
