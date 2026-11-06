import {
  deleteSession,
  requireSameOrigin,
  type AuthEnvironment,
} from '../../_lib/session';

export async function onRequestPost({ request, env }: { request: Request; env: AuthEnvironment }): Promise<Response> {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  return deleteSession(request, env);
}
