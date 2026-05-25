import { SignJWT, importPKCS8 } from 'jose';

export interface AppleAdsAuthConfig {
  teamId: string;
  clientId: string;
  keyId: string;
  privateKeyPem: string;
}

const TOKEN_ENDPOINT = 'https://appleid.apple.com/auth/oauth2/token';
const AUDIENCE = 'https://appleid.apple.com';
const TOKEN_LIFETIME_SECONDS = 3600;
// Refresh 60s before expiry to avoid edge-case failures
const REFRESH_BUFFER_SECONDS = 60;

export class AppleAdsAuth {
  private config: AppleAdsAuthConfig;
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: AppleAdsAuthConfig) {
    this.config = config;
  }

  async generateClientSecret(): Promise<string> {
    const privateKey = await importPKCS8(this.config.privateKeyPem, 'ES256');
    const now = Math.floor(Date.now() / 1000);

    return new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.config.keyId, typ: 'JWT' })
      .setIssuer(this.config.teamId)
      .setSubject(this.config.clientId)
      .setAudience(AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + TOKEN_LIFETIME_SECONDS)
      .sign(privateKey);
  }

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const clientSecret = await this.generateClientSecret();

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: clientSecret,
      scope: 'searchadsorg',
    });

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Apple Ads auth failed (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    this.cachedToken = data.access_token;
    this.tokenExpiresAt =
      Date.now() + (data.expires_in - REFRESH_BUFFER_SECONDS) * 1000;

    return this.cachedToken!;
  }

  /** Test helper: force token expiry for testing refresh behavior */
  _forceExpiry(): void {
    this.tokenExpiresAt = 0;
  }
}
