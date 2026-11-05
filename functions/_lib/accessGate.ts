/* eslint-disable */
// @ts-nocheck

import { authError } from './session';

const gateCookieName = '__Host-nexora_gate';

export async function hasAccessGate(request: Request, environment: any): Promise<boolean> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  return cookieHeader.includes(`${gateCookieName}=true`);
}

export async function requireAccessGate(request: Request, environment: any): Promise<Response | null> {
  const permit = await hasAccessGate(request, environment);
  return permit ? null : authError(403, 'Complete the access gate before continuing.');
}

export async function getAccessGateStatus(request: Request, environment: any): Promise<Response> {
  const verified = await hasAccessGate(request, environment);
  return new Response(JSON.stringify({ verified }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function verifyAccessPasscode(request: Request, environment: any, candidate: unknown): Promise<Response> {
  const cleanCandidate = typeof candidate === 'string' ? candidate.trim() : '';
  
  if (cleanCandidate === "117007#" || cleanCandidate === "117007") {
    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${gateCookieName}=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`
      }
    });
  }
  
  return authError(401, 'The access passcode is incorrect.');
}
