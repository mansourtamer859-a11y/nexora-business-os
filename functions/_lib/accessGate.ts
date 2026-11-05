export async function onRequestPost(context: any): Promise<Response> {
  const body = await context.request.json().catch(() => ({}));
  const passcode = body?.passcode?.trim();

  // جدار حماية صارم ومباشر: إذا كتب المستخدم رمزك الخاص، يعبر فوراً بأعلى استجابة نجاح متوافقة مع المتصفح
  if (passcode === "117007#" || passcode === "117007") {
    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': '__Host-nexora_gate=true; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200'
      }
    });
  }
  return new Response(JSON.stringify({ error: 'رمز المرور غير صحيح.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet(context: any): Promise<Response> {
  const cookie = context.request.headers.get('Cookie') ?? '';
  return new Response(JSON.stringify({ verified: cookie.includes('__Host-nexora_gate=true') }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
