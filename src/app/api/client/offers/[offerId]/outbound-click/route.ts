import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { recordOutboundClick, OfferError } from "@/modules/offers/service";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

const bodySchema = z.object({
  publicId: z.string().min(1),
  token: z.string().min(1),
  type: z.enum(["PHONE", "WHATSAPP", "INSTAGRAM", "TWO_GIS"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const ip = getClientIp(request);
  const rl = checkRateLimit(`client-action:${ip}`, RATE_LIMITS.clientAction.limit, RATE_LIMITS.clientAction.windowMs);
  if (!rl.allowed) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });

  const found = await getRequestByPublicIdAndToken(parsed.data.publicId, parsed.data.token);
  if (!found) return NextResponse.json({ error: "Заявка не найдена" }, { status: 401 });

  try {
    const url = await recordOutboundClick(found.id, offerId, parsed.data.type);
    if (!url) return NextResponse.json({ error: "Контакт не указан компанией" }, { status: 404 });
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof OfferError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
