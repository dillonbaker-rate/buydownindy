// Read-only data API: callable from agents' websites and newsletter tools.
export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "cache-control": "no-store",
};
export const preflight = () => new Response(null, { status: 204, headers: CORS });
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });
