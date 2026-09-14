// ---------------------------------------------------------------------------
// Structured console logging for AutoPickBot, in the exact shapes the
// operator needs for debugging/log-grepping. Every line is prefixed
// "[AutoPickBot]" so it's trivial to `grep` out of Railway logs.
// ---------------------------------------------------------------------------

import { AUTOPICK_BOT_SOURCE } from "./config";

export function logRequestCreated(params: {
  requestId: string;
  name: string;
  vehicle: string;
  year: number | null;
  createdAt: Date;
}): void {
  console.log(
    `[AutoPickBot] Request created request_id=${params.requestId} name=${params.name} vehicle=${params.vehicle} year=${params.year ?? ""} source=${AUTOPICK_BOT_SOURCE} created_at=${params.createdAt.toISOString()}`
  );
}

export function logCreateFailed(err: unknown): void {
  console.error("[AutoPickBot] Failed to create request", err);
}

export function logRequestDeleted(params: { requestId: string; createdAt: Date; deletedAt: Date }): void {
  const ageMs = params.deletedAt.getTime() - params.createdAt.getTime();
  const ageHours = Math.round((ageMs / (60 * 60 * 1000)) * 10) / 10;
  console.log(
    `[AutoPickBot] Request deleted request_id=${params.requestId} created_at=${params.createdAt.toISOString()} deleted_at=${params.deletedAt.toISOString()} age=${ageHours}h`
  );
}

export function logDeleteFailed(err: unknown): void {
  console.error("[AutoPickBot] Failed to delete request", err);
}
