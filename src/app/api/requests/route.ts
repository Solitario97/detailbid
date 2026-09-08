import { NextResponse } from "next/server";
import { createRequestSchema } from "@/modules/requests/types";
import { createRequest, notifyCompaniesOfNewRequest } from "@/modules/requests/service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`create-request:${ip}`, RATE_LIMITS.createRequest.limit, RATE_LIMITS.createRequest.windowMs);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Слишком много заявок. Попробуйте позже." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { request: created, token } = await createRequest(parsed.data);

  void notifyCompaniesOfNewRequest(created.id, created.carBrand, created.carModel);

  return NextResponse.json({ publicId: created.publicId, token }, { status: 201 });
}
