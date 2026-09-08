import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/tokens";
import type { RegisterCompanyInput, UpdateCompanyProfileInput } from "./types";

export class CompanyError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function registerCompany(input: RegisterCompanyInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new CompanyError("Пользователь с таким email уже существует", 409);

  const passwordHash = await hashPassword(input.password);
  const baseSlug = slugify(input.name) || "company";
  let slug = baseSlug;
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: "COMPANY",
      company: {
        create: {
          name: input.name,
          slug,
          cityId: input.cityId,
          phone: input.phone,
          whatsapp: input.whatsapp,
          status: "PENDING",
        },
      },
    },
    include: { company: true },
  });

  return user;
}

export async function updateCompanyProfile(companyId: string, input: UpdateCompanyProfileInput) {
  return prisma.company.update({
    where: { id: companyId },
    data: {
      name: input.name,
      description: input.description,
      logoUrl: input.logoUrl,
      phone: input.phone,
      whatsapp: input.whatsapp,
      instagram: input.instagram,
      twoGisUrl: input.twoGisUrl,
      address: input.address,
      cityId: input.cityId,
      workingHours: input.workingHours ? { text: input.workingHours } : undefined,
    },
  });
}

export async function getCompanyProfile(companyId: string) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: { city: true },
  });
}

export async function listCompaniesForAdmin() {
  return prisma.company.findMany({
    include: { city: true, _count: { select: { offers: true, contactReveals: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function setCompanyStatus(companyId: string, status: "PENDING" | "APPROVED" | "BLOCKED") {
  return prisma.company.update({ where: { id: companyId }, data: { status } });
}
