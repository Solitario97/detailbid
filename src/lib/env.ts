// Small typed accessor around process.env with sane MVP defaults.
// Centralizing this avoids `process.env.FOO!` scattered across the codebase.

function optionalString(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

function optionalInt(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  authSecret: optionalString(
    "AUTH_SECRET",
    "dev-insecure-secret-change-me-dev-insecure-secret-change-me"
  ),
  appUrl: optionalString("APP_URL", "http://localhost:3000"),
  requestTtlDays: optionalInt("REQUEST_TTL_DAYS", 7),
  analyticsMinImpressionsForConversionRanking: optionalInt(
    "ANALYTICS_MIN_IMPRESSIONS_FOR_CONVERSION_RANKING",
    20
  ),
  storageDriver: optionalString("STORAGE_DRIVER", "local") as "local" | "s3",
};
