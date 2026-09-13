import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Optimistic auth check only (see docs/SECURITY.md §4) — every protected
// route handler re-verifies the session and role server-side regardless.
// Next.js 16 renamed `middleware.ts` to `proxy.ts`; functionality is the same.

const SESSION_COOKIE = "autopick_session";

const PUBLIC_COMPANY_PATHS = ["/company/login", "/company/register"];
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

async function getRole(token: string | undefined): Promise<"COMPANY" | "ADMIN" | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "dev-insecure-secret-change-me-dev-insecure-secret-change-me"
    );
    const { payload } = await jwtVerify(token, secret);
    if (payload.role === "COMPANY" || payload.role === "ADMIN") return payload.role;
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (pathname.startsWith("/company") && !PUBLIC_COMPANY_PATHS.includes(pathname)) {
    const role = await getRole(token);
    if (role !== "COMPANY") {
      const url = request.nextUrl.clone();
      url.pathname = "/company/login";
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.includes(pathname)) {
    const role = await getRole(token);
    if (role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/company/:path*", "/admin/:path*"],
};
