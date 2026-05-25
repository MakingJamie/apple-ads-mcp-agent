import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppleAdsClient, type RateLimitInfo } from '../src/client.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('AppleAdsClient', () => {
  const mockAuth = {
    getAccessToken: vi.fn().mockResolvedValue('test_token'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getAccessToken.mockResolvedValue('test_token');
  });

  it('creates instance with auth provider', () => {
    const client = new AppleAdsClient(mockAuth, 'ORG123');
    expect(client).toBeDefined();
  });

  it('makes GET request with correct base URL and auth header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-rate-limit', 'user-hour-rem=100']]),
      json: async () => ({ data: [] }),
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    await client.get('/campaigns');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.searchads.apple.com/api/v5/campaigns');
    expect(options.headers.Authorization).toBe('Bearer test_token');
  });

  it('sends X-AP-Context header with orgId on all requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-rate-limit', 'user-hour-rem=100']]),
      json: async () => ({ data: [] }),
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    await client.get('/campaigns');

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['X-AP-Context']).toBe('orgId=ORG123');
  });

  it('makes POST request with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-rate-limit', 'user-hour-rem=99']]),
      json: async () => ({ data: [] }),
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    const body = { startTime: '2026-03-01', endTime: '2026-03-22' };
    await client.post('/reports/campaigns', body);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(options.body)).toEqual(body);
  });

  it('makes PUT request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-rate-limit', 'user-hour-rem=98']]),
      json: async () => ({ data: {} }),
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    await client.put('/campaigns/123/adgroups/456/keywords/789', { bidAmount: { amount: '1.50' } });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('PUT');
  });

  it('parses X-Rate-Limit header', () => {
    const client = new AppleAdsClient(mockAuth, 'ORG123');
    const info = client.parseRateLimit('user-hour-rem=42; user-hour-limit=100');
    expect(info.remaining).toBe(42);
    expect(info.limit).toBe(100);
  });

  it('handles missing rate limit header gracefully', () => {
    const client = new AppleAdsClient(mockAuth, 'ORG123');
    const info = client.parseRateLimit(null);
    expect(info.remaining).toBeNull();
    expect(info.limit).toBeNull();
  });

  it('throws on 401 with descriptive error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Map(),
      text: async () => 'Unauthorized',
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    await expect(client.get('/campaigns')).rejects.toThrow('401');
  });

  it('throws on 429 rate limit with remaining info', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Map([['x-rate-limit', 'user-hour-rem=0']]),
      text: async () => 'Too Many Requests',
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    await expect(client.get('/campaigns')).rejects.toThrow('rate limit');
  });

  it('supports pagination with limit and offset', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Map([['x-rate-limit', 'user-hour-rem=97']]),
      json: async () => ({
        data: [{ id: 1 }, { id: 2 }],
        pagination: { totalResults: 50, startIndex: 0, itemsPerPage: 2 },
      }),
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    const result = await client.get('/campaigns', { limit: 2, offset: 0 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('limit=2');
    expect(url).toContain('offset=0');
  });

  it('retries once on 500 error', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Map(),
        text: async () => 'Internal Server Error',
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Map([['x-rate-limit', 'user-hour-rem=96']]),
        json: async () => ({ data: [] }),
      });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    const result = await client.get('/campaigns');
    expect(result.data).toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after retry exhaustion on persistent 500', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Map(),
      text: async () => 'Internal Server Error',
    });

    const client = new AppleAdsClient(mockAuth, 'ORG123');
    await expect(client.get('/campaigns')).rejects.toThrow('500');
  });
});
