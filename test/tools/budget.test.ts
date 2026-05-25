import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBudgetSummary } from '../../src/tools/budget.js';

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    getRateLimit: vi.fn().mockReturnValue({ remaining: 100, limit: 100 }),
  };
}

describe('getBudgetSummary', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('fetches campaigns and performance to build budget summary', async () => {
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
          status: 'ENABLED',
          budgetAmount: { amount: '1000', currency: 'EUR' },
          dailyBudgetAmount: { amount: '100', currency: 'EUR' },
        },
      ],
    });

    client.post
      .mockResolvedValueOnce({
        data: {
          reportingDataResponse: {
            row: [
              {
                metadata: { campaignId: 111 },
                total: { localSpend: { amount: '35.50' } },
              },
            ],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          reportingDataResponse: {
            row: [
              {
                metadata: { campaignId: 222 },
                total: { localSpend: { amount: '80.00' } },
              },
            ],
          },
        },
      });

    const result = await getBudgetSummary(client as any, '2026-03-22', '2026-03-22');

    expect(client.get).toHaveBeenCalledWith('/campaigns');
    expect(client.post).toHaveBeenCalledTimes(2);

    expect(result.campaigns).toHaveLength(2);
    expect(result.campaigns[0].name).toBe('Brand Campaign');
    expect(result.campaigns[0].dailyBudget).toBe(50);
    expect(result.campaigns[0].todaySpend).toBe(35.5);
    expect(result.campaigns[0].utilization).toBeCloseTo(0.71, 1);

    expect(result.campaigns[1].todaySpend).toBe(80);

    expect(result.totalDailyBudget).toBe(150);
    expect(result.totalSpend).toBeCloseTo(115.5);
    expect(result.text).toContain('Brand Campaign');
    expect(result.text).toContain('Discovery Campaign');
  });

  it('handles no campaigns', async () => {
    client.get.mockResolvedValue({ data: [] });

    const result = await getBudgetSummary(client as any, '2026-03-22', '2026-03-22');

    expect(result.campaigns).toEqual([]);
    expect(result.totalDailyBudget).toBe(0);
    expect(result.totalSpend).toBe(0);
  });

  it('skips paused campaigns', async () => {
    client.get.mockResolvedValue({
      data: [
        {
          id: '111',
          name: 'Paused Campaign',
          status: 'PAUSED',
          dailyBudgetAmount: { amount: '50' },
        },
      ],
    });

    const result = await getBudgetSummary(client as any, '2026-03-22', '2026-03-22');

    expect(result.campaigns).toEqual([]);
    expect(client.post).not.toHaveBeenCalled();
  });

  it('handles missing spend data gracefully', async () => {
    client.get.mockResolvedValue({
      data: [
        {
          id: '111',
          name: 'New Campaign',
          status: 'ENABLED',
          dailyBudgetAmount: { amount: '50' },
        },
      ],
    });

    client.post.mockResolvedValue({
      data: { reportingDataResponse: { row: [] } },
    });

    const result = await getBudgetSummary(client as any, '2026-03-22', '2026-03-22');

    expect(result.campaigns[0].todaySpend).toBe(0);
    expect(result.campaigns[0].utilization).toBe(0);
  });
});
