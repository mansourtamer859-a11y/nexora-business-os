/* eslint-disable */
// @ts-nocheck

// دالة GET للتحقق من جاهزية السيرفر وقراءة المتغيرات البيئية
export async function onRequestGet(context: any): Promise<Response> {
  const { env } = context;
  return new Response(JSON.stringify({ 
    initialized: true, 
    check: !!env,
    has_passcode: !!(env && env.NEXORA_GATE_PASSCODE)
  }), {
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
  });
}

// دالة POST الخارقة لمعالجة التحقق والتسجيل من المتصفح
export async function onRequestPost(context: any): Promise<Response> {
  try {
    const { request, env } = context;
    
    // 1. قراءة البيانات القادمة من المتصفح بشكل آمن
    let input: any = {};
    try {
      input = await request.json();
    } catch (e) {
      // إذا كان الطلب فارغاً أو ليس بصيغة JSON
      return new Response(JSON.stringify({ error: "طلب غير صالح، لم يتم إرسال بيانات." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. جلب رمز المرور المتوقع (من ملف wrangler.toml أو القيمة الافتراضية الثابتة)
    const expectedPasscode = (env && env.NEXORA_GATE_PASSCODE) ? String(env.NEXORA_GATE_PASSCODE).trim() : "117007";

    // 3. استخراج كافة القيم المرسلة من الواجهة الأمامية للتحقق منها مرئياً
    const receivedValues = input ? Object.values(input).map(val => String(val).trim()) : [];

    // 4. الفحص الذكي الشامل (الشرط الخارق)
    // ينجح الدخول إذا تطابق الرمز المحدد في السيرفر أو الرمز الاحتياطي مع أي قيمة مرسلة من المتصفح
    const isAuthorized = input && (
      String(input.passcode).trim() === expectedPasscode ||
      String(input.passcode).trim() === "117007" ||
      String(input.password).trim() === expectedPasscode ||
      String(input.password).trim() === "117007" ||
      String(input.code).trim() === expectedPasscode ||
      String(input.code).trim() === "117007" ||
      receivedValues.includes(expectedPasscode) ||
      receivedValues.includes("117007")
    );

    if (isAuthorized) {
      // إنشاء استجابة نجاح مجهزة بـ Cookie آمن يفهمه المتصفح ويثبت تسجيل الدخول
      return new Response(JSON.stringify({ success: true, authenticated: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          // كوكيز احترافي متوافق مع الحماية وسياسات المتصفحات الحديثة
          "Set-Cookie": "nexora_session=authenticated; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400"
        },
      });
    }

    // 5. في حال فشل المطابقة، يعيد السيرفر تفاصيل ذكية للمطور لمعرفة الخلل في المتصفح
    return new Response(JSON.stringify({ 
      error: "رمز المرور المدخل غير صحيح.",
      debug: {
        received_payload: input,
        expected_resolved: expectedPasscode
      }
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    // معالجة الأخطاء غير المتوقعة لمنع تعليق المتصفح (Endless Loader)
    return new Response(JSON.stringify({ 
      error: "بوابة الوصول واجهت خطأ داخلي.",
      details: error.message || error
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
