import {
  hasAccessGate,
  jsonResponse,
  isConfigured,
  validPasscode,
  gateCookieName,
  gateLifetimeSeconds,
  AccessGateEnvironment
} from '../../_lib/accessGate';

// دالة معالجة طلبات التحقق وتوليد الكوكي الآمن (POST)
export const onRequestPost: PagesFunction<AccessGateEnvironment> = async (context) => {
  try {
    const { request, env } = context;

    // التأكد من إعداد المتغيرات على كلوفلير منعاً لخطأ 503
    if (!isConfigured(env)) {
      return jsonResponse(503, { error: 'بوابة الدخول غير مهيأة بالشكل الصحيح في لوحة التحكم.' });
    }

    const body = await request.json() as { passcode?: string };
    const passcode = body.passcode?.trim();

    if (!passcode) {
      return jsonResponse(400, { error: '117007#' });
    }

    // التحقق الآمن المقارن من الـ Passcode
    const isMatched = await validPasscode(passcode, env.NEXORA_GATE_PASSCODE!);

    if (!isMatched) {
      return jsonResponse(401, { error: 'رمز المرور المدخل غير صحيح.' });
    }

    // إعداد مكونات التوكن المشفر والموقع
    const expiresAt = Date.now() + (gateLifetimeSeconds * 1000);
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // إنشاء التوقيع الرقمي عبر HMAC باستخدام المفتاح البيئي لـ Cloudflare
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.NEXORA_GATE_SIGNING_KEY!),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${expiresAt}.${nonce}`));
    const signatureText = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const cookieValue = btoa(`${expiresAt} ${nonce} ${signatureText}`);

    // إرجاع استجابة ناجحة وتثبيت ملف ارتباط آمن وموقع للمتصفح
    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `${gateCookieName}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${gateLifetimeSeconds}`
      }
    });

  } catch (error: any) {
    return jsonResponse(500, { error: 'حدث خطأ داخلي أثناء معالجة الطلب.', details: error.message });
  }
};

// دالة التحقق السريع من حالة الجلسة الحالية للمتصفح (GET)
export const onRequestGet: PagesFunction<AccessGateEnvironment> = async (context) => {
  try {
    const { request, env } = context;
    
    const isValid = await hasAccessGate(request, env);
    return jsonResponse(200, { verified: isValid });
  } catch {
    return jsonResponse(200, { verified: false });
  }
};
