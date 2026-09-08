import { NextResponse } from "next/server";
import { loginSchema } from "@/modules/companies/types";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Слишком много попыток входа" }, { status: 429 });

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { company: true },
  });

  // Constant response shape regardless of which check fails, to avoid
  // leaking whether an email is registered.
  const invalid = () => NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

  if (!user) return invalid();
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return invalid();

  if (user.role === "COMPANY" && !user.company) return invalid();

  await setSessionCookie({
    userId: user.id,
    role: user.role,
    companyId: user.company?.id,
    email: user.email,
  });

  return NextResponse.json({
    ok: true,
    role: user.role,
    companyStatus: user.company?.status,
  });
}
