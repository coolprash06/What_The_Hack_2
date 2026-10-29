import { cookies } from "next/headers";
import { COOKIE, configuration, cookieOptions, createSession, loginLimit, sameOrigin, verifyCredentials } from "@/lib/auth/core";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!sameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403, headers });
  try {
    configuration();
    if (Number(request.headers.get("content-length")) > 4096) return new Response(null, { status: 413, headers });
    const body = await request.json().catch(() => null);
    if (typeof body?.username !== "string" || typeof body?.password !== "string" ||
        body.username.length > 128 || body.password.length > 256 ||
        !await verifyCredentials(body.username.trim(), body.password)) {
      const retry = loginLimit();
      if (retry) return Response.json({ error: "Too many attempts. Try again later." }, {
        status: 429, headers: { ...headers, "Retry-After": String(retry) },
      });
      return Response.json({ error: "Invalid credentials" }, { status: 401, headers });
    }
    const jar = await cookies();
    jar.set(COOKIE, createSession(), cookieOptions);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ error: "Login unavailable. Check server authentication configuration." }, { status: 503, headers });
  }
}
