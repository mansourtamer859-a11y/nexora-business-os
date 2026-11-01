import {
  consumeOAuthState,
  createGoogleAccount,
  createSession,
  getDatabase,
  verifyGoogleIdToken,
  type AuthEnvironment,
} from '../../../_lib/session';

function failureRedirect(request: Request, reason: string): Response {
  const destination = new URL('/', request.url);
  destination.searchParams.set('auth_error', reason);
  return Response.redirect(destination, 303);
}
function redirectWithCookie(request: Request, cookie: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      'Location': new URL('/', request.url).toString(),
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie,
    },
  });
}

export async function onRequestGet({ request, env }: { request: Request; env: AuthEnvironment }): Promise<Response> {
  const parameters = new URL(request.url).searchParams;
  const code = parameters.get('code');
  const state = parameters.get('state');
  if (parameters.has('error') || !code || !state || code.length > 4096 || state.length > 256) {
    return failureRedirect(request, 'google_cancelled');
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return failureRedirect(request, 'google_not_configured');
  }

  const database = getDatabase(env);
  if (database instanceof Response) return failureRedirect(request, 'service_unavailable');
  let savedState;
  try {
    savedState = await consumeOAuthState(database, state);
  } catch (error) {
    console.error('Could not consume Google OAuth state.', error);
    return failureRedirect(request, 'service_unavailable');
  }
  if (!savedState) return failureRedirect(request, 'google_invalid_state');

  const redirectUri = new URL('/api/auth/google/callback', request.url).toString();
  let tokenResponse: Response;
  try {
    tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: savedState.code_verifier,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    console.error('Google token exchange failed.', error);
    return failureRedirect(request, 'google_unavailable');
  }
  if (!tokenResponse.ok || !tokenResponse.headers.get('content-type')?.includes('application/json')) {
    console.error('Google token endpoint returned an unexpected response.', tokenResponse.status);
    return failureRedirect(request, 'google_unavailable');
  }

  let tokenBody: unknown;
  try {
    tokenBody = await tokenResponse.json();
  } catch (error) {
    console.error('Google token endpoint returned invalid JSON.', error);
    return failureRedirect(request, 'google_unavailable');
  }
  if (typeof tokenBody !== 'object' || tokenBody === null || !('id_token' in tokenBody)
    || typeof tokenBody.id_token !== 'string' || tokenBody.id_token.length > 16_384) {
    return failureRedirect(request, 'google_invalid_identity');
  }

  let googleIdentity;
  try {
    googleIdentity = await verifyGoogleIdToken(tokenBody.id_token, env.GOOGLE_CLIENT_ID, savedState.nonce);
  } catch (error) {
    console.error('Google identity verification failed.', error);
    return failureRedirect(request, 'google_unavailable');
  }
  if (!googleIdentity) return failureRedirect(request, 'google_invalid_identity');

  const identity = await createGoogleAccount(database, googleIdentity.email, googleIdentity.subject);
  if (identity instanceof Response) return failureRedirect(request, 'google_account_error');
  const session = await createSession(database, identity);
  if (!session.ok) return failureRedirect(request, 'service_unavailable');
  const cookie = session.headers.get('Set-Cookie');
  if (!cookie) return failureRedirect(request, 'service_unavailable');
  return redirectWithCookie(request, cookie);
}
