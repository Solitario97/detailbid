import { notFound } from "next/navigation";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { toPublicRequestDTO } from "@/modules/requests/dto";
import { listActiveOffersForRequest, getRevealedOfferIds } from "@/modules/offers/service";
import { toOfferPublicDTO } from "@/modules/offers/dto";
import { ClientRequestView } from "@/components/client/client-request-view";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { publicId } = await params;
  const { t: token } = await searchParams;

  if (!token) notFound();

  const found = await getRequestByPublicIdAndToken(publicId, token);
  if (!found) notFound();

  await prisma.analyticsEvent.create({ data: { type: "REQUEST_VIEWED", requestId: found.id } }).catch(() => {});

  const [offers, revealed] = await Promise.all([
    listActiveOffersForRequest(found.id),
    getRevealedOfferIds(found.id),
  ]);

  return (
    <ClientRequestView
      publicId={publicId}
      token={token}
      initialRequest={toPublicRequestDTO(found)}
      initialOffers={offers.map((o) => toOfferPublicDTO(o, revealed.has(o.id)))}
    />
  );
}
