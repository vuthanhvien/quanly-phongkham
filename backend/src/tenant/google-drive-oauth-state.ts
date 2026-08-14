import { randomBytes } from 'crypto';

const STATE_PREFIX = 'gd1.';

export type GoogleDriveOAuthState = {
  domain: string;
  nonce: string;
};

/**
 * Google returns OAuth state unchanged. Keeping the tenant domain in it lets
 * the shared API select the tenant database before the callback controller is
 * reached. The nonce remains the CSRF proof and is verified from that DB.
 */
export function createGoogleDriveOAuthState(domain: string) {
  return `${STATE_PREFIX}${Buffer.from(JSON.stringify({ domain, nonce: randomBytes(32).toString('hex') })).toString('base64url')}`;
}

export function parseGoogleDriveOAuthState(value?: string): GoogleDriveOAuthState | undefined {
  if (!value?.startsWith(STATE_PREFIX)) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value.slice(STATE_PREFIX.length), 'base64url').toString('utf8')) as Partial<GoogleDriveOAuthState>;
    if (!parsed.domain || !parsed.nonce || !/^[a-z0-9.-]+(?::\d+)?$/i.test(parsed.domain)) return undefined;
    return { domain: parsed.domain.toLowerCase(), nonce: parsed.nonce };
  } catch {
    return undefined;
  }
}
