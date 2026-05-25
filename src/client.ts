export interface RateLimitInfo {
  remaining: number | null;
  limit: number | null;
}

export interface AuthProvider {
  getAccessToken(): Promise<string>;
}

interface PaginationParams {
  limit?: number;
  offset?: number;
}

const BASE_URL = 'https://api.searchads.apple.com/api/v5';
const MAX_RETRIES = 1;

export class AppleAdsClient {
  private auth: AuthProvider;
  private orgId: string;
  private lastRateLimit: RateLimitInfo = { remaining: null, limit: null };

  constructor(auth: AuthProvider, orgId: string = '') {
    this.auth = auth;
    this.orgId = orgId;
  }

  async get(path: string, pagination?: PaginationParams): Promise<any> {
    let url = `${BASE_URL}${path}`;
    if (pagination) {
      const params = new URLSearchParams();
      if (pagination.limit !== undefined) params.set('limit', String(pagination.limit));
      if (pagination.offset !== undefined) params.set('offset', String(pagination.offset));
      url += `?${params.toString()}`;
    }
    return this.request(url, { method: 'GET' });
  }

  async post(path: string, body: any): Promise<any> {
    return this.request(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
  }

  async put(path: string, body: any): Promise<any> {
    return this.request(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
  }

  parseRateLimit(headerValue: string | null): RateLimitInfo {
    if (!headerValue) {
      return { remaining: null, limit: null };
    }

    let remaining: number | null = null;
    let limit: number | null = null;

    const parts = headerValue.split(';').map((s) => s.trim());
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'user-hour-rem') remaining = parseInt(value, 10);
      if (key === 'user-hour-limit') limit = parseInt(value, 10);
    }

    return { remaining, limit };
  }

  getRateLimit(): RateLimitInfo {
    return this.lastRateLimit;
  }

  private async request(url: string, init: RequestInit, retryCount = 0): Promise<any> {
    const token = await this.auth.getAccessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...(this.orgId ? { 'X-AP-Context': `orgId=${this.orgId}` } : {}),
      ...(init.headers as Record<string, string> || {}),
    };

    const response = await fetch(url, { ...init, headers });

    // Parse rate limit from response
    const rateLimitHeader =
      response.headers instanceof Map
        ? response.headers.get('x-rate-limit')
        : response.headers?.get?.('x-rate-limit') ?? null;
    this.lastRateLimit = this.parseRateLimit(rateLimitHeader);

    if (response.ok) {
      return response.json();
    }

    const errorText = await response.text();

    // Rate limit
    if (response.status === 429) {
      throw new Error(
        `Apple Ads API rate limit exceeded (remaining: ${this.lastRateLimit.remaining})`
      );
    }

    // Server error — retry once
    if (response.status >= 500 && retryCount < MAX_RETRIES) {
      return this.request(url, init, retryCount + 1);
    }

    throw new Error(
      `Apple Ads API error (${response.status}): ${errorText}`
    );
  }
}
