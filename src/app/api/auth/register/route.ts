import { NextResponse } from "next/server";
import { registerCompanySchema } from "@/modules/companies/types";
import { registerCompany, CompanyError } from "@/modules/companies/service";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });

  const parsed = registerCompanySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const user = await registerCompany(parsed.data);
    await setSessionCookie({ userId: user.id, role: "COMPANY", companyId: user.company!.id, email: user.email });
    return NextResponse.json({ ok: true, status: user.company!.status }, { status: 201 });
  } catch (err) {
    if (err instanceof CompanyError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
