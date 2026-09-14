// ---------------------------------------------------------------------------
// Distributed lock / idempotency for the twice-daily scheduler slots.
//
// Why a job-execution table instead of a Postgres advisory lock or Redis:
// this app has no Redis anywhere in its stack (see docs/ARCHITECTURE.md —
// "no microservices, no message queue"), and a session-scoped advisory
// lock (pg_advisory_lock) only protects work that happens *while a single
// DB connection is held* — awkward for an async flow that then goes on to
// call the notifier and create several related rows. A plain table with a
// UNIQUE column, claimed via INSERT, gives the same "exactly one winner"
// guarantee as an advisory lock but as a durable, auditable row that
// survives independently of any connection/transaction lifetime, and it
// fits the existing "everything is a Prisma model" architecture exactly.
//
// Usage: every instance's scheduler tick computes the *same* key for the
// current slot (see scheduler.ts) and calls tryClaimJobSlot(key) before
// doing anything else. Only the instance whose INSERT wins proceeds; every
// other instance (or a later tick for the same slot, e.g. after a
// redeploy) gets `false` and does nothing. Slots are never released or
// retried — a slot is claimed at most once, ever.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export function buildSlotKey(date: string, hour: number): string {
  const hh = String(hour).padStart(2, "0");
  return `autopick_bot:${date}:${hh}`;
}

/**
 * Attempts to claim a one-time execution slot. Returns true if this call
 * won the slot (no one else has claimed it before), false if it was
 * already claimed — by another instance, or by an earlier tick of this
 * same instance (e.g. the process ticks every minute but a slot's window
 * is several minutes wide).
 */
export async function tryClaimJobSlot(key: string): Promise<boolean> {
  try {
    await prisma.botJobExecution.create({ data: { key } });
    return true;
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
      return false;
    }
    throw err;
  }
}
