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
    // التحقق الآمن والمباشر باستخدام الدالة المستقرة التي قمنا بإصلاحها وتأمينها
    const hasAccess = await hasAccessGate(request, env);
    
    if (hasAccess) {
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
    return new Response(JSON.stringify({ error: "بوابة الوصول واجهت خطأ داخلي غير متوقع" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
