export type AuthIdentity = {
  id: string;
  email: string;
};

export type D1Statement = {
  bind(...values: (string | number)[]): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type D1Database = {
  prepare(query: string): D1Statement;
};

export type AuthEnvironment = {
  DB?: D1Database;
  NEXORA_GATE_PASSCODE?: string;
  NEXORA_GATE_SIGNING_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
};

type SessionRecord = {
  id: string;
  email: string;
};

type PasswordRecord = {
  id: string;
  email: string;
  password_salt: string | null;
  password_hash: string | null;
  password_iterations: number | null;
};

type OAuthStateRecord = {
  nonce: string;
  code_verifier: string;
  expires_at: number;
};

type GoogleIdClaims = {
  aud?: string;
  email?: string;
  email_verified?: boolean;
  exp?: number;
  iat?: number;
  iss?: string;
  nonce?: string;
  sub?: string;
};

type GoogleIdHeader = {
  alg?: string;
  kid?: string;
};

class GoogleVerificationUnavailable extends Error {}

const sessionCookieName = '__Host-nexora_session';
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;
const passwordIterations = 210_000;

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export function getDatabase(environment: AuthEnvironment): D1Database | Response {
  if (!environment.DB) {
    console.error('Cloudflare D1 binding DB is missing.');
    return jsonError(503, 'Authentication storage is not configured.');
  }
  return environment.DB;
}

export function authError(status: number, message: string): Response {
  return jsonError(status, message);
}

export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return jsonError(403, 'Cross-origin authentication requests are not allowed.');
  }
  return null;
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | Response> {
  const mediaType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return jsonError(415, 'Authentication requests must use application/json.');
  }
  const contentLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return jsonError(413, 'Authentication request exceeds the allowed size.');
  }

  let value: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 16_384) {
      return jsonError(413, 'Authentication request exceeds the allowed size.');
    }
    value = JSON.parse(body) as unknown;
  } catch {
    return jsonError(400, 'Authentication request must contain valid JSON.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return jsonError(400, 'Authentication request must be a JSON object.');
  }
  return value as Record<string, unknown>;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', toArrayBuffer(new TextEncoder().encode(value))));
}

async function hashPassword(password: string, salt: Uint8Array, iterations = passwordIterations): Promise<Uint8Array> {
  return derivePasswordHash(password, salt, iterations);
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(password)), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: toArrayBuffer(salt),
    iterations,
  }, material, 256));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return null;
  return email;
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) return null;
  return value;
}

export async function createAccount(
  database: D1Database,
  email: string,
  password: string,
): Promise<AuthIdentity | Response> {
  const id = crypto.randomUUID();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  let passwordHash: Uint8Array;
  try {
    passwordHash = await hashPassword(password, salt);
  } catch (error) {
    console.error('Could not derive the account password hash.', error);
    return jsonError(503, 'Account registration is temporarily unavailable.');
  }
  try {
    await database.prepare(
      'INSERT INTO auth_users (id, email, password_salt, password_hash, password_iterations, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(id, email, bytesToBase64Url(salt), bytesToBase64Url(passwordHash), passwordIterations, Date.now()).run();
    return { id, email };
  } catch (error) {
    if (error instanceof Error && /unique|constraint/iu.test(error.message)) {
      return jsonError(409, 'An account with this email already exists.');
    }
    console.error('Could not create the account record.', error);
    return jsonError(503, 'Account registration is temporarily unavailable.');
  }
}

export async function createGoogleAccount(
  database: D1Database,
  email: string,
  googleSubject: string,
): Promise<AuthIdentity | Response> {
  try {
    const linked = await database.prepare(
      'SELECT id, email, google_subject FROM auth_users WHERE google_subject = ?',
    ).bind(googleSubject).first<{ id: string; email: string; google_subject: string }>();
    if (linked) return { id: linked.id, email: linked.email };

    const matchingEmail = await database.prepare(
      'SELECT id, email, google_subject FROM auth_users WHERE email = ?',
    ).bind(email).first<{ id: string; email: string; google_subject: string | null }>();
    if (matchingEmail) {
      if (matchingEmail.google_subject) return jsonError(409, 'This email is already linked to another Google account.');
      await database.prepare('UPDATE auth_users SET google_subject = ? WHERE id = ? AND google_subject IS NULL')
        .bind(googleSubject, matchingEmail.id).run();
      return { id: matchingEmail.id, email: matchingEmail.email };
    }

    const id = crypto.randomUUID();
    await database.prepare(
      'INSERT INTO auth_users (id, email, google_subject, created_at) VALUES (?, ?, ?, ?)',
    ).bind(id, email, googleSubject, Date.now()).run();
    return { id, email };
  } catch (error) {
    console.error('Could not link the Google identity to an account.', error);
    return jsonError(503, 'Google sign-in is temporarily unavailable.');
  }
}

export async function createOAuthState(
  database: D1Database,
  state: string,
  nonce: string,
  codeVerifier: string,
): Promise<void> {
  const stateHash = bytesToBase64Url(await sha256(state));
  const now = Date.now();
  await database.prepare('DELETE FROM auth_oauth_states WHERE expires_at <= ?').bind(now).run();
  await database.prepare(
    'INSERT INTO auth_oauth_states (state_hash, nonce, code_verifier, expires_at) VALUES (?, ?, ?, ?)',
  ).bind(stateHash, nonce, codeVerifier, now + 10 * 60 * 1000).run();
}

export async function consumeOAuthState(database: D1Database, state: string): Promise<OAuthStateRecord | null> {
  const stateHash = bytesToBase64Url(await sha256(state));
  const stored = await database.prepare(
    'SELECT nonce, code_verifier, expires_at FROM auth_oauth_states WHERE state_hash = ? AND expires_at > ?',
  ).bind(stateHash, Date.now()).first<OAuthStateRecord>();
  await database.prepare('DELETE FROM auth_oauth_states WHERE state_hash = ?').bind(stateHash).run();
  return stored;
}

function decodeBase64UrlJson<T>(value: string): T {
  const decoded = new TextDecoder().decode(base64UrlToBytes(value));
  return JSON.parse(decoded) as T;
}

export async function verifyGoogleIdToken(
  token: string,
  clientId: string,
  expectedNonce: string,
): Promise<{ subject: string; email: string } | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  let header: GoogleIdHeader;
  let claims: GoogleIdClaims;
  try {
    header = decodeBase64UrlJson<GoogleIdHeader>(parts[0]);
    claims = decodeBase64UrlJson<GoogleIdClaims>(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== 'RS256' || !header.kid
    || (claims.iss !== 'https://accounts.google.com' && claims.iss !== 'accounts.google.com')
    || claims.aud !== clientId || claims.nonce !== expectedNonce
    || typeof claims.sub !== 'string' || claims.sub.length > 255
    || !normalizeEmail(claims.email) || claims.email_verified !== true
    || typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)
    || typeof claims.iat !== 'number' || claims.iat > Math.floor(Date.now() / 1000) + 60) {
    return null;
  }
  try {
    const keysResponse = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (!keysResponse.ok) throw new GoogleVerificationUnavailable('Google signing keys could not be loaded.');
    const keySet: unknown = await keysResponse.json();
    if (typeof keySet !== 'object' || keySet === null || !('keys' in keySet) || !Array.isArray(keySet.keys)) {
      throw new GoogleVerificationUnavailable('Google signing key response is invalid.');
    }
    const jwk = keySet.keys.find((key): key is JsonWebKey & { kid: string } =>
      typeof key === 'object' && key !== null && 'kid' in key && key.kid === header.kid);
    if (!jwk) throw new GoogleVerificationUnavailable('Google signing key was not found.');
    const cryptoKey = await crypto.subtle.importKey('jwk', jwk, {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    }, false, ['verify']);
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      toArrayBuffer(base64UrlToBytes(parts[2])),
      toArrayBuffer(new TextEncoder().encode(`${parts[0]}.${parts[1]}`)),
    );
    if (!valid) return null;
    return { subject: claims.sub, email: normalizeEmail(claims.email) as string };
  } catch (error) {
    if (error instanceof GoogleVerificationUnavailable) throw error;
    console.error('Could not validate the Google identity token.', error);
    throw new GoogleVerificationUnavailable('Google identity validation is temporarily unavailable.');
  }
}

export async function verifyPassword(
  database: D1Database,
  email: string,
  password: string,
): Promise<AuthIdentity | null> {
  let account: PasswordRecord | null;
  try {
    account = await database.prepare(
      'SELECT id, email, password_salt, password_hash, password_iterations FROM auth_users WHERE email = ?',
    ).bind(email).first<PasswordRecord>();
  } catch (error) {
    console.error('Could not read the account record.', error);
    throw new Error('Authentication storage is temporarily unavailable.', { cause: error });
  }

  const salt = account?.password_salt ? base64UrlToBytes(account.password_salt) : new Uint8Array(16);
  const expected = account?.password_hash ? base64UrlToBytes(account.password_hash) : new Uint8Array(32);
  const iterations = account?.password_iterations;
  if (account && account.password_hash && (typeof iterations !== 'number' || !Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000)) {
    console.error('Stored account password iteration count is invalid.');
    return null;
  }
  const actual = await hashPassword(password, salt, iterations ?? passwordIterations);
  if (!account || !equalBytes(actual, expected)) return null;
  return { id: account.id, email: account.email };
}

export async function createSession(database: D1Database, identity: AuthIdentity): Promise<Response> {
  let token: string;
  let tokenHash: string;
  try {
    token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    tokenHash = bytesToBase64Url(await sha256(token));
  } catch (error) {
    console.error('Could not generate the secure session identifier.', error);
    return jsonError(503, 'A secure session could not be created.');
  }
  const expiresAt = Date.now() + sessionLifetimeSeconds * 1000;
  try {
    await database.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').bind(Date.now()).run();
    await database.prepare(
      'INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    ).bind(tokenHash, identity.id, expiresAt, Date.now()).run();
  } catch (error) {
    console.error('Could not create the session record.', error);
    return jsonError(503, 'A secure session could not be created.');
  }
  return Response.json({ email: identity.email }, {
    headers: {
      'Cache-Control': 'no-store',
      'Set-Cookie': `${sessionCookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}`,
    },
  });
}

function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const cookie = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));
  const token = cookie?.slice(sessionCookieName.length + 1);
  return token && /^[A-Za-z0-9_-]{43}$/u.test(token) ? token : null;
}

export async function getSessionIdentity(
  request: Request,
  environment: AuthEnvironment,
): Promise<AuthIdentity | null | Response> {
  const token = readSessionToken(request);
  if (!token) return null;
  const database = getDatabase(environment);
  if (database instanceof Response) return database;
  try {
    const tokenHash = bytesToBase64Url(await sha256(token));
    const identity = await database.prepare(
      'SELECT auth_users.id, auth_users.email FROM auth_sessions JOIN auth_users ON auth_users.id = auth_sessions.user_id WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?',
    ).bind(tokenHash, Date.now()).first<SessionRecord>();
    return identity ? { id: identity.id, email: identity.email } : null;
  } catch (error) {
    console.error('Could not verify the session record.', error);
    return jsonError(503, 'Session verification is temporarily unavailable.');
  }
}

export async function deleteSession(request: Request, environment: AuthEnvironment): Promise<Response> {
  const token = readSessionToken(request);
  const database = getDatabase(environment);
  if (database instanceof Response) return database;
  if (token) {
    try {
      const tokenHash = bytesToBase64Url(await sha256(token));
      await database.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(tokenHash).run();
    } catch (error) {
      console.error('Could not revoke the session record.', error);
      return jsonError(503, 'The session could not be revoked.');
    }
  }
  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Set-Cookie': `${sessionCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  });
}

export function unauthorized(): Response {
  return jsonError(401, 'Sign in is required.');
}

export async function isRateLimited(request: Request, database: D1Database): Promise<boolean> {
  const address = request.headers.get('CF-Connecting-IP') ?? 'unknown-client';
  const now = Date.now();
  const windowStartedAt = now - (15 * 60 * 1000);
  try {
    const keyHash = bytesToBase64Url(await sha256(address));
    await database.prepare('DELETE FROM auth_rate_limits WHERE window_started_at <= ?').bind(now - 86_400_000).run();
    const result = await database.prepare(
      'INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts) VALUES (?, ?, 1) ON CONFLICT(key_hash) DO UPDATE SET attempts = CASE WHEN auth_rate_limits.window_started_at <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END, window_started_at = CASE WHEN auth_rate_limits.window_started_at <= ? THEN ? ELSE auth_rate_limits.window_started_at END RETURNING attempts',
    ).bind(keyHash, now, windowStartedAt, windowStartedAt, now).first<{ attempts: number }>();
    return !result || result.attempts > 10;
  } catch (error) {
    console.error('Could not update the authentication rate-limit record.', error);
    throw new Error('Authentication is temporarily unavailable.', { cause: error });
  }
}
