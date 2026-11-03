/* eslint-disable */
// @ts-nocheck

export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context;
  return new Response(JSON.stringify({ initialized: true, check: !!env }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    const input = await request.json();
    
    if (input && (input.passcode === "117007" || input.passcode === 117007)) {
      return new Response(JSON.stringify({ success: true, authenticated: true }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Set-Cookie": "nexora_session=authenticated; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400"
        },
      });
    }

    return new Response(JSON.stringify({ error: "رمز المرور المدخل غير صحيح" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: "بوابة الوصول واجهت خطأ داخلي" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
