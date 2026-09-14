import { describe, it, expect, beforeEach, vi } from "vitest";

const STORAGE_KEY = "autopick_active_request";

function makeFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };
}

describe("client-request-storage: persistent pointer to the active request", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("save() then read() round-trips exactly {publicId, token} — nothing else", async () => {
    vi.stubGlobal("window", {
      localStorage: makeFakeLocalStorage(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const mod = await import("@/lib/client-request-storage");

    mod.saveActiveRequest("pub-123", "tok-456");

    expect(mod.readActiveRequest()).toEqual({ publicId: "pub-123", token: "tok-456" });

    // Spec requirement: never store the request/offers/price/status/company
    // data — only the minimal identifier+token needed to restore access.
    const raw = (window as unknown as { localStorage: Storage }).localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(Object.keys(parsed).sort()).toEqual(["publicId", "token"]);
  });

  it("survives being read back by a completely fresh module load (simulates a new tab)", async () => {
    const shared = makeFakeLocalStorage();
    vi.stubGlobal("window", { localStorage: shared, addEventListener: vi.fn(), removeEventListener: vi.fn() });

    const firstLoad = await import("@/lib/client-request-storage");
    firstLoad.saveActiveRequest("pub-abc", "tok-xyz");

    // A new tab has its own JS runtime (fresh module graph) but the SAME
    // origin localStorage — resetModules() + re-import simulates that.
    vi.resetModules();
    vi.stubGlobal("window", { localStorage: shared, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const secondLoad = await import("@/lib/client-request-storage");

    expect(secondLoad.readActiveRequest()).toEqual({ publicId: "pub-abc", token: "tok-xyz" });
  });

  it("clearActiveRequest() removes the pointer", async () => {
    vi.stubGlobal("window", {
      localStorage: makeFakeLocalStorage(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const mod = await import("@/lib/client-request-storage");

    mod.saveActiveRequest("pub-123", "tok-456");
    mod.clearActiveRequest();

    expect(mod.readActiveRequest()).toBeNull();
  });

  it("malformed JSON in storage is treated as 'nothing stored', not a crash", async () => {
    const fake = makeFakeLocalStorage();
    fake.setItem(STORAGE_KEY, "{ not valid json");
    vi.stubGlobal("window", { localStorage: fake, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const mod = await import("@/lib/client-request-storage");

    expect(mod.readActiveRequest()).toBeNull();
  });

  it("a well-formed but incomplete object is rejected", async () => {
    const fake = makeFakeLocalStorage();
    fake.setItem(STORAGE_KEY, JSON.stringify({ publicId: "only-this-field" }));
    vi.stubGlobal("window", { localStorage: fake, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const mod = await import("@/lib/client-request-storage");

    expect(mod.readActiveRequest()).toBeNull();
  });

  it("never touches storage when window is unavailable (SSR)", async () => {
    // No vi.stubGlobal here — `window` stays undefined, as on the server.
    const mod = await import("@/lib/client-request-storage");

    expect(mod.readActiveRequest()).toBeNull();
    expect(() => mod.saveActiveRequest("a", "b")).not.toThrow();
    expect(() => mod.clearActiveRequest()).not.toThrow();
  });
});
