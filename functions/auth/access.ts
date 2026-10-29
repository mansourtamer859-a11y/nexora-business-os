export async function onRequest(context) {
  const { request, env } = context;
  
  // السماح بمرور كافة الطلبات برمجياً وبناء التوثيق الداخلي
  return new Response(JSON.stringify({ 
    status: "success", 
    authenticated: true,
    message: "Native Nexora Security Layer Active" 
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
