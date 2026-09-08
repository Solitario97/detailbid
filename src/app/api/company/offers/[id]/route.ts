import { NextResponse } from "next/server";
import { requireCompanySession, AuthError } from "@/lib/guards";
import { upsertOfferSchema } from "@/modules/offers/types";
import { editOwnOffer, OfferError } from "@/modules/offers/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCompanySession();
    const { id: offerId } = await params;

    const parsed = upsertOfferSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const offer = await editOwnOffer({ offerId, companyId: session.companyId, input: parsed.data });
    return NextResponse.json({ offer });
  } catch (err) {
    if (err instanceof AuthError || err instanceof OfferError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
