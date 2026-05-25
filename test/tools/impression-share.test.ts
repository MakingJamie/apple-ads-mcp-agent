import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getImpressionShare } from '../../src/tools/impression-share.js';

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    getRateLimit: vi.fn().mockReturnValue({ remaining: 100, limit: 100 }),
  };
}

// No-op sleep for tests so polling does not delay the suite.
const noSleep = () => Promise.resolve();

describe('getImpressionShare', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  describe('daily rate limit', () => {
    it('rejects when daily count is at limit', async () => {
      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        10
      );

      expect(result.error).toContain('Daily impression share report limit reached');
      expect(result.entries).toEqual([]);
      expect(client.post).not.toHaveBeenCalled();
      expect(client.get).not.toHaveBeenCalled();
    });

    it('rejects when daily count exceeds limit', async () => {
      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        15
      );

      expect(result.error).toBeDefined();
      expect(client.post).not.toHaveBeenCalled();
    });

    it('allows count of 0', async () => {
      client.post.mockResolvedValue({ data: { id: 'report-1' } });
      client.get.mockResolvedValue({
        data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
      });

      await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );
      expect(client.post).toHaveBeenCalled();
    });

    it('allows count of 9 (just under limit)', async () => {
      client.post.mockResolvedValue({ data: { id: 'report-1' } });
      client.get.mockResolvedValue({
        data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
      });

      await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        9,
        { sleep: noSleep }
      );
      expect(client.post).toHaveBeenCalled();
    });
  });

  describe('two-step custom reports flow', () => {
    it('POSTs to /custom-reports with an IMPRESSION_SHARE report definition', async () => {
      client.post.mockResolvedValue({ data: { id: 'report-1' } });
      client.get.mockResolvedValue({
        data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
      });

      await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(client.post).toHaveBeenCalledWith(
        '/custom-reports',
        expect.objectContaining({
          reportType: 'IMPRESSION_SHARE',
          startTime: '2026-03-01',
          endTime: '2026-03-22',
        })
      );
    });

    it('includes the campaign ID in the report selector conditions', async () => {
      client.post.mockResolvedValue({ data: { id: 'report-1' } });
      client.get.mockResolvedValue({
        data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
      });

      await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      const postBody = client.post.mock.calls[0][1];
      const values = postBody.selector?.conditions?.[0]?.values;
      expect(values).toContain('111');
    });

    it('GETs /custom-reports/{id} using the id returned by POST', async () => {
      client.post.mockResolvedValue({ data: { id: 'report-abc-123' } });
      client.get.mockResolvedValue({
        data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
      });

      await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(client.get).toHaveBeenCalledWith('/custom-reports/report-abc-123');
    });

    it('parses entries from a completed report', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: {
          state: 'COMPLETED',
          reportingDataResponse: {
            row: [
              {
                metadata: { searchTerm: 'meditation app', campaignName: 'Brand' },
                total: {
                  impressionShare: '0.45',
                  rank: 2,
                  searchPopularity: 55,
                },
              },
              {
                metadata: { searchTerm: 'mindfulness', campaignName: 'Category' },
                total: {
                  impressionShare: '0.30',
                  rank: 5,
                  searchPopularity: 40,
                },
              },
            ],
          },
        },
      });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        5,
        { sleep: noSleep }
      );

      expect(result.error).toBeUndefined();
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].keyword).toBe('meditation app');
      expect(result.entries[0].impressionShare).toBe('0.45');
      expect(result.entries[0].rank).toBe(2);
      expect(JSON.parse(result.json!)).toHaveProperty('keywords');
    });

    it('handles empty results', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
      });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.entries).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('falls back to highImpressionShare when impressionShare field is absent', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: {
          state: 'COMPLETED',
          reportingDataResponse: {
            row: [
              {
                metadata: { searchTerm: 'yoga', campaignName: 'Discovery' },
                total: {
                  highImpressionShare: '0.22',
                  rank: 9,
                  searchPopularity: 38,
                },
              },
            ],
          },
        },
      });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.entries[0].keyword).toBe('yoga');
      expect(result.entries[0].impressionShare).toBe('0.22');
    });
  });

  describe('async polling', () => {
    it('polls until state becomes COMPLETED', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get
        .mockResolvedValueOnce({ data: { state: 'IN_PROGRESS' } })
        .mockResolvedValueOnce({ data: { state: 'IN_PROGRESS' } })
        .mockResolvedValueOnce({
          data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
        });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toBeUndefined();
      expect(client.get).toHaveBeenCalledTimes(3);
    });

    it('returns error when report state is FAILED', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({ data: { state: 'FAILED' } });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('FAILED');
      expect(result.entries).toEqual([]);
    });

    it('returns error when report state is ERROR', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({ data: { state: 'ERROR' } });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('ERROR');
      expect(result.entries).toEqual([]);
    });

    it('surfaces unknown terminal states (e.g. CANCELLED) as an error rather than polling to timeout', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({ data: { state: 'CANCELLED' } });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep, maxPollAttempts: 5 }
      );

      expect(result.error).toContain('unexpected state');
      expect(result.error).toContain('CANCELLED');
      // Must fail fast — no repeated polling on an unknown state.
      expect(client.get).toHaveBeenCalledTimes(1);
    });

    it('keeps polling on known pending states (PENDING, QUEUED, missing state)', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get
        .mockResolvedValueOnce({ data: { state: 'PENDING' } })
        .mockResolvedValueOnce({ data: { state: 'QUEUED' } })
        .mockResolvedValueOnce({ data: {} }) // missing state
        .mockResolvedValueOnce({
          data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
        });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toBeUndefined();
      expect(client.get).toHaveBeenCalledTimes(4);
    });

    it('times out after max poll attempts when report never completes', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({ data: { state: 'IN_PROGRESS' } });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep, maxPollAttempts: 3 }
      );

      expect(result.error).toContain('did not complete');
      expect(client.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('returns error when POST response lacks a report id', async () => {
      client.post.mockResolvedValue({ data: {} });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('no report id');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('surfaces upstream 403 with a clear error message (known Apple Ads issue)', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockRejectedValue(
        new Error('Apple Ads API error (403): <html>Forbidden</html>')
      );

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('403');
      expect(result.error).toContain('upstream');
      expect(result.entries).toEqual([]);
    });

    it('surfaces POST failures without attempting to poll', async () => {
      client.post.mockRejectedValue(
        new Error('Apple Ads API error (500): server error')
      );

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('Failed to create custom report');
      expect(client.get).not.toHaveBeenCalled();
    });

    it('surfaces non-403 poll failures with a generic poll error (not the 403 upstream message)', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockRejectedValue(
        new Error('Apple Ads API error (500): internal server error')
      );

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('Failed to poll custom report');
      expect(result.error).not.toContain('upstream');
      expect(result.entries).toEqual([]);
    });

    it('does not misclassify a 500 response whose body mentions "403" as the known upstream issue', async () => {
      // Regression guard: the original naive `errMsg.includes('403')` check
      // would false-positive if an upstream 500 body happens to include "403"
      // (e.g. a help article reference). The anchored pattern only matches
      // errors prefixed with the literal status code.
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockRejectedValue(
        new Error('Apple Ads API error (500): see support article 403 for details')
      );

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('Failed to poll custom report');
      expect(result.error).not.toContain('upstream');
    });

    it('returns a shape-drift error when the completed payload has no row field', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: {
          state: 'COMPLETED',
          // No reportingDataResponse.row and no flat row — envelope drift.
          results: [],
        },
      });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain("missing 'row' field");
      expect(result.entries).toEqual([]);
    });

    it('returns an error when the row field is present but not an array', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: {
          state: 'COMPLETED',
          reportingDataResponse: { row: { unexpected: 'object' } as any },
        },
      });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toContain('not an array');
      expect(result.entries).toEqual([]);
    });
  });

  describe('alternative payload shapes', () => {
    it('accepts a flat top-level row array (without reportingDataResponse wrapper)', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: {
          state: 'COMPLETED',
          row: [
            {
              metadata: { searchTerm: 'meditation', campaignName: 'Brand' },
              total: { impressionShare: '0.50', rank: 1, searchPopularity: 70 },
            },
          ],
        },
      });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.error).toBeUndefined();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].keyword).toBe('meditation');
    });

    it('falls back to metadata.keyword when searchTerm is absent', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: {
          state: 'COMPLETED',
          reportingDataResponse: {
            row: [
              {
                metadata: { keyword: 'yoga nidra', campaignName: 'Category' },
                total: { impressionShare: '0.15', rank: 12, searchPopularity: 22 },
              },
            ],
          },
        },
      });

      const result = await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.entries[0].keyword).toBe('yoga nidra');
    });

    it('applies fallback defaults when metadata or total are missing', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get.mockResolvedValue({
        data: {
          state: 'COMPLETED',
          reportingDataResponse: {
            row: [{}], // no metadata, no total
          },
        },
      });

      const result = await getImpressionShare(
        client as any,
        '42',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: noSleep }
      );

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].keyword).toBe('');
      expect(result.entries[0].campaign).toBe('42');
      expect(result.entries[0].impressionShare).toBe('0');
      expect(result.entries[0].rank).toBe(0);
      expect(result.entries[0].searchPopularity).toBe(0);
    });
  });

  describe('pollIntervalMs clamp', () => {
    it('floors pollIntervalMs at the minimum even when 0 is passed', async () => {
      client.post.mockResolvedValue({ data: { id: 'r1' } });
      client.get
        .mockResolvedValueOnce({ data: { state: 'IN_PROGRESS' } })
        .mockResolvedValueOnce({
          data: { state: 'COMPLETED', reportingDataResponse: { row: [] } },
        });
      const sleepSpy = vi.fn(() => Promise.resolve());

      await getImpressionShare(
        client as any,
        '111',
        '2026-03-01',
        '2026-03-22',
        0,
        { sleep: sleepSpy, pollIntervalMs: 0 }
      );

      // pollIntervalMs: 0 should be clamped to >= 500 to avoid tight-looping.
      const sleepDurations = sleepSpy.mock.calls.map((call) => call[0] as number);
      expect(sleepDurations.every((ms) => ms >= 500)).toBe(true);
    });
  });
});
