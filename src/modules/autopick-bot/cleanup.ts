// ---------------------------------------------------------------------------
// AutoPickBot 24h cleanup.
//
// Deletes ONLY rows with source="autopick_bot" whose createdAt is at least
// 24h in the past, one at a time, through `deleteRequestById` — the exact
// same deletion path (relying on the schema's cascading relations) that
// would be used to delete any Request. A real user's request (source=
// "user", the default) is never touched: the WHERE clause below hard-codes
// `source: AUTOPICK_BOT_SOURCE` and nothing in this file ever queries or
// deletes by any other criterion.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/prisma";
import { deleteRequestById } from "@/modules/requests/service";
import { AUTOPICK_BOT_SOURCE } from "./config";
import { logDeleteFailed, logRequestDeleted } from "./log";

const BOT_REQUEST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Finds and deletes every bot-created request older than 24h. Never
 * throws — each row is deleted independently so one failure doesn't stop
 * the rest of the batch, and any failure to even list candidate rows is
 * caught and logged rather than propagated (a cleanup bug must never take
 * the app down).
 */
export async function runAutopickBotCleanup(): Promise<void> {
  let candidates: { id: string }[];
  try {
    const cutoff = new Date(Date.now() - BOT_REQUEST_MAX_AGE_MS);
    candidates = await prisma.request.findMany({
      where: { source: AUTOPICK_BOT_SOURCE, createdAt: { lte: cutoff } },
      select: { id: true },
    });
  } catch (err) {
    logDeleteFailed(err);
    return;
  }

  for (const candidate of candidates) {
    try {
      const deleted = await deleteRequestById(candidate.id);
      if (deleted) {
        logRequestDeleted({ requestId: deleted.id, createdAt: deleted.createdAt, deletedAt: new Date() });
      }
      // deleted === null means another instance already removed this row
      // between the findMany above and this delete — nothing to log, and
      // definitely not an error (this is exactly what the lock-free,
      // idempotent delete path is designed to tolerate).
    } catch (err) {
      logDeleteFailed(err);
    }
  }
}
