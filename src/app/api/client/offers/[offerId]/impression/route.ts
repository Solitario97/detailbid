import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { recordOfferImpression, OfferError } from "@/modules/offers/service";

const bodySchema = z.object({ publicId: z.string().min(1), token: z.string().min(1) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });

  const found = await getRequestByPublicIdAndToken(parsed.data.publicId, parsed.data.token);
  if (!found) return NextResponse.json({ error: "Заявка не найдена" }, { status: 401 });

  try {
    await recordOfferImpression(found.id, offerId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof OfferError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
