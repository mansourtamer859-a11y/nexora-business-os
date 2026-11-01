import {
  deleteSession,
  getSessionIdentity,
  requireSameOrigin,
  unauthorized,
  type AuthEnvironment,
} from '../../_lib/session';
import { requireAccessGate } from '../../_lib/accessGate';

export async function onRequestGet({ request, env }: { request: Request; env: AuthEnvironment }): Promise<Response> {
  const gateError = await requireAccessGate(request, env);
  if (gateError) return gateError;
  const identity = await getSessionIdentity(request, env);
  if (identity instanceof Response) return identity;
  if (!identity) return unauthorized();
  return Response.json({ email: identity.email }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestDelete({ request, env }: { request: Request; env: AuthEnvironment }): Promise<Response> {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  return deleteSession(request, env);
}
