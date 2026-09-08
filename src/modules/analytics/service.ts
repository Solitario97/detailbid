import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export type TimeRange = "today" | "7d" | "30d" | "all";

const OUTBOUND_TYPES = ["PHONE_CLICK", "WHATSAPP_CLICK", "INSTAGRAM_CLICK", "TWO_GIS_CLICK"] as const;

export function rangeStart(range: TimeRange): Date | undefined {
  const now = new Date();
  switch (range) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "all":
      return undefined;
  }
}

function safeDiv(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal place, percent
}

export interface CompanyStats {
  offersCount: number;
  impressions: number;
  contactReveals: number; // unique (requestId, offerId)
  outboundLeads: number; // unique (requestId, offerId)
  whatsappClicks: number;
  phoneClicks: number;
  instagramClicks: number;
  twoGisClicks: number;
  contactConversionPct: number; // reveals / impressions
  outboundConversionPct: number; // outbound / reveals
  offerToOutboundConversionPct: number; // outbound / impressions
}

export async function getCompanyStats(companyId: string, range: TimeRange): Promise<CompanyStats> {
  const since = rangeStart(range);
  const createdAt = since ? { gte: since } : undefined;

  const [offersCount, impressions, revealGroups, outboundGroups, byType] = await Promise.all([
    prisma.offer.count({ where: { companyId, createdAt } }),
    prisma.analyticsEvent.count({ where: { companyId, type: "OFFER_IMPRESSION", createdAt } }),
    prisma.analyticsEvent.groupBy({
      by: ["requestId", "offerId"],
      where: { companyId, type: "CONTACT_REVEAL", createdAt },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["requestId", "offerId"],
      where: { companyId, type: { in: [...OUTBOUND_TYPES] }, createdAt },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: { companyId, type: { in: [...OUTBOUND_TYPES] }, createdAt },
      _count: { _all: true },
    }),
  ]);

  const countByType = Object.fromEntries(byType.map((b) => [b.type, b._count._all]));

  const contactReveals = revealGroups.length;
  const outboundLeads = outboundGroups.length;

  return {
    offersCount,
    impressions,
    contactReveals,
    outboundLeads,
    whatsappClicks: countByType["WHATSAPP_CLICK"] ?? 0,
    phoneClicks: countByType["PHONE_CLICK"] ?? 0,
    instagramClicks: countByType["INSTAGRAM_CLICK"] ?? 0,
    twoGisClicks: countByType["TWO_GIS_CLICK"] ?? 0,
    contactConversionPct: safeDiv(contactReveals, impressions),
    outboundConversionPct: safeDiv(outboundLeads, contactReveals),
    offerToOutboundConversionPct: safeDiv(outboundLeads, impressions),
  };
}

export async function getCompanyBestOffer(companyId: string) {
  const offers = await prisma.offer.findMany({
    where: { companyId, status: "ACTIVE" },
    select: {
      id: true,
      price: true,
      currency: true,
      request: { select: { carBrand: true, carModel: true, services: { select: { service: { select: { name: true } } } } } },
    },
  });
  if (offers.length === 0) return null;

  const stats = await Promise.all(
    offers.map(async (o) => {
      const [impressions, reveals, whatsapp] = await Promise.all([
        prisma.analyticsEvent.count({ where: { offerId: o.id, type: "OFFER_IMPRESSION" } }),
        prisma.analyticsEvent.groupBy({ by: ["requestId"], where: { offerId: o.id, type: "CONTACT_REVEAL" } }),
        prisma.analyticsEvent.count({ where: { offerId: o.id, type: "WHATSAPP_CLICK" } }),
      ]);
      return { offer: o, impressions, reveals: reveals.length, whatsapp };
    })
  );

  stats.sort((a, b) => b.reveals - a.reveals || b.impressions - a.impressions);
  const best = stats[0];
  if (!best || (best.impressions === 0 && best.reveals === 0)) return null;
  return {
    carBrand: best.offer.request.carBrand,
    carModel: best.offer.request.carModel,
    services: best.offer.request.services.map((s) => s.service.name),
    price: best.offer.price,
    currency: best.offer.currency,
    impressions: best.impressions,
    contactReveals: best.reveals,
    whatsappClicks: best.whatsapp,
  };
}

export interface AdminDashboard {
  requestsToday: number;
  requestsThisWeek: number;
  activeRequests: number;
  registeredCompanies: number;
  activeCompanies: number;
  totalOffers: number;
  avgOffersPerRequest: number;
  contactReveals: number;
  conversionPct: number;
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    requestsToday,
    requestsThisWeek,
    activeRequests,
    registeredCompanies,
    activeCompanies,
    totalOffers,
    totalRequestsWithOffers,
    impressions,
    revealGroups,
  ] = await Promise.all([
    prisma.request.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.request.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.request.count({ where: { status: "ACTIVE", expiresAt: { gt: now } } }),
    prisma.company.count(),
    prisma.company.count({ where: { status: "APPROVED" } }),
    prisma.offer.count(),
    prisma.request.count(),
    prisma.analyticsEvent.count({ where: { type: "OFFER_IMPRESSION" } }),
    prisma.analyticsEvent.groupBy({ by: ["requestId", "offerId"], where: { type: "CONTACT_REVEAL" } }),
  ]);

  return {
    requestsToday,
    requestsThisWeek,
    activeRequests,
    registeredCompanies,
    activeCompanies,
    totalOffers,
    avgOffersPerRequest: totalRequestsWithOffers > 0 ? Math.round((totalOffers / totalRequestsWithOffers) * 10) / 10 : 0,
    contactReveals: revealGroups.length,
    conversionPct: safeDiv(revealGroups.length, impressions),
  };
}

export interface CompanyLeaderboardRow {
  companyId: string;
  companyName: string;
  offers: number;
  impressions: number;
  contactReveals: number;
  whatsappClicks: number;
  phoneClicks: number;
  outboundLeads: number;
  conversionPct: number;
  eligibleForConversionRanking: boolean;
}

export type LeaderboardSort = "leads" | "conversion" | "whatsapp" | "offers";

export async function getCompanyLeaderboard(sort: LeaderboardSort = "leads"): Promise<CompanyLeaderboardRow[]> {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  const rows = await Promise.all(
    companies.map(async (c) => {
      const stats = await getCompanyStats(c.id, "all");
      return {
        companyId: c.id,
        companyName: c.name,
        offers: stats.offersCount,
        impressions: stats.impressions,
        contactReveals: stats.contactReveals,
        whatsappClicks: stats.whatsappClicks,
        phoneClicks: stats.phoneClicks,
        outboundLeads: stats.outboundLeads,
        conversionPct: stats.contactConversionPct,
        eligibleForConversionRanking: stats.impressions >= env.analyticsMinImpressionsForConversionRanking,
      };
    })
  );

  const sorters: Record<LeaderboardSort, (a: CompanyLeaderboardRow, b: CompanyLeaderboardRow) => number> = {
    leads: (a, b) => b.contactReveals - a.contactReveals,
    conversion: (a, b) => {
      if (a.eligibleForConversionRanking !== b.eligibleForConversionRanking) {
        return a.eligibleForConversionRanking ? -1 : 1;
      }
      return b.conversionPct - a.conversionPct;
    },
    whatsapp: (a, b) => b.whatsappClicks - a.whatsappClicks,
    offers: (a, b) => b.offers - a.offers,
  };

  return rows.sort(sorters[sort]);
}

export async function getPriceStatsForRequest(requestId: string) {
  const offers = await prisma.offer.findMany({ where: { requestId, status: "ACTIVE" }, select: { price: true } });
  if (offers.length === 0) return null;
  const prices = offers.map((o) => o.price).sort((a, b) => a - b);
  const sum = prices.reduce((a, b) => a + b, 0);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0 ? (prices[mid - 1]! + prices[mid]!) / 2 : prices[mid]!;
  return {
    count: prices.length,
    min: prices[0]!,
    max: prices[prices.length - 1]!,
    average: Math.round(sum / prices.length),
    median: Math.round(median),
  };
}

export async function getPopularServices(limit = 10) {
  const rows = await prisma.requestService.groupBy({
    by: ["serviceId"],
    _count: { _all: true },
    orderBy: { _count: { serviceId: "desc" } },
    take: limit,
  });
  const services = await prisma.service.findMany({ where: { id: { in: rows.map((r) => r.serviceId) } } });
  const byId = new Map(services.map((s) => [s.id, s]));
  return rows.map((r) => ({ service: byId.get(r.serviceId)!, requestCount: r._count._all })).filter((r) => r.service);
}

export async function getPopularBrands(limit = 10) {
  const rows = await prisma.request.groupBy({
    by: ["carBrand"],
    _count: { _all: true },
    orderBy: { _count: { carBrand: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({ brand: r.carBrand, requestCount: r._count._all }));
}

export async function getCityStats() {
  const cities = await prisma.city.findMany();
  return Promise.all(
    cities.map(async (city) => {
      const [requests, offers, revealGroups] = await Promise.all([
        prisma.request.count({ where: { cityId: city.id } }),
        prisma.offer.count({ where: { request: { cityId: city.id } } }),
        prisma.analyticsEvent.groupBy({
          by: ["requestId", "offerId"],
          where: { type: "CONTACT_REVEAL", request: { cityId: city.id } },
        }),
      ]);
      return {
        city: city.name,
        requests,
        offers,
        avgOffersPerRequest: requests > 0 ? Math.round((offers / requests) * 100) / 100 : 0,
        leads: revealGroups.length,
      };
    })
  );
}
