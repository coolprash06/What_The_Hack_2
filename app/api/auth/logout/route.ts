import { cookies } from "next/headers";
import { COOKIE, cookieOptions, sameOrigin } from "@/lib/auth/core";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return new Response(null, { status: 303, headers: { Location: "/login", "Cache-Control": "no-store" } });
}
