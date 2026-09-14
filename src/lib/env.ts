// Small typed accessor around process.env with sane MVP defaults.
// Centralizing this avoids `process.env.FOO!` scattered across the codebase.

import path from "path";

function optionalString(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function optionalInt(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function optionalBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v === "true" || v === "1";
}

// Railway's own template variable (e.g. APP_URL=${{RAILWAY_PUBLIC_DOMAIN}})
// resolves to a bare hostname with no scheme, which crashes `new URL(...)`
// (see src/app/layout.tsx). Normalize defensively instead of trusting the
// env var to already include "https://".
function normalizeAbsoluteUrl(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export const env = {
  authSecret: optionalString(
    "AUTH_SECRET",
    "dev-insecure-secret-change-me-dev-insecure-secret-change-me"
  ),
  appUrl: normalizeAbsoluteUrl(optionalString("APP_URL", "http://localhost:3000")),
  requestTtlDays: optionalInt("REQUEST_TTL_DAYS", 7),
  analyticsMinImpressionsForConversionRanking: optionalInt(
    "ANALYTICS_MIN_IMPRESSIONS_FOR_CONVERSION_RANKING",
    20
  ),
  storageDriver: optionalString("STORAGE_DRIVER", "local") as "local" | "s3",
  // Absolute directory LocalFileStorage writes to and the /uploads route
  // reads from. MUST be set to a Railway Volume mount path (e.g.
  // "/data/uploads") in production — the container filesystem is ephemeral
  // and anything written outside a mounted volume is lost on redeploy,
  // restart, or when a new instance is scheduled. Defaults to
  // "<repo>/public/uploads" for local dev only.
  uploadsDir: optionalString("UPLOADS_DIR", path.join(process.cwd(), "public", "uploads")),

  // AutoPickBot: synthetic-traffic scheduler (see src/modules/autopick-bot).
  // Disabled by default everywhere (including tests) — must be explicitly
  // opted into per environment.
  autopickBotEnabled: optionalBool("AUTOPICK_BOT_ENABLED", false),
  autopickBotTimezone: optionalString("AUTOPICK_BOT_TIMEZONE", "Asia/Almaty"),
};
