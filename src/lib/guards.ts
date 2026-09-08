import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth";

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Every /api/company/** handler calls this — the real authorization boundary. */
export async function requireCompanySession(): Promise<SessionPayload & { companyId: string }> {
  const session = await getSession();
  if (!session || session.role !== "COMPANY" || !session.companyId) {
    throw new AuthError("Требуется авторизация компании", 401);
  }
  return session as SessionPayload & { companyId: string };
}

/** Every /api/admin/** handler calls this — the real authorization boundary. */
export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new AuthError("Требуется авторизация администратора", 403);
  }
  return session;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
