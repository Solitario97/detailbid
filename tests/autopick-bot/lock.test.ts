import { describe, it, expect } from "vitest";
import { buildSlotKey, tryClaimJobSlot } from "@/modules/autopick-bot/lock";

function uniqueKey(label: string): string {
  return `test:${label}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

describe("autopick-bot lock: exactly-once slot claiming", () => {
  it("builds the documented key format", () => {
    expect(buildSlotKey("2026-09-14", 10)).toBe("autopick_bot:2026-09-14:10");
    expect(buildSlotKey("2026-09-14", 9)).toBe("autopick_bot:2026-09-14:09");
  });

  it("a second sequential claim of the same key is rejected", async () => {
    const key = uniqueKey("sequential");
    const first = await tryClaimJobSlot(key);
    const second = await tryClaimJobSlot(key);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("under concurrent claims for the same key (simulating multiple app instances), only one wins", async () => {
    const key = uniqueKey("concurrent");
    const results = await Promise.all([
      tryClaimJobSlot(key),
      tryClaimJobSlot(key),
      tryClaimJobSlot(key),
    ]);
    const winners = results.filter(Boolean);
    expect(winners).toHaveLength(1);
  });

  it("different keys can each be claimed independently", async () => {
    const a = await tryClaimJobSlot(uniqueKey("a"));
    const b = await tryClaimJobSlot(uniqueKey("b"));
    expect(a).toBe(true);
    expect(b).toBe(true);
  });
});
