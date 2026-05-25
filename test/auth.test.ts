import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppleAdsAuth, type AppleAdsAuthConfig } from '../src/auth.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('AppleAdsAuth', () => {
  const config: AppleAdsAuthConfig = {
    teamId: 'TEAM123',
    clientId: 'CLIENT456',
    keyId: 'KEY789',
    // ES256 PKCS#8 test private key (not a real credential — generated for tests only)
    privateKeyPem: `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQga14kXOrWqvKgf4Ib
D+utPlCy5EqVqkj3dd9LvlxIrS6hRANCAARkcEjpGVPKvA4k/Q09S09DQmHuM86D
8AKe0yKImzgh+CCYa7Bv8ZhJ+2w9iATw0gN2mAaPrWXE0xKtj6eYwKBA
-----END PRIVATE KEY-----`,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates instance with valid config', () => {
    const auth = new AppleAdsAuth(config);
    expect(auth).toBeDefined();
  });

  it('generates a JWT client secret', async () => {
    const auth = new AppleAdsAuth(config);
    const secret = await auth.generateClientSecret();
    expect(secret).toBeTruthy();
    expect(typeof secret).toBe('string');
    // JWT has 3 parts separated by dots
    const parts = secret.split('.');
    expect(parts).toHaveLength(3);
  });

  it('fetches access token from Apple', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });

    const auth = new AppleAdsAuth(config);
    const token = await auth.getAccessToken();
    expect(token).toBe('test_token_123');

    // Verify fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://appleid.apple.com/auth/oauth2/token');
    expect(options.method).toBe('POST');
  });

  it('caches token and reuses within expiry', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'cached_token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });

    const auth = new AppleAdsAuth(config);
    const token1 = await auth.getAccessToken();
    const token2 = await auth.getAccessToken();

    expect(token1).toBe('cached_token');
    expect(token2).toBe('cached_token');
    expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
  });

  it('refreshes token when expired', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'token_1',
          token_type: 'Bearer',
          expires_in: 0, // Expires immediately
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'token_2',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });

    const auth = new AppleAdsAuth(config);
    const token1 = await auth.getAccessToken();
    expect(token1).toBe('token_1');

    // Force expiry by advancing time
    auth._forceExpiry();

    const token2 = await auth.getAccessToken();
    expect(token2).toBe('token_2');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on auth failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'invalid_client',
    });

    const auth = new AppleAdsAuth(config);
    await expect(auth.getAccessToken()).rejects.toThrow('Apple Ads auth failed');
  });

  it('includes correct grant_type and scope in token request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });

    const auth = new AppleAdsAuth(config);
    await auth.getAccessToken();

    const [, options] = mockFetch.mock.calls[0];
    const body = new URLSearchParams(options.body);
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('scope')).toBe('searchadsorg');
  });
});
