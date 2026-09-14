import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { makeRequest, makeCompany, makeOffer } from "../helpers/factory";
import { runAutopickBotCleanup } from "@/modules/autopick-bot/cleanup";

const HOUR = 60 * 60 * 1000;

describe("autopick-bot cleanup: 24h deletion, real requests are never touched", () => {
  it("deletes a bot request older than 24h, and cascaded rows too (no orphans)", async () => {
    const { request } = await makeRequest({ source: "autopick_bot", createdAt: new Date(Date.now() - 25 * HOUR) });
    const company = await makeCompany();
    const offer = await makeOffer(request.id, company.id);

    await runAutopickBotCleanup();

    const stillThere = await prisma.request.findUnique({ where: { id: request.id } });
    expect(stillThere).toBeNull();

    const orphanOffer = await prisma.offer.findUnique({ where: { id: offer.id } });
    expect(orphanOffer).toBeNull();
  });

  it("does not delete a bot request younger than 24h", async () => {
    const { request } = await makeRequest({ source: "autopick_bot", createdAt: new Date(Date.now() - 1 * HOUR) });

    await runAutopickBotCleanup();

    const stillThere = await prisma.request.findUnique({ where: { id: request.id } });
    expect(stillThere).not.toBeNull();
  });

  it("never deletes a real user request, even if it is old", async () => {
    const { request } = await makeRequest({ source: "user", createdAt: new Date(Date.now() - 100 * HOUR) });

    await runAutopickBotCleanup();

    const stillThere = await prisma.request.findUnique({ where: { id: request.id } });
    expect(stillThere).not.toBeNull();
  });

  it("does not throw when there is nothing to clean up", async () => {
    await expect(runAutopickBotCleanup()).resolves.toBeUndefined();
  });
});
