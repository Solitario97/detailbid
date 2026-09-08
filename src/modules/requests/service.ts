import { prisma } from "@/lib/prisma";
import { createAccessToken, createPublicId, hashAccessToken, verifyAccessToken } from "@/lib/tokens";
import { env } from "@/lib/env";
import type { CreateRequestInput } from "./types";
import { notifier } from "@/modules/notifications/notifier";

const COMPANY_SELECT = {
  id: true,
  city: { select: { id: true, name: true, slug: true } },
  carBrand: true,
  carModel: true,
  carYear: true,
  carCondition: true,
  comment: true,
  desiredDate: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  services: { select: { service: { select: { id: true, name: true, slug: true } } } },
  images: { select: { url: true } },
} as const;

const CLIENT_SELECT = {
  ...COMPANY_SELECT,
  publicId: true,
  customerName: true,
  customerPhone: true,
  customerWhatsapp: true,
} as const;

export async function createRequest(input: CreateRequestInput) {
  const publicId = createPublicId();
  const token = createAccessToken();
  const accessTokenHash = hashAccessToken(token);
  const expiresAt = new Date(Date.now() + env.requestTtlDays * 24 * 60 * 60 * 1000);

  const request = await prisma.request.create({
    data: {
      publicId,
      accessTokenHash,
      cityId: input.cityId,
      carBrand: input.carBrand,
      carModel: input.carModel,
      carYear: input.carYear ?? null,
      carCondition: input.carCondition,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerWhatsapp: input.customerWhatsapp ?? null,
      comment: input.comment ?? null,
      desiredDate: input.desiredDate ? new Date(input.desiredDate) : null,
      status: "ACTIVE",
      expiresAt,
      services: {
        create: input.serviceIds.map((serviceId) => ({ serviceId })),
      },
      images: {
        create: input.imageUrls.map((url) => ({ url })),
      },
    },
    select: CLIENT_SELECT,
  });

  await prisma.analyticsEvent.create({
    data: { type: "REQUEST_CREATED", requestId: request.id },
  });

  return { request, token };
}

/** Loads a request by its publicId and verifies the presented client token. */
export async function getRequestByPublicIdAndToken(publicId: string, token: string) {
  const request = await prisma.request.findUnique({
    where: { publicId },
    select: { ...CLIENT_SELECT, accessTokenHash: true },
  });
  if (!request) return null;
  if (!verifyAccessToken(token, request.accessTokenHash)) return null;
  return request;
}

export async function getRequestForCompanyById(id: string) {
  return prisma.request.findUnique({ where: { id }, select: COMPANY_SELECT });
}

export type CompanyRequestFilters = {
  cityId?: string;
  serviceId?: string;
  carBrand?: string;
  carCondition?: "NEW" | "USED";
  onlyWithoutMyOffer?: boolean;
  companyId: string;
};

export async function listActiveRequestsForCompany(filters: CompanyRequestFilters) {
  const now = new Date();
  const requests = await prisma.request.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { gt: now },
      cityId: filters.cityId || undefined,
      carBrand: filters.carBrand ? { equals: filters.carBrand, mode: "insensitive" } : undefined,
      carCondition: filters.carCondition || undefined,
      services: filters.serviceId ? { some: { serviceId: filters.serviceId } } : undefined,
      offers: filters.onlyWithoutMyOffer
        ? { none: { companyId: filters.companyId } }
        : undefined,
    },
    select: {
      ...COMPANY_SELECT,
      offers: {
        where: { companyId: filters.companyId },
        select: {
          id: true,
          price: true,
          durationValue: true,
          durationUnit: true,
          availableAt: true,
          comment: true,
          oldPrice: true,
          discountPercent: true,
          guarantee: true,
          extraConditions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return requests;
}

export async function notifyCompaniesOfNewRequest(requestId: string, carBrand: string, carModel: string) {
  const companies = await prisma.company.findMany({
    where: { status: "APPROVED" },
    select: { id: true },
  });
  await Promise.all(
    companies.map((c) =>
      notifier.send({ type: "NEW_REQUEST", recipientType: "COMPANY", recipientId: c.id, requestId, carBrand, carModel })
    )
  );
}

export async function expireStaleRequests(): Promise<number> {
  const result = await prisma.request.updateMany({
    where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
