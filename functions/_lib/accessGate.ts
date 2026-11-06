// التعريفات الأساسية للبيئة السحابية في Cloudflare
export interface AccessGateEnvironment {
  NEXORA_GATE_PASSCODE?: string;
  NEXORA_GATE_SIGNING_KEY?: string;
}

export const gateCookieName = '__Host-nexora_gate';
export const gateLifetimeSeconds = 60 * 60 * 12; // 12 ساعة صلاحية الجلسة

// تحويل مصفوفة بايتات إلى Base64Url آمنة لعناوين URL
function bytesToBase64Url(bytes: Uint8Array): string {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// تحويل الـ Base64Url إلى مصفوفة بايتات
function base64UrlToBytes(str: string): Uint8Array | null {
  try {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch {
    return null;
  }
}

// قراءة ملفات تعريف الارتباط (Cookies) الخاصة بالبوابة
export function readGateCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const part = cookieHeader.split(';').map(p => p.trim()).find(p => p.startsWith(`${gateCookieName}=`));
  return part ? part.substring(gateCookieName.length + 1) : null;
}

// التحقق من إعداد المتغيرات البيئية بشكل صحيح على السيرفر
export function isConfigured(env: AccessGateEnvironment): boolean {
  return typeof env.NEXORA_GATE_PASSCODE === 'string' && typeof env.NEXORA_GATE_SIGNING_KEY === 'string';
}

// دالة التوقيع الرقمي للملفات والجلسات باستخدام HMAC SHA-256
async function signMessage(message: string, secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return new Uint8Array(signature);
}

// مقارنة آمنة ثابتة الوقت (Constant-time comparison) لمنع هجمات التوقيت
export async function validPasscode(candidate: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const candHash = await crypto.subtle.digest('SHA-256', encoder.encode(candidate));
  const expHash = await crypto.subtle.digest('SHA-256', encoder.encode(expected));
  
  const cBytes = new Uint8Array(candHash);
  const eBytes = new Uint8Array(expHash);
  
  if (cBytes.length !== eBytes.length) return false;
  let difference = 0;
  for (let i = 0; i < cBytes.length; i++) {
    difference |= cBytes[i] ^ eBytes[i];
  }
  return difference === 0;
}

// دالة التحقق الشامل من صلاحية الكوكي والتوكن الموقع رقمياً
export async function hasAccessGate(request: Request, env: AccessGateEnvironment): Promise<boolean> {
  if (!isConfigured(env)) return false;

  const cookieValue = readGateCookie(request);
  if (!cookieValue) return false;

  try {
    const rawValue = atob(cookieValue);
    const parts = rawValue.split(' ');
    if (parts.length !== 3) return false;

    const [expiresText, nonce, signatureText] = parts;
    const expiresAt = Number(expiresText);

    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;

    const expectedSignatureBytes = await signMessage(`${expiresText}.${nonce}`, env.NEXORA_GATE_SIGNING_KEY!);
    const receivedSignatureBytes = base64UrlToBytes(signatureText);

    if (!receivedSignatureBytes || receivedSignatureBytes.length !== expectedSignatureBytes.length) return false;

    let difference = 0;
    for (let i = 0; i < expectedSignatureBytes.length; i++) {
      difference |= receivedSignatureBytes[i] ^ expectedSignatureBytes[i];
    }
    return difference === 0;
  } catch {
    return false;
  }
}

// دالة ردود استجابة الـ JSON القياسية لتوحيد مخرجات الـ API
export function jsonResponse(status: number, body: Record<string, any>, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json');
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}
// دالة الحماية والتحقق الوسيطة لإرجاع خطأ 503 أو 403 للمسارات المحمية في حال فشل التحقق
export async function requireAccessGate(
  request: Request,
  env: AccessGateEnvironment
): Promise<Response | null> {
  // 1. التحقق من إعداد البيئة بالشكل الصحيح في لوحة كلوفلير
  if (!isConfigured(env)) {
    console.error('NEXORA_GATE_PASSCODE or NEXORA_GATE_SIGNING_KEY is not configured.');
    return jsonResponse(503, { error: 'The access gate is not configured for this deployment.' });
  }

  try {
    // 2. التحقق من صلاحية التوكن الرقمي والكوكي الحالي
    const hasAccess = await hasAccessGate(request, env);
    if (hasAccess) {
      return null; // التحقق ناجح، اسمح للملف بإكمال التنفيذ
    }

    // 3. إذا لم يمتلك صلاحية الدخول يتم إرجاع خطأ مصادقة غير مكتملة
    return jsonResponse(403, { error: 'Complete the access gate before continuing.' });
  } catch (error: any) {
    console.error('Could not evaluate the access gate for a protected request.', error);
    return jsonResponse(503, { error: 'The access gate is temporarily unavailable.' });
  }
}
  
