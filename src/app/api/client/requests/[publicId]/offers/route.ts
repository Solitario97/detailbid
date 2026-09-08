import { NextResponse } from "next/server";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { listActiveOffersForRequest, getRevealedOfferIds } from "@/modules/offers/service";
import { toOfferPublicDTO } from "@/modules/offers/dto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const token = new URL(request.url).searchParams.get("t");
  if (!token) return NextResponse.json({ error: "Токен не указан" }, { status: 401 });

  const found = await getRequestByPublicIdAndToken(publicId, token);
  if (!found) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });

  const [offers, revealed] = await Promise.all([
    listActiveOffersForRequest(found.id),
    getRevealedOfferIds(found.id),
  ]);

  return NextResponse.json({
    offers: offers.map((o) => toOfferPublicDTO(o, revealed.has(o.id))),
  });
}
