import { prisma } from "@/lib/prisma";
import { createAccessToken, createPublicId, hashAccessToken } from "@/lib/tokens";

let counter = 0;
function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function makeCity() {
  const name = uniq("City");
  return prisma.city.create({ data: { name, slug: name.toLowerCase() } });
}

export async function makeService() {
  const name = uniq("Service");
  return prisma.service.create({ data: { name, slug: name.toLowerCase() } });
}

export async function makeCompany(opts: { status?: "PENDING" | "APPROVED" | "BLOCKED"; cityId?: string } = {}) {
  const city = opts.cityId ? { id: opts.cityId } : await makeCity();
  const name = uniq("Company");
  const user = await prisma.user.create({
    data: {
      email: `${uniq("company")}@test.local`,
      passwordHash: "not-a-real-hash",
      role: "COMPANY",
      company: {
        create: {
          name,
          slug: name.toLowerCase(),
          cityId: city.id,
          status: opts.status ?? "APPROVED",
          phone: "+77010000000",
          whatsapp: "+77010000000",
          instagram: "test.company",
          twoGisUrl: "https://2gis.kz/test",
        },
      },
    },
    include: { company: true },
  });
  return user.company!;
}

export async function makeRequest(opts: {
  cityId?: string;
  expiresAt?: Date;
  status?: "ACTIVE" | "EXPIRED";
  source?: string;
  createdAt?: Date;
  carBrand?: string;
  carModel?: string;
  carYear?: number;
  customerName?: string;
} = {}) {
  const city = opts.cityId ? { id: opts.cityId } : await makeCity();
  const token = createAccessToken();
  const request = await prisma.request.create({
    data: {
      publicId: createPublicId(),
      accessTokenHash: hashAccessToken(token),
      cityId: city.id,
      carBrand: opts.carBrand ?? "TestBrand",
      carModel: opts.carModel ?? "TestModel",
      carYear: opts.carYear,
      carCondition: "USED",
      customerName: opts.customerName ?? "Секретный Клиент",
      customerPhone: "+77079998877",
      customerWhatsapp: "+77079998877",
      status: opts.status ?? "ACTIVE",
      expiresAt: opts.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      source: opts.source ?? "user",
      createdAt: opts.createdAt,
    },
  });
  return { request, token };
}

export async function makeOffer(requestId: string, companyId: string, overrides: Partial<{ price: number }> = {}) {
  return prisma.offer.create({
    data: {
      requestId,
      companyId,
      price: overrides.price ?? 100000,
      durationValue: 1,
      durationUnit: "DAYS",
      availableAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });
}
