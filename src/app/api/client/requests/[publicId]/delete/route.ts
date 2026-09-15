import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestByPublicIdAndToken, deleteRequestById } from "@/modules/requests/service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const bodySchema = z.object({ token: z.string().min(1) });

// Deletes the caller's own request. Deliberately thin: all it does is verify
// ownership via the existing guest-token check (same as every other client
// route) and then call the one existing deletion path
// (modules/requests/service.ts#deleteRequestById), which relies on the
// schema's onDelete: Cascade relations (RequestService, RequestImage, Offer,
// ContactReveal, AnalyticsEvent) to leave no orphan rows. That function
// already backs the AutoPickBot's 24h cleanup job in production — this is
// not a second deletion system, just a second caller of the first one.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;

  const ip = getClientIp(request);
  const rl = checkRateLimit(`client-action:${ip}`, RATE_LIMITS.clientAction.limit, RATE_LIMITS.clientAction.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });

  // The same token check every other /api/client/* route uses — a caller
  // can only ever resolve *their own* request, never another one by
  // guessing/substituting a publicId, because the accessTokenHash must
  // match too.
  const found = await getRequestByPublicIdAndToken(publicId, parsed.data.token);
  if (!found) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });

  try {
    await deleteRequestById(found.id);
  } catch {
    return NextResponse.json({ error: "Не удалось удалить заявку. Попробуйте ещё раз." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
