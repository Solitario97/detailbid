import { describe, it, expect } from "vitest";
import {
  buildTelUrl,
  buildWhatsAppUrl,
  buildInstagramUrl,
  buildTwoGisUrl,
  normalizePhoneForTel,
  normalizePhoneForWhatsApp,
} from "@/lib/contact-links";

// Regression coverage for the "WhatsApp / Call do nothing on mobile" bug:
// the root cause was NOT bad phone data (these builders were already
// correct) but OfferCard driving navigation through `window.open()` after
// an `await`, which mobile Safari/Chrome silently block. These tests pin
// down the URL-building contract that the client now relies on directly
// (synchronously, at render time) to render real <a href> links.

describe("contact-links: tel: URLs", () => {
  it("normalizes a formatted phone number, keeping a leading +", () => {
    expect(normalizePhoneForTel("+7 701 000 00 00")).toBe("+77010000000");
    expect(buildTelUrl("+7 701 000 00 00")).toBe("tel:+77010000000");
  });

  it("strips parentheses and dashes", () => {
    expect(buildTelUrl("+7 (701) 000-00-00")).toBe("tel:+77010000000");
  });

  it("never builds a link from missing/empty phone data", () => {
    expect(buildTelUrl(null)).toBeNull();
    expect(buildTelUrl(undefined)).toBeNull();
    expect(buildTelUrl("")).toBeNull();
    expect(buildTelUrl("   ")).toBeNull();
  });
});

describe("contact-links: wa.me URLs", () => {
  it("strips formatting characters and the leading + (wa.me wants digits only)", () => {
    expect(normalizePhoneForWhatsApp("+7 701 000 00 00")).toBe("77010000000");
    expect(buildWhatsAppUrl("+7 701 000 00 00")).toBe("https://wa.me/77010000000");
  });

  it("does not duplicate the country code when it's already present", () => {
    // A company that already stored the number with its country code must
    // not end up with it doubled (e.g. "7777010000000").
    const url = buildWhatsAppUrl("+77010000000");
    expect(url).toBe("https://wa.me/77010000000");
    expect(url?.match(/7{3,}/)).toBeNull();
  });

  it("falls back to the regular phone when whatsapp is not set", () => {
    expect(buildWhatsAppUrl(null, "+7 701 000 00 00")).toBe("https://wa.me/77010000000");
    expect(buildWhatsAppUrl(undefined, "+7 701 000 00 00")).toBe("https://wa.me/77010000000");
  });

  it("prefers the dedicated whatsapp number over the phone fallback", () => {
    expect(buildWhatsAppUrl("+7 702 222 22 22", "+7 701 000 00 00")).toBe("https://wa.me/77022222222");
  });

  it("never builds a link when neither whatsapp nor phone is set", () => {
    expect(buildWhatsAppUrl(null, null)).toBeNull();
    expect(buildWhatsAppUrl(undefined, undefined)).toBeNull();
    expect(buildWhatsAppUrl("", "")).toBeNull();
  });
});

describe("contact-links: Instagram / 2GIS", () => {
  it("builds a profile URL from a bare handle", () => {
    expect(buildInstagramUrl("detailpro.kz")).toBe("https://instagram.com/detailpro.kz");
  });

  it("strips a leading @", () => {
    expect(buildInstagramUrl("@detailpro.kz")).toBe("https://instagram.com/detailpro.kz");
  });

  it("passes an already-full URL through unchanged", () => {
    expect(buildInstagramUrl("https://instagram.com/detailpro.kz")).toBe("https://instagram.com/detailpro.kz");
  });

  it("returns null for missing instagram/2GIS data instead of an empty link", () => {
    expect(buildInstagramUrl(null)).toBeNull();
    expect(buildInstagramUrl("")).toBeNull();
    expect(buildTwoGisUrl(null)).toBeNull();
    expect(buildTwoGisUrl("")).toBeNull();
  });

  it("passes a valid 2GIS URL through unchanged", () => {
    expect(buildTwoGisUrl("https://2gis.kz/almaty/firm/detailpro")).toBe("https://2gis.kz/almaty/firm/detailpro");
  });
});
