export type AccessIdentity = {
  subject: string;
  email: string;
};

type AccessEnvironment = {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
};

type JsonWebKeySet = {
  keys: (JsonWebKey & { kid?: string; alg?: string; use?: string })[];
};

type AccessClaims = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  nbf?: number;
  sub?: string;
};

type AccessVerification =
  | { identity: AccessIdentity; response?: never }
  | { identity?: never; response: Response };

class VerificationUnavailable extends Error {}

const jwksCache = new Map<string, { expiresAt: number; value: JsonWebKeySet }>();
const maxTokenLength = 16_384;
const maxClockSkewSeconds = 60;

function jsonResponse(status: number, message: string): Response {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url value');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function decodeJsonPart<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(part))) as T;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function getIssuer(teamDomain: string | undefined): string {
  if (!teamDomain || teamDomain.length > 253
    || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(teamDomain)
    || teamDomain.includes('..')) {
    throw new VerificationUnavailable('Cloudflare Access team domain is not configured correctly.');
  }

  return `https://${teamDomain.toLowerCase()}`;
}

function getAudience(audience: string | undefined): string {
  if (!audience || audience.length > 512 || /[\s,]/.test(audience)) {
    throw new VerificationUnavailable('Cloudflare Access application audience is not configured correctly.');
  }
  return audience;
}

async function loadJwks(issuer: string, forceRefresh = false): Promise<JsonWebKeySet> {
  const cached = jwksCache.get(issuer);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.value;

  const certsUrl = new URL('/cdn-cgi/access/certs', issuer);
  let response: Response;
  try {
    response = await fetch(certsUrl, { redirect: 'error', signal: AbortSignal.timeout(5000) });
  } catch {
    throw new VerificationUnavailable('Cloudflare Access signing keys could not be reached.');
  }

  if (!response.ok || response.url !== certsUrl.href) {
    throw new VerificationUnavailable('Cloudflare Access signing keys could not be loaded.');
  }
  const contentLength = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(contentLength) && contentLength > 65_536) {
    throw new VerificationUnavailable('Cloudflare Access signing keys response is too large.');
  }

  let value: JsonWebKeySet;
  try {
    const bodyText = await response.text();
    if (new TextEncoder().encode(bodyText).byteLength > 65_536) throw new Error('JWKS is too large');
    const body: unknown = JSON.parse(bodyText) as unknown;
    if (typeof body !== 'object' || body === null || !Array.isArray((body as { keys?: unknown }).keys)) {
      throw new Error('Invalid JWKS');
    }
    const keys = (body as { keys: unknown[] }).keys;
    if (keys.length === 0 || keys.length > 50 || keys.some((key) => typeof key !== 'object' || key === null)) {
      throw new Error('Invalid JWKS keys');
    }
    value = { keys: keys as JsonWebKeySet['keys'] };
  } catch {
    throw new VerificationUnavailable('Cloudflare Access returned invalid signing keys.');
  }

  jwksCache.set(issuer, { expiresAt: Date.now() + 5 * 60_000, value });
  return value;
}

function validClaims(claims: AccessClaims, issuer: string, audience: string): claims is AccessClaims & {
  aud: string | string[];
  email: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
} {
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];

  return claims.iss === issuer
    && audiences.includes(audience)
    && typeof claims.sub === 'string' && claims.sub.length > 0 && claims.sub.length <= 512
    && typeof claims.email === 'string' && claims.email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)
    && typeof claims.exp === 'number' && Number.isSafeInteger(claims.exp) && claims.exp > now
    && typeof claims.iat === 'number' && Number.isSafeInteger(claims.iat)
    && claims.iat <= now + maxClockSkewSeconds
    && (claims.nbf === undefined
      || (typeof claims.nbf === 'number' && Number.isSafeInteger(claims.nbf) && claims.nbf <= now));
}

async function verifySignature(tokenParts: string[], issuer: string): Promise<boolean> {
  const [encodedHeader, encodedClaims, encodedSignature] = tokenParts;
  const header = decodeJsonPart<{ alg?: string; kid?: string; typ?: string }>(encodedHeader);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 256) return false;
  if (header.typ !== undefined && header.typ !== 'JWT') return false;

  for (const forceRefresh of [false, true]) {
    const jwks = await loadJwks(issuer, forceRefresh);
    const key = jwks.keys.find((candidate) =>
      candidate.kid === header.kid
      && candidate.kty === 'RSA'
      && (candidate.alg === undefined || candidate.alg === 'RS256')
      && (candidate.use === undefined || candidate.use === 'sig'),
    );
    if (!key) continue;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      toArrayBuffer(decodeBase64Url(encodedSignature)),
      toArrayBuffer(new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`)),
    );
  }

  return false;
}

export async function verifyAccessRequest(
  request: Request,
  environment: AccessEnvironment,
): Promise<AccessVerification> {
  let issuer: string;
  let audience: string;
  try {
    issuer = getIssuer(environment.CF_ACCESS_TEAM_DOMAIN);
    audience = getAudience(environment.CF_ACCESS_AUD);
  } catch (error) {
    console.error('Cloudflare Access configuration error.', error);
    return { response: jsonResponse(503, 'Identity verification is not configured.') };
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > maxTokenLength) {
    return { response: jsonResponse(401, 'An authenticated Cloudflare Access session is required.') };
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !part)) {
      return { response: jsonResponse(401, 'The Cloudflare Access session is invalid.') };
    }

    const claims = decodeJsonPart<AccessClaims>(parts[1]);
    if (typeof claims !== 'object' || claims === null || !validClaims(claims, issuer, audience)) {
      return { response: jsonResponse(401, 'The Cloudflare Access session is invalid or expired.') };
    }
    if (!await verifySignature(parts, issuer)) {
      return { response: jsonResponse(401, 'The Cloudflare Access session signature is invalid.') };
    }

    return { identity: { subject: claims.sub, email: claims.email } };
  } catch (error) {
    if (error instanceof VerificationUnavailable) {
      console.error('Cloudflare Access verification unavailable.', error);
      return { response: jsonResponse(503, 'Identity verification is temporarily unavailable.') };
    }
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Cloudflare Access signing key request timed out.', error);
      return { response: jsonResponse(503, 'Identity verification is temporarily unavailable.') };
    }
    return { response: jsonResponse(401, 'The Cloudflare Access session is invalid.') };
  }
}
