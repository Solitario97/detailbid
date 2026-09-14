import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { loadAutopickBotModules } from "./helpers";

describe("autopick-bot: AUTOPICK_BOT_ENABLED=false disables everything", () => {
  it("runAutopickBotCreate is a no-op when disabled", async () => {
    const bot = await loadAutopickBotModules(false);
    expect(bot.env.autopickBotEnabled).toBe(false);

    const before = await prisma.request.count();
    await bot.service.runAutopickBotCreate();
    const after = await prisma.request.count();
    expect(after).toBe(before);
  });

  it("startAutopickBotScheduler does not schedule any work when disabled", async () => {
    const bot = await loadAutopickBotModules(false);
    // Starting it must not throw and must not leave a running interval that
    // could later create requests — we can't directly observe "no timer
    // was set", so we assert the documented contract instead: a tick right
    // after starting still creates nothing.
    expect(() => bot.scheduler.startAutopickBotScheduler()).not.toThrow();
    const before = await prisma.request.count();
    await bot.scheduler.runSchedulerTickSafely(new Date());
    const after = await prisma.request.count();
    expect(after).toBe(before);
  });
});
