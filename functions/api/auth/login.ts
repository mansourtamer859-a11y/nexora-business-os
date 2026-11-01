import {
  authError,
  createSession,
  getDatabase,
  isRateLimited,
  normalizeEmail,
  readJsonObject,
  requireSameOrigin,
  validatePassword,
  verifyPassword,
  type AuthEnvironment,
} from '../../_lib/session';
import { requireAccessGate } from '../../_lib/accessGate';

export async function onRequestPost({ request, env }: { request: Request; env: AuthEnvironment }): Promise<Response> {
  const gateError = await requireAccessGate(request, env);
  if (gateError) return gateError;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const input = await readJsonObject(request);
  if (input instanceof Response) return input;
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  if (!email || !password) return authError(401, 'Email or password is incorrect.');

  const database = getDatabase(env);
  if (database instanceof Response) return database;
  try {
    if (await isRateLimited(request, database)) return authError(429, 'Too many authentication attempts. Try again in 15 minutes.');
  } catch {
    return authError(503, 'Authentication is temporarily unavailable.');
  }
  let identity;
  try {
    identity = await verifyPassword(database, email, password);
  } catch {
    return authError(503, 'Authentication is temporarily unavailable.');
  }
  if (!identity) return authError(401, 'Email or password is incorrect.');
  return createSession(database, identity);
}
