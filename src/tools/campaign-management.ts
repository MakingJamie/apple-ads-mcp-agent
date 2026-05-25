import { AppleAdsClient } from '../client.js';
import { formatMoney } from '../utils/currency.js';

export async function listAdGroups(
  client: AppleAdsClient,
  campaignId: string
): Promise<{ adGroups: any[]; text: string }> {
  const result = await client.get(`/campaigns/${campaignId}/adgroups`);
  const adGroups = result.data || [];
  const text = adGroups
    .map((ag: any) => {
      const bid = ag.defaultBidAmount?.amount || 'N/A';
      const searchMatch = ag.automatedKeywordsOptIn ? 'Search Match ON' : '';
      return `[ID: ${ag.id}] ${ag.name}: ${ag.status} | Default bid: ${formatMoney(bid, ag.defaultBidAmount?.currency)}${searchMatch ? ' | ' + searchMatch : ''}`;
    })
    .join('\n');
  return { adGroups, text: text || 'No ad groups found.' };
}

interface CreateCampaignParams {
  name: string;
  budgetAmount: number;
  dailyBudgetAmount: number;
  countriesOrRegions: string[];
  adamId: string;
  status?: 'ENABLED' | 'PAUSED';
  currency?: string;
}

interface CreateAdGroupParams {
  campaignId: string;
  name: string;
  matchType: 'Exact' | 'Broad' | 'Broad and Search Match';
  defaultBid: number;
  searchMatchEnabled?: boolean;
  cpaGoal?: number;
  currency?: string;
}

// The `|| 'USD'` below (and in the other write functions in this file) is a
// last-resort guard for direct callers. In normal operation index.ts always passes
// a resolved currency (APPLE_ADS_CURRENCY via config.getDefaultCurrency()), so this
// fallback only applies if a tool function is called without one.
export async function createCampaign(
  client: AppleAdsClient,
  params: CreateCampaignParams
): Promise<{ campaign: any; text: string }> {
  const currency = params.currency || 'USD';

  const body = {
    name: params.name,
    adamId: params.adamId,
    budgetAmount: { amount: String(params.budgetAmount), currency },
    dailyBudgetAmount: { amount: String(params.dailyBudgetAmount), currency },
    countriesOrRegions: params.countriesOrRegions,
    supplySources: ['APPSTORE_SEARCH_RESULTS'],
    adChannelType: 'SEARCH',
    billingEvent: 'TAPS',
    status: params.status || 'PAUSED',
  };

  const result = await client.post('/campaigns', body);
  const campaign = result.data || result;

  return {
    campaign,
    text: `Campaign created: ${campaign.name} (ID: ${campaign.id}, Status: ${campaign.status})`,
  };
}

interface UpdateCampaignParams {
  dailyBudgetAmount?: number;
  budgetAmount?: number;
  status?: 'ENABLED' | 'PAUSED';
  name?: string;
  currency?: string;
}

export async function updateCampaign(
  client: AppleAdsClient,
  campaignId: string,
  updates: UpdateCampaignParams
): Promise<{ campaign: any; text: string }> {
  const currency = updates.currency || 'USD';
  const body: Record<string, any> = {};
  const changes: string[] = [];

  if (updates.dailyBudgetAmount !== undefined) {
    body.dailyBudgetAmount = { amount: updates.dailyBudgetAmount.toFixed(2), currency };
    changes.push(`daily budget to ${formatMoney(updates.dailyBudgetAmount.toFixed(2), currency)}`);
  }
  if (updates.budgetAmount !== undefined) {
    body.budgetAmount = { amount: updates.budgetAmount.toFixed(2), currency };
    changes.push(`total budget to ${formatMoney(updates.budgetAmount.toFixed(2), currency)}`);
  }
  if (updates.status !== undefined) {
    body.status = updates.status;
    changes.push(`status to ${updates.status}`);
  }
  if (updates.name !== undefined) {
    body.name = updates.name;
    changes.push(`name to ${updates.name}`);
  }

  if (changes.length === 0) {
    throw new Error('At least one field must be provided to update (dailyBudgetAmount, budgetAmount, status, name)');
  }

  const result = await client.put(`/campaigns/${campaignId}`, { campaign: body });
  const campaign = result.data || result;

  return {
    campaign,
    text: `Updated campaign ${campaignId}: ${changes.join(', ')}`,
  };
}

export async function updateAdGroup(
  client: AppleAdsClient,
  campaignId: string,
  adGroupId: string,
  updates: { defaultBid?: number; status?: 'ENABLED' | 'PAUSED'; currency?: string }
): Promise<{ adGroup: any; text: string }> {
  const currency = updates.currency || 'USD';
  const body: Record<string, any> = {};
  const changes: string[] = [];

  if (updates.defaultBid !== undefined) {
    body.defaultBidAmount = { amount: updates.defaultBid.toFixed(2), currency };
    changes.push(`default bid to ${formatMoney(updates.defaultBid.toFixed(2), currency)}`);
  }
  if (updates.status !== undefined) {
    body.status = updates.status;
    changes.push(`status to ${updates.status}`);
  }

  const result = await client.put(`/campaigns/${campaignId}/adgroups/${adGroupId}`, body);
  const adGroup = result.data || result;

  return {
    adGroup,
    text: `Updated ad group ${adGroupId}: ${changes.join(', ')}`,
  };
}

export async function createAdGroup(
  client: AppleAdsClient,
  params: CreateAdGroupParams
): Promise<{ adGroup: any; text: string }> {
  const currency = params.currency || 'USD';

  const fullName = `${params.name} (${params.matchType})`;

  const body: Record<string, any> = {
    name: fullName,
    defaultBidAmount: { amount: params.defaultBid.toFixed(2), currency },
    startTime: new Date().toISOString(),
    pricingModel: 'CPC',
    status: 'PAUSED',
    automatedKeywordsOptIn: params.searchMatchEnabled ?? false,
  };

  if (params.cpaGoal !== undefined) {
    body.cpaGoal = { amount: params.cpaGoal.toFixed(2), currency };
  }

  const result = await client.post(`/campaigns/${params.campaignId}/adgroups`, body);
  const adGroup = result.data || result;

  return {
    adGroup,
    text: `Ad group created: ${adGroup.name} (ID: ${adGroup.id}) in campaign ${params.campaignId}`,
  };
}
