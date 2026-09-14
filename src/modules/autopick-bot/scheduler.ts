// ---------------------------------------------------------------------------
// AutoPickBot scheduler.
//
// This project has no existing cron/queue mechanism to hook into (a single
// Next.js app, "no microservices, no message queue" — docs/ARCHITECTURE.md)
// and Railway runs it as a normal long-lived `next start` process (not a
// serverless/per-request runtime — confirmed by this app's own upload
// volume relying on the process staying up across requests). That makes a
// simple in-process interval the right fit here: no new infrastructure, no
// new dependency (not even `node-cron` — a 1-minute `setInterval` plus a
// small timezone-aware window check, below, is all "twice a day" needs).
//
// Multi-instance safety does NOT come from this file — it comes from the
// database-backed slot lock in lock.ts. Every instance runs this same
// interval independently; the `BotJobExecution` unique-key INSERT is what
// guarantees only one of them actually creates a request for a given slot,
// and only once, even across redeploys/restarts.
// ---------------------------------------------------------------------------

import { env } from "@/lib/env";
import { buildSlotKey, tryClaimJobSlot } from "./lock";
import { getTimeZonePartsAt } from "./time";
import { runAutopickBotCreate } from "./service";
import { runAutopickBotCleanup } from "./cleanup";

const TICK_INTERVAL_MS = 60_000; // check every minute
const TARGET_HOURS = [10, 19]; // 10:00 and 19:00, in env.autopickBotTimezone
const SLOT_CLAIM_WINDOW_MINUTES = 5; // claim any time in HH:00-HH:04
const CLEANUP_EVERY_N_TICKS = 5; // ~ every 5 minutes

let schedulerStarted = false;
let tickInFlight = false;
let tickCount = 0;

/**
 * Runs one scheduler check: claims and fires the current slot if we're
 * inside a target hour's claim window and no instance has claimed it yet,
 * and periodically runs the 24h cleanup. Exported (in addition to
 * `runSchedulerTickSafely`) so tests can drive a single tick deterministically.
 */
export async function runSchedulerTick(now: Date = new Date()): Promise<void> {
  if (!env.autopickBotEnabled) return; // AUTOPICK_BOT_ENABLED=false disables creation AND cleanup

  tickCount += 1;

  const { date, hour, minute } = getTimeZonePartsAt(env.autopickBotTimezone, now);

  if (TARGET_HOURS.includes(hour) && minute < SLOT_CLAIM_WINDOW_MINUTES) {
    const key = buildSlotKey(date, hour);
    const claimed = await tryClaimJobSlot(key);
    if (claimed) {
      await runAutopickBotCreate();
    }
  }

  if (tickCount % CLEANUP_EVERY_N_TICKS === 0) {
    await runAutopickBotCleanup();
  }
}

/**
 * Same as `runSchedulerTick` but never throws — a scheduler error must
 * never crash the backend process. Also guards against overlapping ticks:
 * if a tick is still running (slow DB, etc.) when the next one would
 * fire, the next one is skipped rather than piling up concurrent work.
 */
export async function runSchedulerTickSafely(now: Date = new Date()): Promise<void> {
  if (tickInFlight) return;
  tickInFlight = true;
  try {
    await runSchedulerTick(now);
  } catch (err) {
    console.error("[AutoPickBot] scheduler tick failed unexpectedly", err);
  } finally {
    tickInFlight = false;
  }
}

/**
 * Starts the in-process scheduler. Called once from src/instrumentation.ts
 * when the Next.js server boots. Idempotent per-process (a second call is
 * a no-op) and a complete no-op when AUTOPICK_BOT_ENABLED is not "true".
 */
export function startAutopickBotScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  if (!env.autopickBotEnabled) {
    console.log("[AutoPickBot] AUTOPICK_BOT_ENABLED is not true — scheduler not started");
    return;
  }

  console.log(
    `[AutoPickBot] scheduler started (timezone=${env.autopickBotTimezone}, slots=${TARGET_HOURS.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")})`
  );

  setInterval(() => {
    void runSchedulerTickSafely();
  }, TICK_INTERVAL_MS);
}
