import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// Custom session-based auth for Company/Admin users (see docs/SECURITY.md §4).
//
// Not using Auth.js here: this project pins to a very recent Next.js release
// (see AGENTS.md) and a hand-rolled JWT-in-httpOnly-cookie session keeps the
// authorization boundary small, dependency-free, and easy to audit for the
// one invariant that matters most in this app (companies never see client
// PII) — every route re-checks `session.role`/`session.companyId` itself,
// this module is not the sole authorization boundary.
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "autopick_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const secretKey = new TextEncoder().encode(env.authSecret);

export type SessionPayload = {
  userId: string;
  role: "COMPANY" | "ADMIN";
  companyId?: string;
  email: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (
      typeof payload.userId === "string" &&
      (payload.role === "COMPANY" || payload.role === "ADMIN") &&
      typeof payload.email === "string"
    ) {
      return {
        userId: payload.userId,
        role: payload.role,
        companyId: typeof payload.companyId === "string" ? payload.companyId : undefined,
        email: payload.email,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Reads and verifies the current session from cookies. Server-only. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
