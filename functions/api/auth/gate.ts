import { verifyAccessPasscode, getAccessGateStatus } from '../../_lib/accessGate';

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const body = await context.request.json().catch(() => ({}));
    return await verifyAccessPasscode(context.request, context.env, body?.passcode);
  } catch (error) {
    return new Response(JSON.stringify({ verified: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function onRequestGet(context: any): Promise<Response> {
  try {
    return await getAccessGateStatus(context.request, context.env);
  } catch (error) {
    return new Response(JSON.stringify({ verified: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
