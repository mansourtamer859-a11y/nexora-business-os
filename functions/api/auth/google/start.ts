import {
  createOAuthState,
  getDatabase,
  type AuthEnvironment,
} from '../../../_lib/session';

const encodeBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

async function sha256(value: string): Promise<ArrayBuffer> {
  const bytes = new TextEncoder().encode(value);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return crypto.subtle.digest('SHA-256', buffer);
}
function failureRedirect(request: Request, reason: string): Response {
  const destination = new URL('/', request.url);
  destination.searchParams.set('auth_error', reason);
  return Response.redirect(destination, 303);
}

export async function onRequestGet({ request, env }: { request: Request; env: AuthEnvironment }): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID) return failureRedirect(request, 'google_not_configured');
  const database = getDatabase(env);
  if (database instanceof Response) return failureRedirect(request, 'service_unavailable');

  const state = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const nonce = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  try {
    await createOAuthState(database, state, nonce, verifier);
  } catch (error) {
    console.error('Could not persist Google OAuth state.', error);
    return failureRedirect(request, 'service_unavailable');
  }

  const challenge = encodeBase64Url(new Uint8Array(await sha256(verifier)));
  const redirectUri = new URL('/api/auth/google/callback', request.url).toString();
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return Response.redirect(authorization, 302);
}
