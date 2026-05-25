import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addNegativeKeywords } from '../../src/tools/negatives.js';

function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    getRateLimit: vi.fn().mockReturnValue({ remaining: 100, limit: 100 }),
  };
}

describe('addNegativeKeywords', () => {
  let client: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    client = createMockClient();
  });

  it('adds campaign-level negative keywords', async () => {
    const keywords = [
      { text: 'free meditation', matchType: 'EXACT' as const },
      { text: 'cheap', matchType: 'BROAD' as const },
    ];

    client.post.mockResolvedValue({
      data: [
        { id: '5001', text: 'free meditation', matchType: 'EXACT', status: 'ACTIVE' },
        { id: '5002', text: 'cheap', matchType: 'BROAD', status: 'ACTIVE' },
      ],
    });

    const result = await addNegativeKeywords(
      client as any,
      'campaign',
      '111',
      null,
      keywords
    );

    expect(client.post).toHaveBeenCalledWith(
      '/campaigns/111/negativekeywords/bulk',
      [
        { text: 'free meditation', matchType: 'EXACT' },
        { text: 'cheap', matchType: 'BROAD' },
      ]
    );
    expect(result.added).toHaveLength(2);
    expect(result.text).toContain('free meditation');
    expect(result.text).toContain('campaign');
  });

  it('adds ad group-level negative keywords', async () => {
    const keywords = [
      { text: 'yoga', matchType: 'BROAD' as const },
    ];

    client.post.mockResolvedValue({
      data: [
        { id: '6001', text: 'yoga', matchType: 'BROAD', status: 'ACTIVE' },
      ],
    });

    const result = await addNegativeKeywords(
      client as any,
      'adgroup',
      '111',
      '222',
      keywords
    );

    expect(client.post).toHaveBeenCalledWith(
      '/campaigns/111/adgroups/222/negativekeywords/bulk',
      [{ text: 'yoga', matchType: 'BROAD' }]
    );
    expect(result.added).toHaveLength(1);
    expect(result.text).toContain('ad group');
  });

  it('handles empty keywords array', async () => {
    const result = await addNegativeKeywords(
      client as any,
      'campaign',
      '111',
      null,
      []
    );

    expect(result.added).toEqual([]);
    expect(client.post).not.toHaveBeenCalled();
  });

  it('requires adGroupId for adgroup level', async () => {
    const keywords = [{ text: 'test', matchType: 'EXACT' as const }];

    await expect(
      addNegativeKeywords(client as any, 'adgroup', '111', null, keywords)
    ).rejects.toThrow('adGroupId is required');
  });
});
