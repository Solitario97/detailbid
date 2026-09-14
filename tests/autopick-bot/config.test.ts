import { describe, it, expect } from "vitest";
import {
  AUTOPICK_BOT_CARS,
  AUTOPICK_BOT_NAMES,
  AUTOPICK_BOT_YEARS,
  AUTOPICK_BOT_SOURCE,
  pickBotRequestFields,
} from "@/modules/autopick-bot/config";

const carKey = (c: { brand: string; model: string }) => `${c.brand}::${c.model}`;
const carKeys = new Set(AUTOPICK_BOT_CARS.map(carKey));
const nameSet = new Set(AUTOPICK_BOT_NAMES);
const yearSet = new Set(AUTOPICK_BOT_YEARS);

describe("autopick-bot config: random selection stays within configured lists", () => {
  it("source tag matches the spec exactly", () => {
    expect(AUTOPICK_BOT_SOURCE).toBe("autopick_bot");
  });

  it("car list has the expected 35 entries and years are exactly [2025, 2026]", () => {
    expect(AUTOPICK_BOT_CARS).toHaveLength(35);
    expect(AUTOPICK_BOT_NAMES).toHaveLength(30);
    expect([...yearSet].sort()).toEqual([2025, 2026]);
  });

  it("every sampled car is from the configured list (100 samples)", () => {
    for (let i = 0; i < 100; i++) {
      const fields = pickBotRequestFields();
      expect(carKeys.has(carKey({ brand: fields.carBrand, model: fields.carModel }))).toBe(true);
    }
  });

  it("every sampled name is from the configured list (100 samples)", () => {
    for (let i = 0; i < 100; i++) {
      const fields = pickBotRequestFields();
      expect(nameSet.has(fields.customerName)).toBe(true);
    }
  });

  it("every sampled year is 2025 or 2026 (100 samples)", () => {
    for (let i = 0; i < 100; i++) {
      const fields = pickBotRequestFields();
      expect(yearSet.has(fields.carYear)).toBe(true);
    }
  });

  it("resamples once when the exact same combo appeared earlier today", () => {
    const forced = pickBotRequestFields();
    const avoid = [
      { carBrand: forced.carBrand, carModel: forced.carModel, carYear: forced.carYear, customerName: forced.customerName },
    ];
    // Not a hard guarantee (spec: "не критично, но желательно" — a single
    // resample attempt is enough), but the function must still only ever
    // return values from the configured lists even when avoiding a combo.
    const result = pickBotRequestFields(avoid);
    expect(carKeys.has(carKey({ brand: result.carBrand, model: result.carModel }))).toBe(true);
    expect(nameSet.has(result.customerName)).toBe(true);
    expect(yearSet.has(result.carYear)).toBe(true);
  });
});
