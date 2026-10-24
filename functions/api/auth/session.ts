import { verifyAccessRequest } from '../../_lib/access';

type Environment = {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
};

export async function onRequestGet({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const result = await verifyAccessRequest(request, env);
  if (result.response) return result.response;

  return Response.json({ email: result.identity.email }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
