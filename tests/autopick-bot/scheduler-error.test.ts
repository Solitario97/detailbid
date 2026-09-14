import { describe, it, expect, vi } from "vitest";

describe("autopick-bot scheduler: a tick error must never crash the backend", () => {
  it("runSchedulerTickSafely resolves (does not throw) even if the lock layer fails", async () => {
    vi.resetModules();
    process.env.AUTOPICK_BOT_ENABLED = "true";

    vi.doMock("@/modules/autopick-bot/lock", () => ({
      buildSlotKey: (date: string, hour: number) => `autopick_bot:${date}:${String(hour).padStart(2, "0")}`,
      tryClaimJobSlot: () => {
        throw new Error("simulated DB outage");
      },
    }));

    const { runSchedulerTickSafely } = await import("@/modules/autopick-bot/scheduler");

    // 05:00 UTC == 10:00 Asia/Almaty (fixed UTC+5, no DST) — inside the
    // scheduler's claim window, so this tick will exercise the (mocked,
    // throwing) lock path.
    const almatyTenAm = new Date(Date.UTC(2031, 0, 15, 5, 0, 0));

    await expect(runSchedulerTickSafely(almatyTenAm)).resolves.toBeUndefined();

    vi.doUnmock("@/modules/autopick-bot/lock");
    vi.resetModules();
  });
});
