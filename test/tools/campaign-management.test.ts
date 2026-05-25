import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCampaign, createAdGroup } from '../../src/tools/campaign-management.js';

describe('createCampaign', () => {
  const mockClient = {
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a campaign with required fields', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 12345, name: 'Category_US', status: 'ENABLED' },
    });

    const result = await createCampaign(mockClient as any, {
      name: 'Category_US',
      budgetAmount: 750,
      dailyBudgetAmount: 25,
      countriesOrRegions: ['US'],
      adamId: '1234567890',
    });

    expect(result.campaign.id).toBe(12345);
    expect(result.text).toContain('Category_US');

    const [path, body] = mockClient.post.mock.calls[0];
    expect(path).toBe('/campaigns');
    expect(body.name).toBe('Category_US');
    expect(body.adamId).toBe('1234567890');
    expect(body.budgetAmount).toEqual({ amount: '750', currency: 'USD' });
    expect(body.dailyBudgetAmount).toEqual({ amount: '25', currency: 'USD' });
    expect(body.countriesOrRegions).toEqual(['US']);
    expect(body.supplySources).toEqual(['APPSTORE_SEARCH_RESULTS']);
    expect(body.status).toBe('PAUSED'); // Guardrail: default to PAUSED, never ENABLED
  });

  it('creates a campaign in PAUSED status', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 12346, name: 'Discovery_US', status: 'PAUSED' },
    });

    const result = await createCampaign(mockClient as any, {
      name: 'Discovery_US',
      budgetAmount: 300,
      dailyBudgetAmount: 8,
      countriesOrRegions: ['US'],
      adamId: '1234567890',
      status: 'PAUSED',
    });

    const [, body] = mockClient.post.mock.calls[0];
    expect(body.status).toBe('PAUSED');
  });

  it('supports custom currency', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 12347, name: 'Category_DE', status: 'ENABLED' },
    });

    await createCampaign(mockClient as any, {
      name: 'Category_DE',
      budgetAmount: 500,
      dailyBudgetAmount: 20,
      countriesOrRegions: ['DE'],
      adamId: '1234567890',
      currency: 'EUR',
    });

    const [, body] = mockClient.post.mock.calls[0];
    expect(body.budgetAmount.currency).toBe('EUR');
    expect(body.dailyBudgetAmount.currency).toBe('EUR');
  });

  it('includes text summary in response', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 99, name: 'Category_US', status: 'ENABLED' },
    });

    const result = await createCampaign(mockClient as any, {
      name: 'Category_US',
      budgetAmount: 750,
      dailyBudgetAmount: 25,
      countriesOrRegions: ['US'],
      adamId: '1234567890',
    });

    expect(result.text).toContain('99');
    expect(result.text).toContain('Category_US');
    expect(result.text).toContain('ENABLED');
  });
});

describe('createAdGroup', () => {
  const mockClient = {
    post: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an ad group with required fields', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 5678, name: 'Core Meditation' },
    });

    const result = await createAdGroup(mockClient as any, {
      campaignId: '12345',
      name: 'Core Meditation',
      matchType: 'Exact',
      defaultBid: 1.50,
    });

    expect(result.adGroup.id).toBe(5678);

    const [path, body] = mockClient.post.mock.calls[0];
    expect(path).toBe('/campaigns/12345/adgroups');
    expect(body.name).toBe('Core Meditation (Exact)');
    expect(body.defaultBidAmount).toEqual({ amount: '1.50', currency: 'USD' });
    expect(body.status).toBe('PAUSED'); // Guardrail: ad groups always created PAUSED
    expect(body.startTime).toBeDefined();
  });

  it('enables Search Match via automatedKeywordsOptIn', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 5679, name: 'Discovery' },
    });

    await createAdGroup(mockClient as any, {
      campaignId: '12345',
      name: 'Discovery',
      matchType: 'Broad and Search Match',
      defaultBid: 0.50,
      searchMatchEnabled: true,
    });

    const [, body] = mockClient.post.mock.calls[0];
    expect(body.automatedKeywordsOptIn).toBe(true);
  });

  it('defaults Search Match to false', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 5680, name: 'Exact Match Group' },
    });

    await createAdGroup(mockClient as any, {
      campaignId: '12345',
      name: 'Exact Match Group',
      matchType: 'Exact',
      defaultBid: 1.00,
    });

    const [, body] = mockClient.post.mock.calls[0];
    expect(body.automatedKeywordsOptIn).toBe(false);
  });

  it('supports CPA goal', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 5681, name: 'CPA Group' },
    });

    await createAdGroup(mockClient as any, {
      campaignId: '12345',
      name: 'CPA Group',
      matchType: 'Exact',
      defaultBid: 1.00,
      cpaGoal: 3.00,
    });

    const [, body] = mockClient.post.mock.calls[0];
    expect(body.cpaGoal).toEqual({ amount: '3.00', currency: 'USD' });
  });

  it('supports custom currency', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 5682, name: 'EU Group' },
    });

    await createAdGroup(mockClient as any, {
      campaignId: '12345',
      name: 'EU Group',
      matchType: 'Exact',
      defaultBid: 2.00,
      currency: 'EUR',
    });

    const [, body] = mockClient.post.mock.calls[0];
    expect(body.defaultBidAmount.currency).toBe('EUR');
  });

  it('includes text summary in response', async () => {
    mockClient.post.mockResolvedValueOnce({
      data: { id: 9999, name: 'Test Group' },
    });

    const result = await createAdGroup(mockClient as any, {
      campaignId: '12345',
      name: 'Test Group',
      matchType: 'Exact',
      defaultBid: 1.00,
    });

    expect(result.text).toContain('9999');
    expect(result.text).toContain('Test Group');
    expect(result.text).toContain('12345');
  });
});
