import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSearchTerms } from '../../src/tools/search-terms.js';

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    getRateLimit: vi.fn().mockReturnValue({ remaining: 100, limit: 100 }),
  };
}

describe('getSearchTerms', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('posts correct body and transforms response to search term rows', async () => {
    client.post.mockResolvedValue({
      data: {
        reportingDataResponse: {
          row: [
            {
              metadata: {
                searchTermText: 'meditation timer',
                keyword: 'meditation app',
                campaignName: 'Brand',
                adGroupName: 'Exact Match',
              },
              total: {
                impressions: 1200,
                taps: 60,
                installs: 12,
                localSpend: { amount: '30.00' },
                ttr: 0.05,
                conversionRate: 0.2,
                avgCPT: { amount: '0.50' },
                avgCPA: { amount: '2.50' },
              },
            },
          ],
        },
      },
    });

    const result = await getSearchTerms(client as any, '111', '2026-03-01', '2026-03-22');

    expect(client.post).toHaveBeenCalledWith(
      '/reports/campaigns/111/searchterms',
      expect.objectContaining({
        startTime: '2026-03-01',
        endTime: '2026-03-22',
      })
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].searchTerm).toBe('meditation timer');
    expect(result.rows[0].matchedKeyword).toBe('meditation app');
    expect(result.rows[0].impressions).toBe(1200);
    expect(result.rows[0].spend).toBe(30);

    // CSV validation
    const csvLines = result.csv.split('\n');
    expect(csvLines).toHaveLength(2);
    expect(csvLines[0]).toContain('SearchTerm');
    expect(csvLines[1]).toContain('meditation timer');
  });

  it('handles empty results', async () => {
    client.post.mockResolvedValue({
      data: { reportingDataResponse: { row: [] } },
    });

    const result = await getSearchTerms(client as any, '111', '2026-03-01', '2026-03-22');
    expect(result.rows).toEqual([]);
    expect(result.csv.split('\n')).toHaveLength(1);
  });

  it('handles missing reportingDataResponse', async () => {
    client.post.mockResolvedValue({ data: {} });

    const result = await getSearchTerms(client as any, '111', '2026-03-01', '2026-03-22');
    expect(result.rows).toEqual([]);
  });

  it('defaults missing total fields to zero', async () => {
    client.post.mockResolvedValue({
      data: {
        reportingDataResponse: {
          row: [
            {
              metadata: { searchTermText: 'yoga' },
              total: {},
            },
          ],
        },
      },
    });

    const result = await getSearchTerms(client as any, '111', '2026-03-01', '2026-03-22');
    expect(result.rows[0].impressions).toBe(0);
    expect(result.rows[0].spend).toBe(0);
    expect(result.rows[0].searchTerm).toBe('yoga');
    expect(result.rows[0].matchedKeyword).toBe('');
  });
});
