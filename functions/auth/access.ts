export async function onRequest(context) {
  // إعدادات الاستجابة السريعة وتخطي الحظر بالمتصفح
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };

  // التعامل مع طلبات الفحص المسبق السريعة من المتصفح
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // الرد الفوري المباشر بصيغة JSON المطلوبة للتطبيق
  return new Response(
    JSON.stringify({
      status: "success",
      authenticated: true,
      message: "Native Nexora Security Layer Active",
      timestamp: Date.now()
    }),
    {
      status: 200,
      headers: corsHeaders
    }
  );
}
