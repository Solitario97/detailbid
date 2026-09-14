// ---------------------------------------------------------------------------
// AutoPickBot configuration: everything that is a plain data list lives
// here so it can be extended later (more cars, more names, a wider year
// range) without touching any logic in service.ts / cleanup.ts /
// scheduler.ts.
//
// This module has zero side effects and does not touch Prisma/env — it is
// pure data + pure random-selection helpers, which also makes it trivial
// to unit test in isolation (tests/autopick-bot/config.test.ts).
// ---------------------------------------------------------------------------

/** The exact tag stored in `Request.source` for bot-created requests. */
export const AUTOPICK_BOT_SOURCE = "autopick_bot";

/**
 * Obviously-technical phone number for bot requests. "+7 000 ..." is not a
 * number any Kazakhstani mobile operator issues (real mobile prefixes are
 * 700-708 / 747 / 750-761 / 775-778) and is not a working landline either —
 * it can never collide with, or accidentally dial, a real person. Requests
 * created by the bot must have *a* value here because customerPhone is a
 * required field end-to-end (schema + DB), but nothing about the value
 * needs to be dialable since these requests are deleted within 24h and are
 * indistinguishable from real ones to any human reading the UI.
 */
export const AUTOPICK_BOT_PHONE = "+70000000000";

export interface BotCar {
  brand: string;
  model: string;
}

// prettier-ignore
export const AUTOPICK_BOT_CARS: BotCar[] = [
  { brand: "Lexus", model: "RX" },
  { brand: "Toyota", model: "Camry" },
  { brand: "Toyota", model: "RAV4" },
  { brand: "Toyota", model: "Highlander" },
  { brand: "Toyota", model: "Land Cruiser Prado" },
  { brand: "Toyota", model: "Land Cruiser 300" },
  { brand: "Hyundai", model: "Tucson" },
  { brand: "Hyundai", model: "Santa Fe" },
  { brand: "Hyundai", model: "Palisade" },
  { brand: "Hyundai", model: "Sonata" },
  { brand: "Hyundai", model: "Elantra" },
  { brand: "Kia", model: "Sportage" },
  { brand: "Kia", model: "K5" },
  { brand: "Kia", model: "Sorento" },
  { brand: "Kia", model: "Carnival" },
  { brand: "Kia", model: "K8" },
  { brand: "Kia", model: "K9" },
  { brand: "Haval", model: "H6" },
  { brand: "Haval", model: "H6 GT" },
  { brand: "Haval", model: "Dargo" },
  { brand: "Haval", model: "H9" },
  { brand: "Tank", model: "300" },
  { brand: "Tank", model: "500" },
  { brand: "Geely", model: "Atlas" },
  { brand: "Geely", model: "Monjaro" },
  { brand: "Geely", model: "Okavango" },
  { brand: "Changan", model: "CS75 Plus" },
  { brand: "Changan", model: "UNI-K" },
  { brand: "Changan", model: "UNI-V" },
  { brand: "Jetour", model: "Dashing" },
  { brand: "Jetour", model: "X70 Plus" },
  { brand: "Jetour", model: "X90 Plus" },
  { brand: "Jetour", model: "T2" },
  { brand: "Exeed", model: "TXL" },
  { brand: "Exeed", model: "VX" },
];

export const AUTOPICK_BOT_NAMES: string[] = [
  "Алихан", "Айдар", "Нурлан", "Данияр", "Арман",
  "Ерлан", "Тимур", "Алишер", "Санжар", "Мади",
  "Аскар", "Бекзат", "Рустам", "Азамат", "Олжас",
  "Арсен", "Эмир", "Дамир", "Самат", "Ринат",
  "Александр", "Максим", "Никита", "Артём", "Михаил",
  "Даниил", "Марк", "Давид", "Роман", "Андрей",
];

export const AUTOPICK_BOT_YEARS: number[] = [2025, 2026];

export const AUTOPICK_BOT_CAR_CONDITIONS: Array<"NEW" | "USED"> = ["NEW", "USED"];

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export interface BotRequestFields {
  carBrand: string;
  carModel: string;
  carYear: number;
  customerName: string;
  carCondition: "NEW" | "USED";
}

function sampleBotRequestFields(): BotRequestFields {
  const car = pickOne(AUTOPICK_BOT_CARS);
  return {
    carBrand: car.brand,
    carModel: car.model,
    carYear: pickOne(AUTOPICK_BOT_YEARS),
    customerName: pickOne(AUTOPICK_BOT_NAMES),
    carCondition: pickOne(AUTOPICK_BOT_CAR_CONDITIONS),
  };
}

function isSameCombo(a: BotRequestFields, b: { carBrand: string; carModel: string; carYear: number | null; customerName: string }): boolean {
  return a.carBrand === b.carBrand && a.carModel === b.carModel && a.carYear === b.carYear && a.customerName === b.customerName;
}

/**
 * Randomly picks car/year/name/condition for a new bot request. If
 * `avoidCombos` (today's already-created bot requests) contains an exact
 * (brand, model, year, name) match, resamples once — per spec this is a
 * "nice to have", not a hard guarantee, so we don't loop indefinitely.
 */
export function pickBotRequestFields(
  avoidCombos: Array<{ carBrand: string; carModel: string; carYear: number | null; customerName: string }> = []
): BotRequestFields {
  const first = sampleBotRequestFields();
  if (avoidCombos.length === 0 || !avoidCombos.some((c) => isSameCombo(first, c))) {
    return first;
  }
  return sampleBotRequestFields();
}
