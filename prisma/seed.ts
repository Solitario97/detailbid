import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();

const publicIdAlphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generatePublicId = customAlphabet(publicIdAlphabet, 12);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/(^-|-$)/g, "");
}

function accessToken() {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

async function main() {
  console.log("Seeding cities...");
  const cityNames = ["Алматы", "Астана", "Шымкент", "Караганда"];
  const cities = new Map<string, string>();
  for (const name of cityNames) {
    const city = await prisma.city.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), countryCode: "KZ" },
    });
    cities.set(name, city.id);
  }

  console.log("Seeding services...");
  const serviceNames = [
    "Полировка",
    "Керамическое покрытие",
    "Оклейка полиуретановой плёнкой",
    "Химчистка",
    "Тонировка",
    "Шумоизоляция",
    "Антихром",
    "Детейлинг салона",
    "Мойка",
    "Восстановление фар",
    "Оклейка винилом",
    "Защита лобового стекла",
  ];
  const services = new Map<string, string>();
  for (const [i, name] of serviceNames.entries()) {
    const service = await prisma.service.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), sortOrder: i, isActive: true },
    });
    services.set(name, service.id);
  }

  console.log("Seeding admin...");
  const adminPasswordHash = await bcrypt.hash("Admin123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", passwordHash: adminPasswordHash, role: "ADMIN" },
  });

  console.log("Seeding companies...");
  const companyPasswordHash = await bcrypt.hash("Detail123!", 12);

  const companySeeds = [
    { name: "Detail Pro", email: "detail@example.com", city: "Алматы", status: "APPROVED" as const, phone: "+77010000001", whatsapp: "+77010000001", instagram: "detailpro.kz", twoGisUrl: "https://2gis.kz/almaty/firm/detailpro" },
    { name: "Auto Spa", email: "autospa@example.com", city: "Алматы", status: "APPROVED" as const, phone: "+77010000002", whatsapp: "+77010000002", instagram: "autospa.kz", twoGisUrl: "https://2gis.kz/almaty/firm/autospa" },
    { name: "Premium Detailing", email: "premium@example.com", city: "Астана", status: "APPROVED" as const, phone: "+77010000003", whatsapp: "+77010000003", instagram: "premium.detailing", twoGisUrl: "https://2gis.kz/astana/firm/premium" },
    { name: "New Wave Detailing", email: "newwave@example.com", city: "Шымкент", status: "PENDING" as const, phone: "+77010000004", whatsapp: "+77010000004", instagram: null, twoGisUrl: null },
  ];

  const companyIds = new Map<string, string>();

  for (const c of companySeeds) {
    const existing = await prisma.user.findUnique({ where: { email: c.email }, include: { company: true } });
    if (existing?.company) {
      companyIds.set(c.name, existing.company.id);
      continue;
    }
    const user = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash: companyPasswordHash,
        role: "COMPANY",
        company: {
          create: {
            name: c.name,
            slug: slugify(c.name),
            description: `${c.name} — профессиональный детейлинг-центр.`,
            phone: c.phone,
            whatsapp: c.whatsapp,
            instagram: c.instagram,
            twoGisUrl: c.twoGisUrl,
            address: `${c.city}, ул. Примерная, 1`,
            cityId: cities.get(c.city)!,
            status: c.status,
          },
        },
      },
      include: { company: true },
    });
    companyIds.set(c.name, user.company!.id);
  }

  console.log("Seeding sample requests + offers...");
  const sampleRequests = [
    {
      city: "Алматы",
      carBrand: "BMW",
      carModel: "X5",
      carYear: 2023,
      carCondition: "USED" as const,
      customerName: "Ерлан",
      customerPhone: "+77011112233",
      services: ["Полировка", "Керамическое покрытие"],
      comment: "Есть мелкие царапины на переднем крыле.",
    },
    {
      city: "Алматы",
      carBrand: "Toyota",
      carModel: "Camry",
      carYear: 2021,
      carCondition: "USED" as const,
      customerName: "Айгерим",
      customerPhone: "+77012223344",
      services: ["Химчистка", "Мойка"],
      comment: null,
    },
    {
      city: "Астана",
      carBrand: "Lexus",
      carModel: "RX",
      carYear: 2024,
      carCondition: "NEW" as const,
      customerName: "Данияр",
      customerPhone: "+77013334455",
      services: ["Оклейка полиуретановой плёнкой", "Защита лобового стекла"],
      comment: "Новая машина, нужна полная защита кузова.",
    },
  ];

  for (const r of sampleRequests) {
    const { hash } = accessToken();
    const request = await prisma.request.create({
      data: {
        publicId: generatePublicId(),
        accessTokenHash: hash,
        cityId: cities.get(r.city)!,
        carBrand: r.carBrand,
        carModel: r.carModel,
        carYear: r.carYear,
        carCondition: r.carCondition,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        comment: r.comment,
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        services: { create: r.services.map((name) => ({ serviceId: services.get(name)! })) },
      },
    });

    await prisma.analyticsEvent.create({ data: { type: "REQUEST_CREATED", requestId: request.id } });

    // A couple of companies make offers on the first request, to demonstrate
    // the comparison UI and analytics out of the box.
    if (r.carBrand === "BMW") {
      const offerSeeds = [
        { company: "Detail Pro", price: 120000, durationValue: 2, durationUnit: "DAYS" as const },
        { company: "Auto Spa", price: 135000, durationValue: 1, durationUnit: "DAYS" as const },
      ];
      for (const o of offerSeeds) {
        const companyId = companyIds.get(o.company)!;
        const offer = await prisma.offer.create({
          data: {
            requestId: request.id,
            companyId,
            price: o.price,
            durationValue: o.durationValue,
            durationUnit: o.durationUnit,
            availableAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            comment: "В стоимость входит двухфазная мойка, подготовка кузова и керамическое покрытие. Гарантия 12 месяцев.",
            guarantee: "12 месяцев",
            status: "ACTIVE",
          },
        });
        await prisma.analyticsEvent.create({ data: { type: "OFFER_CREATED", requestId: request.id, offerId: offer.id, companyId } });
        await prisma.analyticsEvent.create({ data: { type: "OFFER_IMPRESSION", requestId: request.id, offerId: offer.id, companyId } });
      }
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
