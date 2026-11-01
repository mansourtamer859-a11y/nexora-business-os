import {
  authError,
  createAccount,
  createSession,
  getDatabase,
  isRateLimited,
  normalizeEmail,
  readJsonObject,
  requireSameOrigin,
  validatePassword,
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
  if (!email) return authError(400, 'Enter a valid email address.');
  if (!password) return authError(400, 'Password must be between 12 and 128 characters.');

  const database = getDatabase(env);
  if (database instanceof Response) return database;
  try {
    if (await isRateLimited(request, database)) return authError(429, 'Too many authentication attempts. Try again in 15 minutes.');
  } catch {
    return authError(503, 'Authentication is temporarily unavailable.');
  }
  const identity = await createAccount(database, email, password);
  if (identity instanceof Response) return identity;
  return createSession(database, identity);
}
