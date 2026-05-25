import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCampaigns, getCampaignPerformance } from '../../src/tools/campaigns.js';

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    getRateLimit: vi.fn().mockReturnValue({ remaining: 100, limit: 100 }),
  };
}

describe('getCampaigns', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('returns campaigns array and formatted text', async () => {
    client.get.mockResolvedValue({
      data: [
        {
          id: '111',
          name: 'Brand Campaign',
          status: 'ENABLED',
          budgetAmount: { amount: '500', currency: 'EUR' },
          dailyBudgetAmount: { amount: '50', currency: 'EUR' },
        },
        {
          id: '222',
          name: 'Discovery Campaign',
          status: 'PAUSED',
          budgetAmount: { amount: '1000', currency: 'EUR' },
          dailyBudgetAmount: { amount: '100', currency: 'EUR' },
        },
      ],
    });

    const result = await getCampaigns(client as any);

    expect(client.get).toHaveBeenCalledWith('/campaigns');
    expect(result.campaigns).toHaveLength(2);
    expect(result.campaigns[0].name).toBe('Brand Campaign');
    expect(result.text).toContain('Brand Campaign');
    expect(result.text).toContain('ENABLED');
    expect(result.text).toContain('€500');
    expect(result.text).toContain('€50');
  });

  it('handles empty campaign list', async () => {
    client.get.mockResolvedValue({ data: [] });

    const result = await getCampaigns(client as any);

    expect(result.campaigns).toEqual([]);
    expect(result.text).toBe('');
  });

  it('handles missing budget fields gracefully', async () => {
    client.get.mockResolvedValue({
      data: [
        {
          id: '333',
          name: 'No Budget Campaign',
          status: 'ENABLED',
        },
      ],
    });

    const result = await getCampaigns(client as any);

    expect(result.text).toContain('No Budget Campaign');
    expect(result.text).toContain('N/A');
  });

  it('handles missing data field', async () => {
    client.get.mockResolvedValue({});

    const result = await getCampaigns(client as any);

    expect(result.campaigns).toEqual([]);
    expect(result.text).toBe('');
  });
});

describe('getCampaignPerformance', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('posts correct body and transforms response to rows', async () => {
    client.post.mockResolvedValue({
      data: {
        reportingDataResponse: {
          row: [
            {
              metadata: { campaignId: 111, campaignName: 'Brand Campaign' },
              total: {
                impressions: 10000,
                taps: 500,
                totalInstalls: 50,
                localSpend: { amount: '250.00' },
                ttr: 0.05,
                totalInstallRate: 0.1,
                avgCPT: { amount: '0.50' },
                totalAvgCPI: { amount: '5.00' },
              },
            },
          ],
        },
      },
    });

    const result = await getCampaignPerformance(
      client as any,
      '111',
      '2026-03-01',
      '2026-03-22'
    );

    // Without granularity, uses returnRowTotals (mutually exclusive in API v5)
    expect(client.post).toHaveBeenCalledWith('/reports/campaigns', {
      startTime: '2026-03-01',
      endTime: '2026-03-22',
      returnRowTotals: true,
      selector: {
        orderBy: [{ field: 'campaignId', sortOrder: 'ASCENDING' }],
        pagination: { limit: 1000, offset: 0 },
      },
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      campaign: 'Brand Campaign',
      impressions: 10000,
      taps: 500,
      installs: 50,
      spend: 250,
      ttr: 0.05,
      cr: 0.1,
      cpt: 0.5,
      cpa: 5,
      dailyCap: 0,
      budgetUtilization: 0,
    });

    // CSV should have header + 1 data row
    const csvLines = result.csv.split('\n');
    expect(csvLines).toHaveLength(2);
    expect(csvLines[0]).toContain('Campaign');
    expect(csvLines[1]).toContain('Brand Campaign');
  });

  it('uses provided granularity without returnRowTotals', async () => {
    client.post.mockResolvedValue({
      data: { reportingDataResponse: { row: [] } },
    });

    await getCampaignPerformance(client as any, '111', '2026-03-01', '2026-03-22', 'WEEKLY');

    expect(client.post).toHaveBeenCalledWith(
      '/reports/campaigns',
      expect.objectContaining({ granularity: 'WEEKLY' })
    );
    // Should NOT include returnRowTotals when granularity is set
    expect(client.post).toHaveBeenCalledWith(
      '/reports/campaigns',
      expect.not.objectContaining({ returnRowTotals: true })
    );
  });

  it('handles empty rows', async () => {
    client.post.mockResolvedValue({
      data: { reportingDataResponse: { row: [] } },
    });

    const result = await getCampaignPerformance(client as any, '111', '2026-03-01', '2026-03-22');

    expect(result.rows).toEqual([]);
    // CSV should have header only
    expect(result.csv.split('\n')).toHaveLength(1);
  });

  it('handles missing reportingDataResponse', async () => {
    client.post.mockResolvedValue({ data: {} });

    const result = await getCampaignPerformance(client as any, '111', '2026-03-01', '2026-03-22');

    expect(result.rows).toEqual([]);
  });

  it('defaults missing total fields to zero', async () => {
    client.post.mockResolvedValue({
      data: {
        reportingDataResponse: {
          row: [
            {
              metadata: { campaignId: 111 },
              total: {},
            },
          ],
        },
      },
    });

    const result = await getCampaignPerformance(client as any, '111', '2026-03-01', '2026-03-22');

    expect(result.rows[0].impressions).toBe(0);
    expect(result.rows[0].spend).toBe(0);
    expect(result.rows[0].campaign).toBe('111'); // Falls back to campaignId
  });
});
