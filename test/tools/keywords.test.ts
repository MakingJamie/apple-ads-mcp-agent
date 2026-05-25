import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getKeywordPerformance,
  updateKeywordBid,
  addKeywords,
  pauseKeyword,
} from '../../src/tools/keywords.js';

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    getRateLimit: vi.fn().mockReturnValue({ remaining: 100, limit: 100 }),
  };
}

describe('getKeywordPerformance', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('posts correct body and transforms response to keyword rows', async () => {
    client.post.mockResolvedValue({
      data: {
        reportingDataResponse: {
          row: [
            {
              metadata: {
                campaignName: 'Brand',
                adGroupName: 'Exact Match',
                keyword: 'meditation app',
                matchType: 'EXACT',
                bidAmount: { amount: '1.50' },
              },
              total: {
                impressions: 5000,
                taps: 250,
                installs: 25,
                localSpend: { amount: '125.00' },
                ttr: 0.05,
                conversionRate: 0.1,
                avgCPT: { amount: '0.50' },
                avgCPA: { amount: '5.00' },
              },
              insights: {
                bidRecommendation: { suggestedBidAmount: { amount: '2.00' } },
              },
            },
          ],
        },
      },
    });

    const result = await getKeywordPerformance(
      client as any,
      '111',
      '222',
      '2026-03-01',
      '2026-03-22'
    );

    // Without granularity, uses returnRowTotals (mutually exclusive in API v5)
    expect(client.post).toHaveBeenCalledWith(
      '/reports/campaigns/111/adgroups/222/keywords',
      expect.objectContaining({
        startTime: '2026-03-01',
        endTime: '2026-03-22',
        returnRowTotals: true,
      })
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].keyword).toBe('meditation app');
    expect(result.rows[0].matchType).toBe('EXACT');
    expect(result.rows[0].bid).toBe(1.5);
    expect(result.rows[0].suggestedBid).toBe(2);

    // CSV validation
    const csvLines = result.csv.split('\n');
    expect(csvLines).toHaveLength(2);
    expect(csvLines[0]).toContain('Keyword');
    expect(csvLines[0]).toContain('SuggestedBid');
  });

  it('handles empty keyword results', async () => {
    client.post.mockResolvedValue({
      data: { reportingDataResponse: { row: [] } },
    });

    const result = await getKeywordPerformance(client as any, '111', '222', '2026-03-01', '2026-03-22');
    expect(result.rows).toEqual([]);
    expect(result.csv.split('\n')).toHaveLength(1); // header only
  });

  it('handles missing insights/bid fields', async () => {
    client.post.mockResolvedValue({
      data: {
        reportingDataResponse: {
          row: [
            {
              metadata: { keyword: 'test' },
              total: {},
            },
          ],
        },
      },
    });

    const result = await getKeywordPerformance(client as any, '111', '222', '2026-03-01', '2026-03-22');
    expect(result.rows[0].bid).toBe(0);
    expect(result.rows[0].suggestedBid).toBe(0);
  });

  it('uses custom granularity', async () => {
    client.post.mockResolvedValue({
      data: { reportingDataResponse: { row: [] } },
    });

    await getKeywordPerformance(client as any, '111', '222', '2026-03-01', '2026-03-22', 'WEEKLY');
    expect(client.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ granularity: 'WEEKLY' })
    );
  });
});

describe('updateKeywordBid', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('sends PUT with correct bid amount via bulk endpoint', async () => {
    client.put.mockResolvedValue({
      data: [
        {
          id: 789,
          text: 'meditation app',
          bidAmount: { amount: '2.00', currency: 'EUR' },
        },
      ],
    });

    const result = await updateKeywordBid(client as any, '111', '222', '789', 2.0, 'EUR');

    expect(client.put).toHaveBeenCalledWith(
      '/campaigns/111/adgroups/222/targetingkeywords/bulk',
      [{ id: 789, bidAmount: { amount: '2.00', currency: 'EUR' } }]
    );
    expect(result.keyword).toBeDefined();
    expect(result.text).toContain('2.00');
  });

  it('threads the given currency into the bid and the summary symbol', async () => {
    client.put.mockResolvedValue({
      data: [{ id: 789, text: 'meditation app', bidAmount: { amount: '2.00', currency: 'GBP' } }],
    });

    const result = await updateKeywordBid(client as any, '111', '222', '789', 2.0, 'GBP');

    expect(client.put).toHaveBeenCalledWith(
      '/campaigns/111/adgroups/222/targetingkeywords/bulk',
      [{ id: 789, bidAmount: { amount: '2.00', currency: 'GBP' } }]
    );
    expect(result.text).toContain('£2.00');
  });

  it('returns error text on client failure', async () => {
    client.put.mockRejectedValue(new Error('API error (400): Bad Request'));

    await expect(
      updateKeywordBid(client as any, '111', '222', '789', -1, 'EUR')
    ).rejects.toThrow('400');
  });

  it('throws on non-numeric keyword ID', async () => {
    await expect(
      updateKeywordBid(client as any, '111', '222', 'abc', 2.0, 'EUR')
    ).rejects.toThrow('Invalid keyword ID: abc');
  });
});

describe('addKeywords', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('posts keywords array to correct endpoint', async () => {
    const keywords = [
      { text: 'meditation app', matchType: 'EXACT', bidAmount: 1.5 },
      { text: 'mindfulness', matchType: 'BROAD', bidAmount: 1.0 },
    ];

    client.post.mockResolvedValue({
      data: [
        { id: '1001', text: 'meditation app' },
        { id: '1002', text: 'mindfulness' },
      ],
    });

    const result = await addKeywords(client as any, '111', '222', keywords, 'EUR');

    expect(client.post).toHaveBeenCalledWith(
      '/campaigns/111/adgroups/222/targetingkeywords/bulk',
      [
        { text: 'meditation app', matchType: 'EXACT', bidAmount: { amount: '1.50', currency: 'EUR' } },
        { text: 'mindfulness', matchType: 'BROAD', bidAmount: { amount: '1.00', currency: 'EUR' } },
      ]
    );
    expect(result.added).toHaveLength(2);
    expect(result.text).toContain('meditation app');
  });

  it('uses the given currency for the bid amounts', async () => {
    client.post.mockResolvedValue({ data: [{ id: '1001', text: 'meditation app' }] });

    await addKeywords(
      client as any,
      '111',
      '222',
      [{ text: 'meditation app', matchType: 'EXACT', bidAmount: 1.5 }],
      'USD'
    );

    expect(client.post).toHaveBeenCalledWith(
      '/campaigns/111/adgroups/222/targetingkeywords/bulk',
      [{ text: 'meditation app', matchType: 'EXACT', bidAmount: { amount: '1.50', currency: 'USD' } }]
    );
  });

  it('handles empty keywords array', async () => {
    const result = await addKeywords(client as any, '111', '222', [], 'EUR');
    expect(result.added).toEqual([]);
    expect(client.post).not.toHaveBeenCalled();
  });
});

describe('pauseKeyword', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('sends PUT to update keyword status to PAUSED via bulk endpoint', async () => {
    client.put.mockResolvedValue({
      data: [{ id: 789, text: 'meditation app', status: 'PAUSED' }],
    });

    const result = await pauseKeyword(client as any, '111', '222', '789');

    expect(client.put).toHaveBeenCalledWith(
      '/campaigns/111/adgroups/222/targetingkeywords/bulk',
      [{ id: 789, status: 'PAUSED' }]
    );
    expect(result.keyword).toBeDefined();
    expect(result.text).toContain('PAUSED');
  });

  it('throws on non-numeric keyword ID', async () => {
    await expect(
      pauseKeyword(client as any, '111', '222', 'abc')
    ).rejects.toThrow('Invalid keyword ID: abc');
  });
});
