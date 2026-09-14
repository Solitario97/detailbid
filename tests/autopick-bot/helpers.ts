import { vi } from "vitest";

/**
 * Dynamically (re-)imports the AutoPickBot modules AFTER setting
 * AUTOPICK_BOT_ENABLED in process.env, so the modules' own `env` snapshot
 * (computed once at import time in src/lib/env.ts) reflects the value this
 * test wants — a plain top-level `import` would run before any test code,
 * always seeing whatever AUTOPICK_BOT_ENABLED was at file-load time.
 *
 * Safe to call multiple times / across test files: `@/lib/prisma` caches
 * its PrismaClient on `globalThis`, so re-importing the module graph after
 * `vi.resetModules()` never creates a second DB connection — every import
 * of "@/lib/prisma" anywhere (including tests/helpers/factory.ts, loaded
 * normally) resolves to the same client instance.
 */
export async function loadAutopickBotModules(enabled: boolean) {
  vi.resetModules();
  process.env.AUTOPICK_BOT_ENABLED = enabled ? "true" : "false";

  const [service, cleanup, scheduler, lock, config, envMod] = await Promise.all([
    import("@/modules/autopick-bot/service"),
    import("@/modules/autopick-bot/cleanup"),
    import("@/modules/autopick-bot/scheduler"),
    import("@/modules/autopick-bot/lock"),
    import("@/modules/autopick-bot/config"),
    import("@/lib/env"),
  ]);

  return { service, cleanup, scheduler, lock, config, env: envMod.env };
}
