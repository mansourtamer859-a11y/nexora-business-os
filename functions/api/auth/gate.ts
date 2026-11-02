import { hasAccessGate } from "../../_lib/accessGate";

export async function onRequestGet({ request, env }: { request: Request; env: any }): Promise<Response> {
  // فحص أولي إذا كانت البوابة مهيأة ومتاحة
  try {
    return new Response(JSON.stringify({ initialized: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Gateway configuration error" }), { status: 500 });
  }
}

export async function onRequestPost({ request, env }: { request: Request; env: any }): Promise<Response> {
  try {
    // قراءة البيانات المرسلة من فورم تسجيل الدخول بالمتصفح
    const input = await request.json() as { passcode?: string };
    
    // مطابقة مباشرة بين الرمز المدخل والرمز السري المخزن في wrangler.toml
    if (input && input.passcode === env.NEXORA_GATE_PASSCODE) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
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

