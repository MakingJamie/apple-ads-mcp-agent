#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync } from 'fs';

import { AppleAdsAuth } from './auth.js';
import { AppleAdsClient } from './client.js';
import { getDefaultCurrency, getDefaultAdamId } from './config.js';
import { getCampaigns, getCampaignPerformance } from './tools/campaigns.js';
import { getKeywordPerformance, updateKeywordBid, addKeywords, pauseKeyword } from './tools/keywords.js';
import { getSearchTerms } from './tools/search-terms.js';
import { getImpressionShare } from './tools/impression-share.js';
import { getBudgetSummary } from './tools/budget.js';
import { addNegativeKeywords } from './tools/negatives.js';
import { createCampaign, createAdGroup, listAdGroups, updateAdGroup, updateCampaign } from './tools/campaign-management.js';

const server = new McpServer({
  name: 'apple-ads',
  version: '1.0.0',
});

// Deployment defaults resolved once from the environment (see config.ts).
const DEFAULT_CURRENCY = getDefaultCurrency();
const DEFAULT_ADAM_ID = getDefaultAdamId();

function createClient(): AppleAdsClient {
  const teamId = process.env.APPLE_ADS_TEAM_ID;
  const clientId = process.env.APPLE_ADS_CLIENT_ID;
  const keyId = process.env.APPLE_ADS_KEY_ID;
  const privateKeyPath = process.env.APPLE_ADS_PRIVATE_KEY_PATH;

  const orgId = process.env.APPLE_ADS_ORG_ID;

  if (!teamId || !clientId || !keyId || !privateKeyPath) {
    throw new Error(
      'Missing required env vars: APPLE_ADS_TEAM_ID, APPLE_ADS_CLIENT_ID, APPLE_ADS_KEY_ID, APPLE_ADS_PRIVATE_KEY_PATH'
    );
  }

  const privateKeyPem = readFileSync(privateKeyPath, 'utf-8');
  const auth = new AppleAdsAuth({ teamId, clientId, keyId, privateKeyPem });
  return new AppleAdsClient(auth, orgId || '');
}

let client: AppleAdsClient;

try {
  client = createClient();
} catch {
  // Client creation deferred — will fail on first tool call if env vars missing
  client = null as any;
}

// --- Tool Definitions ---

server.tool(
  'get_campaigns',
  'List all Apple Search Ads campaigns with status, budget, and daily cap',
  {},
  async () => {
    const result = await getCampaigns(client);
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'list_ad_groups',
  'List all ad groups within a campaign with status, default bid, and Search Match setting',
  {
    campaignId: z.string().describe('Campaign ID'),
  },
  async ({ campaignId }) => {
    const result = await listAdGroups(client, campaignId);
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'get_campaign_performance',
  'Get campaign-level performance metrics (impressions, taps, installs, spend, TTR, CR, CPT, CPA)',
  {
    campaignId: z.string().describe('Campaign ID'),
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
    granularity: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']).optional().describe('Report granularity — omit for totals, specify for time-series breakdown'),
  },
  async ({ campaignId, startDate, endDate, granularity }) => {
    const result = await getCampaignPerformance(client, campaignId, startDate, endDate, granularity);
    return { content: [{ type: 'text', text: result.csv }] };
  }
);

server.tool(
  'get_keyword_performance',
  'Get keyword-level performance metrics per ad group (includes suggested_bid_amount from API v5)',
  {
    campaignId: z.string().describe('Campaign ID'),
    adGroupId: z.string().describe('Ad Group ID'),
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
    granularity: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY']).optional().describe('Report granularity — omit for totals, specify for time-series breakdown'),
  },
  async ({ campaignId, adGroupId, startDate, endDate, granularity }) => {
    const result = await getKeywordPerformance(client, campaignId, adGroupId, startDate, endDate, granularity);
    return { content: [{ type: 'text', text: result.csv }] };
  }
);

server.tool(
  'get_search_terms',
  'Get search term report — actual queries triggering ads. Critical for ASO cross-pollination and keyword mining.',
  {
    campaignId: z.string().describe('Campaign ID'),
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
  },
  async ({ campaignId, startDate, endDate }) => {
    const result = await getSearchTerms(client, campaignId, startDate, endDate);
    return { content: [{ type: 'text', text: result.csv }] };
  }
);

server.tool(
  'get_impression_share',
  'Get Share of Voice (SOV) per keyword. Rate limited: max 10 reports/day, max 30-day date range.',
  {
    campaignId: z.string().describe('Campaign ID'),
    startDate: z.string().describe('Start date (YYYY-MM-DD, max 30 days range)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
    currentDailyCount: z.number().default(0).describe('Number of impression share reports already requested today'),
  },
  async ({ campaignId, startDate, endDate, currentDailyCount }) => {
    const result = await getImpressionShare(client, campaignId, startDate, endDate, currentDailyCount);
    if (result.error) {
      return { content: [{ type: 'text', text: `ERROR: ${result.error}` }], isError: true };
    }
    return { content: [{ type: 'text', text: result.json ?? '{}' }] };
  }
);

server.tool(
  'update_keyword_bid',
  'Adjust the bid amount for a specific keyword',
  {
    campaignId: z.string().describe('Campaign ID'),
    adGroupId: z.string().describe('Ad Group ID'),
    keywordId: z.string().describe('Keyword ID'),
    newBid: z.number().positive().describe('New bid amount in the account currency'),
    currency: z.string().default(DEFAULT_CURRENCY).describe('Currency code (defaults to APPLE_ADS_CURRENCY)'),
  },
  async ({ campaignId, adGroupId, keywordId, newBid, currency }) => {
    const result = await updateKeywordBid(client, campaignId, adGroupId, keywordId, newBid, currency);
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'add_keywords',
  'Add targeting keywords to an ad group',
  {
    campaignId: z.string().describe('Campaign ID'),
    adGroupId: z.string().describe('Ad Group ID'),
    keywords: z.preprocess(
      (val) => typeof val === 'string' ? JSON.parse(val) : val,
      z.array(z.object({
        text: z.string().describe('Keyword text'),
        matchType: z.enum(['EXACT', 'BROAD']).describe('Match type'),
        bidAmount: z.coerce.number().positive().describe('Bid amount in the account currency'),
      }))
    ).describe('Keywords to add'),
    currency: z.string().default(DEFAULT_CURRENCY).describe('Currency code (defaults to APPLE_ADS_CURRENCY)'),
  },
  async ({ campaignId, adGroupId, keywords, currency }) => {
    const result = await addKeywords(client, campaignId, adGroupId, keywords, currency);
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'pause_keyword',
  'Pause a keyword (set status to PAUSED)',
  {
    campaignId: z.string().describe('Campaign ID'),
    adGroupId: z.string().describe('Ad Group ID'),
    keywordId: z.string().describe('Keyword ID'),
  },
  async ({ campaignId, adGroupId, keywordId }) => {
    const result = await pauseKeyword(client, campaignId, adGroupId, keywordId);
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'add_negative_keywords',
  'Add negative keywords to filter irrelevant traffic (campaign or ad group level)',
  {
    level: z.enum(['campaign', 'adgroup']).describe('Negative keyword level'),
    campaignId: z.string().describe('Campaign ID'),
    adGroupId: z.string().optional().describe('Ad Group ID (required if level is adgroup)'),
    keywords: z.preprocess(
      (val) => typeof val === 'string' ? JSON.parse(val) : val,
      z.array(z.object({
        text: z.string().describe('Keyword text'),
        matchType: z.enum(['EXACT', 'BROAD']).describe('Match type'),
      }))
    ).describe('Negative keywords to add'),
  },
  async ({ level, campaignId, adGroupId, keywords }) => {
    const result = await addNegativeKeywords(client, level, campaignId, adGroupId ?? null, keywords);
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'get_budget_summary',
  'Get daily spend vs daily cap per campaign with budget utilization',
  {
    startDate: z.string().describe('Start date (YYYY-MM-DD)'),
    endDate: z.string().describe('End date (YYYY-MM-DD)'),
  },
  async ({ startDate, endDate }) => {
    const result = await getBudgetSummary(client, startDate, endDate);
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'update_ad_group',
  'Update an ad group\'s default bid or status. Default bid governs Search Match spend in Discovery campaigns.',
  {
    campaignId: z.string().describe('Campaign ID'),
    adGroupId: z.string().describe('Ad Group ID'),
    defaultBid: z.coerce.number().positive().optional().describe('New default bid in the account currency (governs Search Match)'),
    status: z.enum(['ENABLED', 'PAUSED']).optional().describe('New status'),
    currency: z.string().default(DEFAULT_CURRENCY).describe('Currency code (defaults to APPLE_ADS_CURRENCY)'),
  },
  async ({ campaignId, adGroupId, defaultBid, status, currency }) => {
    const result = await updateAdGroup(client, campaignId, adGroupId, { defaultBid, status, currency });
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'update_campaign',
  'Update a campaign\'s daily budget cap, total budget, status, or name',
  {
    campaignId: z.string().describe('Campaign ID'),
    dailyBudgetAmount: z.coerce.number().positive().optional().describe('New daily spending cap in the account currency'),
    budgetAmount: z.coerce.number().positive().optional().describe('New total campaign budget in the account currency'),
    status: z.enum(['ENABLED', 'PAUSED']).optional().describe('New campaign status'),
    name: z.string().optional().describe('New campaign name'),
    currency: z.string().default(DEFAULT_CURRENCY).describe('Currency code (defaults to APPLE_ADS_CURRENCY)'),
  },
  async ({ campaignId, dailyBudgetAmount, budgetAmount, status, name, currency }) => {
    const result = await updateCampaign(client, campaignId, {
      dailyBudgetAmount, budgetAmount, status, name, currency,
    });
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'create_campaign',
  'Create a new Apple Search Ads campaign with budget and geographic targeting',
  {
    name: z.string().describe('Campaign name (e.g., Brand_US)'),
    budgetAmount: z.coerce.number().positive().describe('Total campaign budget in the account currency'),
    dailyBudgetAmount: z.coerce.number().positive().describe('Daily spending cap in the account currency'),
    countriesOrRegions: z.preprocess(
      (val) => typeof val === 'string' ? JSON.parse(val) : val,
      z.array(z.string())
    ).describe('ISO country codes (e.g., ["US"])'),
    adamId: DEFAULT_ADAM_ID
      ? z.string().default(DEFAULT_ADAM_ID).describe(`App Store app ID (adamId). Defaults to the configured ${DEFAULT_ADAM_ID}.`)
      : z.string().describe('App Store app ID (adamId). Required, or set APPLE_ADS_DEFAULT_ADAM_ID to default it.'),
    status: z.enum(['ENABLED', 'PAUSED']).default('PAUSED').describe('Initial campaign status'),
    currency: z.string().default(DEFAULT_CURRENCY).describe('Currency code (defaults to APPLE_ADS_CURRENCY)'),
  },
  async ({ name, budgetAmount, dailyBudgetAmount, countriesOrRegions, adamId, status, currency }) => {
    const result = await createCampaign(client, {
      name, budgetAmount, dailyBudgetAmount, countriesOrRegions, adamId, status, currency,
    });
    return { content: [{ type: 'text', text: result.text }] };
  }
);

server.tool(
  'create_ad_group',
  'Create a new ad group within a campaign. Match type is appended to the name automatically, e.g., "Core Meditation (Exact)".',
  {
    campaignId: z.string().describe('Campaign ID'),
    name: z.string().describe('Ad group theme name (e.g., Core Meditation, Discovery) — match type is appended automatically'),
    matchType: z.enum(['Exact', 'Broad', 'Broad and Search Match']).describe('Match type — appended to name in parentheses'),
    defaultBid: z.coerce.number().positive().describe('Default CPC bid — set to the LOWEST bid you want for any keyword in this group'),
    searchMatchEnabled: z.preprocess(
      (val) => typeof val === 'string' ? val === 'true' : val,
      z.boolean().default(false)
    ).describe('Enable Search Match (for Discovery campaigns)'),
    cpaGoal: z.coerce.number().positive().optional().describe('Optional CPA goal in the account currency'),
    currency: z.string().default(DEFAULT_CURRENCY).describe('Currency code (defaults to APPLE_ADS_CURRENCY)'),
  },
  async ({ campaignId, name, matchType, defaultBid, searchMatchEnabled, cpaGoal, currency }) => {
    const result = await createAdGroup(client, {
      campaignId, name, matchType, defaultBid, searchMatchEnabled, cpaGoal, currency,
    });
    return { content: [{ type: 'text', text: result.text }] };
  }
);

// --- Start Server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start Apple Ads MCP server:', error);
  process.exit(1);
});
