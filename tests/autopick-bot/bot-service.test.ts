import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { makeCity, makeService, makeCompany } from "../helpers/factory";
import { loadAutopickBotModules } from "./helpers";

describe("autopick-bot service: creates real requests through the production flow", () => {
  let bot: Awaited<ReturnType<typeof loadAutopickBotModules>>;

  beforeAll(async () => {
    bot = await loadAutopickBotModules(true);
    // The bot picks a random existing city/active service — make sure at
    // least one of each exists so it never fails for lack of catalog data.
    await makeCity();
    await makeService();
  });

  it("creates a Request row tagged source=autopick_bot, with the technical phone number", async () => {
    const before = await prisma.request.count({ where: { source: "autopick_bot" } });
    await bot.service.runAutopickBotCreate();
    const after = await prisma.request.count({ where: { source: "autopick_bot" } });
    expect(after).toBe(before + 1);

    const created = await prisma.request.findFirst({
      where: { source: "autopick_bot" },
      orderBy: { createdAt: "desc" },
    });
    expect(created).not.toBeNull();
    expect(created!.customerPhone).toBe(bot.config.AUTOPICK_BOT_PHONE);
    expect(bot.config.AUTOPICK_BOT_CARS.some((c) => c.brand === created!.carBrand && c.model === created!.carModel)).toBe(true);
    expect(bot.config.AUTOPICK_BOT_NAMES).toContain(created!.customerName);
    expect(bot.config.AUTOPICK_BOT_YEARS).toContain(created!.carYear);
  });

  it("is counted by the existing admin dashboard statistics (no source filtering anywhere in that query)", async () => {
    const { getAdminDashboard } = await import("@/modules/analytics/service");
    const before = await getAdminDashboard();
    await bot.service.runAutopickBotCreate();
    const after = await getAdminDashboard();
    expect(after.requestsToday).toBe(before.requestsToday + 1);
  });

  it("is retrievable through the same company-matching query real requests use, and never exposes `source` in the DTO", async () => {
    const city = await makeCity();
    const service = await makeService();
    const company = await makeCompany({ status: "APPROVED", cityId: city.id });

    // Force the bot to use this exact city/service by seeding it as the
    // only one available isn't practical (other tests share the DB), so
    // instead create the bot request directly through the same
    // createRequest() call the bot itself makes, pinned to this city, to
    // deterministically test the matching + DTO path end to end.
    const { createRequest } = await import("@/modules/requests/service");
    const { createRequestSchema } = await import("@/modules/requests/types");
    const input = createRequestSchema.parse({
      cityId: city.id,
      serviceIds: [service.id],
      carBrand: "Toyota",
      carModel: "Camry",
      carYear: 2025,
      carCondition: "NEW",
      customerName: "Алихан",
      customerPhone: bot.config.AUTOPICK_BOT_PHONE,
    });
    const { request: created } = await createRequest(input, { source: "autopick_bot" });

    const { listActiveRequestsForCompany } = await import("@/modules/requests/service");
    const { toCompanyRequestDTO } = await import("@/modules/requests/dto");
    const matches = await listActiveRequestsForCompany({ companyId: company.id, cityId: city.id });
    const match = matches.find((r) => r.id === created.id);
    expect(match).toBeDefined();

    const dto = toCompanyRequestDTO(match!);
    expect("source" in dto).toBe(false);
  });
});
