// ---------------------------------------------------------------------------
// AutoPickBot request creation.
//
// This deliberately does NOT reimplement any part of request creation. It
// builds a normal `CreateRequestInput` (validated through the exact same
// `createRequestSchema` the public API uses) and calls the exact same
// `createRequest` / `notifyCompaniesOfNewRequest` functions that
// `POST /api/requests` calls — see src/app/api/requests/route.ts. The only
// difference from a real request is `source: AUTOPICK_BOT_SOURCE`, which:
//   - is stored on the row (for logs/debugging/cleanup only), and
//   - is never read by anything that changes behavior — no `if (source ===
//     ...)` branch exists anywhere in the statistics, matching, offers, or
//     notification code paths.
// Every downstream effect a real request triggers (AnalyticsEvent
// REQUEST_CREATED row, NEW_REQUEST notifications to approved companies,
// eligibility for company matching/offers, counting in admin dashboard
// stats) therefore happens for bot requests exactly as it does for real
// ones, for free, because it is the same code.
// ---------------------------------------------------------------------------

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { createRequestSchema } from "@/modules/requests/types";
import { createRequest, notifyCompaniesOfNewRequest } from "@/modules/requests/service";
import { listCities, listActiveServices } from "@/modules/catalog/service";
import { AUTOPICK_BOT_PHONE, AUTOPICK_BOT_SOURCE, pickBotRequestFields } from "./config";
import { logCreateFailed, logRequestCreated } from "./log";

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Bot requests created in roughly the last day, used only to steer the
 * random picker away from repeating an identical (brand, model, year,
 * name) combo within the same day — a "nice to have" per spec, not a
 * correctness requirement, so a simple rolling window is enough (no need
 * for exact Asia/Almaty midnight-boundary math here).
 */
async function getRecentBotCombos() {
  const since = new Date(Date.now() - 15 * 60 * 60 * 1000);
  return prisma.request.findMany({
    where: { source: AUTOPICK_BOT_SOURCE, createdAt: { gte: since } },
    select: { carBrand: true, carModel: true, carYear: true, customerName: true },
  });
}

/**
 * Creates one synthetic request through the real production flow. Safe to
 * call at any time: no-ops (and logs nothing) when the bot is disabled,
 * and never throws — any failure is caught and logged via
 * `[AutoPickBot] Failed to create request` so a bad tick can never crash
 * the scheduler or the app.
 */
export async function runAutopickBotCreate(): Promise<void> {
  if (!env.autopickBotEnabled) return;

  try {
    const [cities, services, recentCombos] = await Promise.all([
      listCities(),
      listActiveServices(),
      getRecentBotCombos(),
    ]);

    if (cities.length === 0) throw new Error("no cities in catalog to attach a bot request to");
    if (services.length === 0) throw new Error("no active services in catalog to attach a bot request to");

    const city = pickOne(cities);
    const service = pickOne(services);
    const fields = pickBotRequestFields(recentCombos);

    const input = createRequestSchema.parse({
      cityId: city.id,
      serviceIds: [service.id],
      carBrand: fields.carBrand,
      carModel: fields.carModel,
      carYear: fields.carYear,
      carCondition: fields.carCondition,
      customerName: fields.customerName,
      customerPhone: AUTOPICK_BOT_PHONE,
    });

    const { request: created } = await createRequest(input, { source: AUTOPICK_BOT_SOURCE });

    // Same call the real POST /api/requests route makes. Awaited (unlike
    // the route's fire-and-forget `void ...`) and wrapped in its own
    // try/catch so a notifier failure is logged but can never make this
    // whole tick look like "request creation failed" — the request itself
    // is already committed and fully real at this point.
    try {
      await notifyCompaniesOfNewRequest(created.id, created.carBrand, created.carModel);
    } catch (notifyErr) {
      console.error("[AutoPickBot] notifyCompaniesOfNewRequest failed for bot request", created.id, notifyErr);
    }

    logRequestCreated({
      requestId: created.id,
      name: created.customerName,
      vehicle: `${created.carBrand} ${created.carModel}`,
      year: created.carYear,
      createdAt: created.createdAt,
    });
  } catch (err) {
    logCreateFailed(err);
  }
}
