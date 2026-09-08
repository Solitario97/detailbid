import { prisma } from "@/lib/prisma";
import type { UpsertOfferInput } from "./types";
import { notifier } from "@/modules/notifications/notifier";

export class OfferError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const OFFER_CLIENT_SELECT = {
  id: true,
  price: true,
  currency: true,
  durationValue: true,
  durationUnit: true,
  availableAt: true,
  comment: true,
  oldPrice: true,
  discountPercent: true,
  guarantee: true,
  extraConditions: true,
  createdAt: true,
  company: { select: { id: true, name: true, slug: true, logoUrl: true, description: true, status: true } },
} as const;

export async function listActiveOffersForRequest(requestId: string) {
  return prisma.offer.findMany({
    where: { requestId, status: "ACTIVE" },
    select: OFFER_CLIENT_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export async function getRevealedOfferIds(requestId: string): Promise<Set<string>> {
  const reveals = await prisma.contactReveal.findMany({
    where: { requestId },
    select: { offerId: true },
    distinct: ["offerId"],
  });
  return new Set(reveals.map((r) => r.offerId));
}

/** Company creates or edits their single offer on a request. */
export async function upsertOffer(params: {
  requestId: string;
  companyId: string;
  input: UpsertOfferInput;
}) {
  const { requestId, companyId, input } = params;

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true } });
  if (!company || company.status !== "APPROVED") {
    throw new OfferError("Только одобренные компании могут отправлять предложения", 403);
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, expiresAt: true, carBrand: true, carModel: true },
  });
  if (!request) throw new OfferError("Заявка не найдена", 404);
  if (request.status !== "ACTIVE" || request.expiresAt <= new Date()) {
    throw new OfferError("Заявка больше не принимает предложения", 409);
  }

  const existing = await prisma.offer.findUnique({
    where: { requestId_companyId: { requestId, companyId } },
  });

  const data = {
    price: input.price,
    durationValue: input.durationValue,
    durationUnit: input.durationUnit,
    availableAt: new Date(input.availableAt),
    comment: input.comment ?? null,
    oldPrice: input.oldPrice ?? null,
    discountPercent: input.discountPercent ?? null,
    guarantee: input.guarantee ?? null,
    extraConditions: input.extraConditions ?? null,
    status: "ACTIVE" as const,
  };

  const offer = await prisma.offer.upsert({
    where: { requestId_companyId: { requestId, companyId } },
    create: { requestId, companyId, ...data },
    update: data,
  });

  await prisma.analyticsEvent.create({
    data: {
      type: existing ? "OFFER_UPDATED" : "OFFER_CREATED",
      requestId,
      offerId: offer.id,
      companyId,
    },
  });

  if (!existing) {
    const companyProfile = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
    await notifier.send({
      type: "OFFER_RECEIVED",
      recipientType: "CLIENT",
      recipientId: requestId,
      requestId,
      offerId: offer.id,
      companyName: companyProfile?.name ?? "",
    });
  }

  return offer;
}

/** Company edits its own existing offer. Verifies ownership (IDOR check). */
export async function editOwnOffer(params: { offerId: string; companyId: string; input: UpsertOfferInput }) {
  const { offerId, companyId, input } = params;
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { companyId: true, requestId: true } });
  if (!offer) throw new OfferError("Предложение не найдено", 404);
  if (offer.companyId !== companyId) throw new OfferError("Недостаточно прав", 403);
  return upsertOffer({ requestId: offer.requestId, companyId, input });
}

export async function listOffersForCompany(companyId: string) {
  return prisma.offer.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

/** Records that the client actually saw an offer card. Idempotent-ish: one row per view call. */
export async function recordOfferImpression(requestId: string, offerId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { requestId: true, companyId: true } });
  if (!offer || offer.requestId !== requestId) throw new OfferError("Offer not found for this request", 404);
  await prisma.analyticsEvent.create({
    data: { type: "OFFER_IMPRESSION", requestId, offerId, companyId: offer.companyId },
  });
}

/**
 * Reveals a company's contact details for one offer. Enforces that the
 * offer actually belongs to the request identified by the client's token
 * (IDOR check, see docs/SECURITY.md §2/§5).
 */
export async function revealOfferContact(requestId: string, offerId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      requestId: true,
      companyId: true,
      company: { select: { phone: true, whatsapp: true, instagram: true, twoGisUrl: true, address: true } },
    },
  });
  if (!offer || offer.requestId !== requestId) {
    throw new OfferError("Предложение не найдено для этой заявки", 404);
  }

  await prisma.contactReveal.create({
    data: { requestId, offerId, companyId: offer.companyId },
  });
  await prisma.analyticsEvent.create({
    data: { type: "CONTACT_REVEAL", requestId, offerId, companyId: offer.companyId },
  });

  return offer.company;
}

const OUTBOUND_EVENT_TYPE = {
  PHONE: "PHONE_CLICK",
  WHATSAPP: "WHATSAPP_CLICK",
  INSTAGRAM: "INSTAGRAM_CLICK",
  TWO_GIS: "TWO_GIS_CLICK",
} as const;

export async function recordOutboundClick(
  requestId: string,
  offerId: string,
  type: keyof typeof OUTBOUND_EVENT_TYPE
) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      requestId: true,
      companyId: true,
      company: { select: { phone: true, whatsapp: true, instagram: true, twoGisUrl: true } },
    },
  });
  if (!offer || offer.requestId !== requestId) {
    throw new OfferError("Предложение не найдено для этой заявки", 404);
  }

  await prisma.analyticsEvent.create({
    data: { type: OUTBOUND_EVENT_TYPE[type], requestId, offerId, companyId: offer.companyId },
  });

  return buildOutboundUrl(type, offer.company);
}

function buildOutboundUrl(
  type: keyof typeof OUTBOUND_EVENT_TYPE,
  company: { phone: string | null; whatsapp: string | null; instagram: string | null; twoGisUrl: string | null }
): string | null {
  switch (type) {
    case "PHONE":
      return company.phone ? `tel:${company.phone.replace(/[^0-9+]/g, "")}` : null;
    case "WHATSAPP": {
      const digits = (company.whatsapp || company.phone || "").replace(/[^0-9]/g, "");
      return digits ? `https://wa.me/${digits}` : null;
    }
    case "INSTAGRAM":
      if (!company.instagram) return null;
      return company.instagram.startsWith("http")
        ? company.instagram
        : `https://instagram.com/${company.instagram.replace(/^@/, "")}`;
    case "TWO_GIS":
      return company.twoGisUrl || null;
  }
}
