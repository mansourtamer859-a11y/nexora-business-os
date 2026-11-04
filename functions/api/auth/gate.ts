import {
  getAccessGateStatus,
  verifyAccessPasscode,
} from '../../_lib/accessGate';
import {
  readJsonObject,
  requireSameOrigin,
  type AuthEnvironment,
} from '../../_lib/session';

type Environment = AuthEnvironment & {
  NEXORA_GATE_PASSCODE?: string;
  NEXORA_GATE_SIGNING_KEY?: string;
};

export async function onRequestGet({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  return getAccessGateStatus(request, env);
}

export async function onRequestPost({ request, env }: { request: Request; env: Environment }): Promise<Response> {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const input = await readJsonObject(request);
  if (input instanceof Response) return input;
  if (Object.keys(input).length !== 1 || !Object.hasOwn(input, 'passcode')) {
    return Response.json({ error: 'Access gate request is invalid.' }, {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return verifyAccessPasscode(request, env, input.passcode);
}
