import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { makeCity, makeService } from "../helpers/factory";
import { loadAutopickBotModules } from "./helpers";

describe("autopick-bot scheduler: multiple instances never double-create for the same slot", () => {
  beforeAll(async () => {
    await makeCity();
    await makeService();
  });

  it("two concurrent ticks for the exact same slot (simulating two backend instances) create at most one request", async () => {
    const bot = await loadAutopickBotModules(true);

    // 05:00 UTC == 10:00 Asia/Almaty (fixed UTC+5, no DST). A fixed
    // far-future date keeps this slot's key unique across test runs.
    const almatyTenAm = new Date(Date.UTC(2031, 0, 16, 5, 0, 0));

    const before = await prisma.request.count({ where: { source: "autopick_bot" } });
    await Promise.all([
      bot.scheduler.runSchedulerTick(almatyTenAm),
      bot.scheduler.runSchedulerTick(almatyTenAm),
      bot.scheduler.runSchedulerTick(almatyTenAm),
    ]);
    const after = await prisma.request.count({ where: { source: "autopick_bot" } });

    expect(after - before).toBe(1);
  });

  it("a redeploy/restart replaying the same slot's tick does not create a second request", async () => {
    const bot = await loadAutopickBotModules(true);
    const almatyTenAm = new Date(Date.UTC(2031, 0, 17, 5, 0, 0));

    const before = await prisma.request.count({ where: { source: "autopick_bot" } });
    await bot.scheduler.runSchedulerTick(almatyTenAm);
    // Simulates the process restarting and a fresh tick landing on the
    // same already-claimed slot.
    await bot.scheduler.runSchedulerTick(almatyTenAm);
    const after = await prisma.request.count({ where: { source: "autopick_bot" } });

    expect(after - before).toBe(1);
  });
});
