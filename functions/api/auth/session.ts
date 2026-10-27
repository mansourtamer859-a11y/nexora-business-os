export async function onRequestGet(context: { request: Request; env: any }): Promise<Response> {
  const mockSession = {
    email: "admin@nexora.com",
    authenticated: true
  };

  return new Response(JSON.stringify(mockSession), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
