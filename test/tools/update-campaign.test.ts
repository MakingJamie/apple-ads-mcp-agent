import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateCampaign } from '../../src/tools/campaign-management.js';

describe('updateCampaign', () => {
  const mockClient = {
    put: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wraps fields in a campaign envelope', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Discovery_BR', status: 'ENABLED' },
    });

    await updateCampaign(mockClient as any, '12345', {
      dailyBudgetAmount: 10,
    });

    const [, body] = mockClient.put.mock.calls[0];
    expect(body).toHaveProperty('campaign');
    expect(body.campaign.dailyBudgetAmount).toEqual({ amount: '10.00', currency: 'USD' });
  });

  it('updates daily budget amount', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Discovery_BR', status: 'ENABLED' },
    });

    const result = await updateCampaign(mockClient as any, '12345', {
      dailyBudgetAmount: 10,
    });

    expect(result.campaign.id).toBe(12345);

    const [path, body] = mockClient.put.mock.calls[0];
    expect(path).toBe('/campaigns/12345');
    expect(body.campaign.dailyBudgetAmount).toEqual({ amount: '10.00', currency: 'USD' });
    expect(body.campaign.budgetAmount).toBeUndefined();
    expect(body.campaign.status).toBeUndefined();
    expect(body.campaign.name).toBeUndefined();
  });

  it('updates total budget amount', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Discovery_BR', status: 'ENABLED' },
    });

    const result = await updateCampaign(mockClient as any, '12345', {
      budgetAmount: 500,
    });

    const [path, body] = mockClient.put.mock.calls[0];
    expect(path).toBe('/campaigns/12345');
    expect(body.campaign.budgetAmount).toEqual({ amount: '500.00', currency: 'USD' });
    expect(body.campaign.dailyBudgetAmount).toBeUndefined();
    expect(result.text).toContain('total budget');
    expect(result.text).toContain('500.00');
  });

  it('updates campaign status', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Category_US', status: 'PAUSED' },
    });

    const result = await updateCampaign(mockClient as any, '12345', {
      status: 'PAUSED',
    });

    const [path, body] = mockClient.put.mock.calls[0];
    expect(path).toBe('/campaigns/12345');
    expect(body.campaign.status).toBe('PAUSED');
    expect(body.campaign.budgetAmount).toBeUndefined();
    expect(body.campaign.dailyBudgetAmount).toBeUndefined();
  });

  it('updates campaign name', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Discovery_BR_v2', status: 'ENABLED' },
    });

    const result = await updateCampaign(mockClient as any, '12345', {
      name: 'Discovery_BR_v2',
    });

    const [, body] = mockClient.put.mock.calls[0];
    expect(body.campaign.name).toBe('Discovery_BR_v2');
    expect(result.text).toContain('name to');
    expect(result.text).toContain('Discovery_BR_v2');
  });

  it('updates multiple fields at once', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 99, name: 'Discovery_BR', status: 'ENABLED' },
    });

    const result = await updateCampaign(mockClient as any, '99', {
      dailyBudgetAmount: 10,
      budgetAmount: 300,
      status: 'ENABLED',
    });

    const [path, body] = mockClient.put.mock.calls[0];
    expect(path).toBe('/campaigns/99');
    expect(body.campaign.dailyBudgetAmount).toEqual({ amount: '10.00', currency: 'USD' });
    expect(body.campaign.budgetAmount).toEqual({ amount: '300.00', currency: 'USD' });
    expect(body.campaign.status).toBe('ENABLED');
  });

  it('supports custom currency', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Category_US', status: 'ENABLED' },
    });

    await updateCampaign(mockClient as any, '12345', {
      dailyBudgetAmount: 15,
      currency: 'USD',
    });

    const [, body] = mockClient.put.mock.calls[0];
    expect(body.campaign.dailyBudgetAmount).toEqual({ amount: '15.00', currency: 'USD' });
  });

  it('defaults currency to USD when none is given', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Category_US', status: 'ENABLED' },
    });

    await updateCampaign(mockClient as any, '12345', {
      budgetAmount: 750,
    });

    const [, body] = mockClient.put.mock.calls[0];
    expect(body.campaign.budgetAmount.currency).toBe('USD');
  });

  it('includes human-readable text summary with changes', async () => {
    mockClient.put.mockResolvedValueOnce({
      data: { id: 12345, name: 'Discovery_BR', status: 'ENABLED' },
    });

    const result = await updateCampaign(mockClient as any, '12345', {
      dailyBudgetAmount: 10,
      status: 'ENABLED',
    });

    expect(result.text).toContain('12345');
    expect(result.text).toContain('daily budget');
    expect(result.text).toContain('10.00');
    expect(result.text).toContain('status');
    expect(result.text).toContain('ENABLED');
  });

  it('throws when no updatable fields are provided', async () => {
    await expect(
      updateCampaign(mockClient as any, '12345', {})
    ).rejects.toThrow('At least one field must be provided');

    expect(mockClient.put).not.toHaveBeenCalled();
  });

  it('does not include currency-only as an update', async () => {
    await expect(
      updateCampaign(mockClient as any, '12345', { currency: 'EUR' })
    ).rejects.toThrow('At least one field must be provided');

    expect(mockClient.put).not.toHaveBeenCalled();
  });

  it('propagates API errors to the caller', async () => {
    mockClient.put.mockRejectedValueOnce(new Error('Apple Ads API error (400): INVALID_FIELD'));

    await expect(
      updateCampaign(mockClient as any, '12345', { status: 'PAUSED' })
    ).rejects.toThrow('Apple Ads API error (400): INVALID_FIELD');
  });

  it('handles API response without data wrapper', async () => {
    mockClient.put.mockResolvedValueOnce({
      id: 12345,
      name: 'Category_US',
      status: 'PAUSED',
    });

    const result = await updateCampaign(mockClient as any, '12345', {
      status: 'PAUSED',
    });

    expect(result.campaign.id).toBe(12345);
  });
});
