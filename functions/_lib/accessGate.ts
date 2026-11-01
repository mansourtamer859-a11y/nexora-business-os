import {
  authError,
  getDatabase,
  isRateLimited,
  type AuthEnvironment,
} from './session';

type AccessGateEnvironment = AuthEnvironment & {
  NEXORA_GATE_PASSCODE?: string;
  NEXORA_GATE_SIGNING_KEY?: string;
};

const gateCookieName = '__Host-nexora_gate';
const gateLifetimeSeconds = 60 * 60 * 12;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function readGateCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  return cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${gateCookieName}=`))
    ?.slice(gateCookieName.length + 1) ?? null;
}

function configured(environment: AccessGateEnvironment): boolean {
  return Boolean(environment.NEXORA_GATE_PASSCODE && environment.NEXORA_GATE_SIGNING_KEY
    && environment.NEXORA_GATE_SIGNING_KEY.length >= 32);
}

function jsonResponse(status: number, body: Record<string, unknown>, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'no-store');
  return Response.json(body, { status, headers: responseHeaders });
}

async function sign(message: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

async function validPasscode(candidate: string, expected: string): Promise<boolean> {
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(candidate)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(expected)),
  ]);
  const left = new Uint8Array(candidateHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function hasAccessGate(request: Request, environment: AccessGateEnvironment): Promise<boolean> {
  if (!configured(environment)) return false;
  const value = readGateCookie(request);
  if (!value) return false;
  const [expiresText, nonce, signatureText, ...extra] = value.split('.');
  if (extra.length || !/^\d{13}$/u.test(expiresText) || !/^[A-Za-z0-9_-]{32}$/u.test(nonce)) return false;
  const expiresAt = Number(expiresText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + gateLifetimeSeconds * 1000) return false;
  const receivedSignature = base64UrlToBytes(signatureText);
  if (!receivedSignature) return false;
  let expectedSignature: Uint8Array;
  try {
    expectedSignature = await sign(`${expiresText}.${nonce}`, environment.NEXORA_GATE_SIGNING_KEY!);
  } catch (error) {
    console.error('Could not verify the access gate cookie signature.', error);
    throw error;
  }
  if (receivedSignature.length !== expectedSignature.length) return false;
  let difference = 0;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    difference |= receivedSignature[index] ^ expectedSignature[index];
  }
  return difference === 0;
}

export async function requireAccessGate(
  request: Request,
  environment: AccessGateEnvironment,
): Promise<Response | null> {
  if (!configured(environment)) {
    console.error('NEXORA_GATE_PASSCODE or NEXORA_GATE_SIGNING_KEY is not configured.');
    return authError(503, 'The access gate is not configured for this deployment.');
  }
  try {
    return await hasAccessGate(request, environment)
      ? null
      : authError(403, 'Complete the access gate before continuing.');
  } catch {
    return authError(503, 'The access gate is temporarily unavailable.');
  }
}

export async function getAccessGateStatus(
  request: Request,
  environment: AccessGateEnvironment,
): Promise<Response> {
  if (!configured(environment)) {
    console.error('NEXORA_GATE_PASSCODE or NEXORA_GATE_SIGNING_KEY is not configured.');
    return jsonResponse(503, { error: 'The access gate is not configured for this deployment.' });
  }
  try {
    const verified = await hasAccessGate(request, environment);
    return jsonResponse(verified ? 200 : 401, { verified });
  } catch {
    return jsonResponse(503, { error: 'The access gate is temporarily unavailable.' });
  }
}

export async function verifyAccessPasscode(
  request: Request,
  environment: AccessGateEnvironment,
  candidate: unknown,
): Promise<Response> {
  if (!configured(environment)) {
    console.error('NEXORA_GATE_PASSCODE or NEXORA_GATE_SIGNING_KEY is not configured.');
    return authError(503, 'The access gate is not configured for this deployment.');
  }
  if (typeof candidate !== 'string' || candidate.length > 256) {
    return authError(401, 'The access passcode is incorrect.');
  }

  const database = getDatabase(environment);
  if (database instanceof Response) return database;
  try {
    if (await isRateLimited(request, database)) {
      return authError(429, 'Too many authentication attempts. Try again in 15 minutes.');
    }
  } catch (error) {
    console.error('Could not apply access gate rate limiting.', error);
    return authError(503, 'The access gate is temporarily unavailable.');
  }

  let matches: boolean;
  try {
    matches = await validPasscode(candidate, environment.NEXORA_GATE_PASSCODE!);
  } catch (error) {
    console.error('Could not verify access gate passcode.', error);
    return authError(503, 'The access gate is temporarily unavailable.');
  }
  if (!matches) return authError(401, 'The access passcode is incorrect.');

  try {
    const expiresAt = Date.now() + gateLifetimeSeconds * 1000;
    const nonce = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
    const expiresText = String(expiresAt);
    const signature = await sign(`${expiresText}.${nonce}`, environment.NEXORA_GATE_SIGNING_KEY!);
    const cookie = `${gateCookieName}=${expiresText}.${nonce}.${bytesToBase64Url(signature)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${gateLifetimeSeconds}`;
    return jsonResponse(200, { verified: true }, { 'Set-Cookie': cookie });
  } catch (error) {
    console.error('Could not sign the access gate session.', error);
    return authError(503, 'The access gate is temporarily unavailable.');
  }
}
