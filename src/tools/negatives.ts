import { AppleAdsClient } from '../client.js';

export async function addNegativeKeywords(
  client: AppleAdsClient,
  level: 'campaign' | 'adgroup',
  campaignId: string,
  adGroupId: string | null,
  keywords: { text: string; matchType: 'EXACT' | 'BROAD' }[]
): Promise<{ added: any[]; text: string }> {
  if (keywords.length === 0) {
    return { added: [], text: 'No negative keywords to add.' };
  }

  if (level === 'adgroup' && !adGroupId) {
    throw new Error('adGroupId is required for ad group-level negative keywords');
  }

  const path =
    level === 'campaign'
      ? `/campaigns/${campaignId}/negativekeywords/bulk`
      : `/campaigns/${campaignId}/adgroups/${adGroupId}/negativekeywords/bulk`;

  const body = keywords.map((kw) => ({
    text: kw.text,
    matchType: kw.matchType,
  }));

  const result = await client.post(path, body);
  const added = result.data || [];
  const errors = result.error?.errors || [];

  const levelLabel = level === 'campaign' ? 'campaign' : 'ad group';
  let text = `Added ${added.length} negative keyword(s) at ${levelLabel} level: ${added.map((k: any) => k.text).join(', ')}`;

  if (errors.length > 0) {
    const errorDetails = errors.map((e: any) =>
      `${e.field || 'unknown'}: ${e.messageCode || e.message || JSON.stringify(e)}`
    ).join('; ');
    text += `\nErrors (${errors.length}): ${errorDetails}`;
  }

  return { added, text };
}
