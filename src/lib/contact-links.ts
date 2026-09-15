// ---------------------------------------------------------------------------
// Turns a company's raw phone / WhatsApp / Instagram contact fields into
// launchable links (tel:, https://wa.me/..., https://instagram.com/...).
//
// This is framework-agnostic (no server-only or DOM-only imports) so it can
// be imported from BOTH:
//   - the backend (modules/offers/service.ts), which used to have its own
//     copy of this logic inline in `buildOutboundUrl` and used it only to
//     decide what URL to log/return from the outbound-click endpoint, and
//   - the client (components/client/offer-card.tsx), which now renders
//     real <a href="tel:..."> / <a href="https://wa.me/..."> elements
//     computed synchronously from the already-revealed contact fields,
//     instead of fetching a URL from the backend and calling
//     `window.open()` on it after an `await` — see docs/MOBILE_CONTACT_FIX.md
//     for why that broke WhatsApp/Call on mobile Safari and Chrome.
//
// Having one shared implementation means the URL a click is *tracked*
// against (backend) and the URL the button actually *navigates* to
// (frontend) can never drift apart.
// ---------------------------------------------------------------------------

/** Digits-and-leading-plus only, suitable for a `tel:` link. Never adds a
 * country code that isn't already there — it only strips formatting
 * characters (spaces, parentheses, dashes, ...) from what the company
 * entered. */
export function normalizePhoneForTel(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = phone.replace(/[^0-9+]/g, "");
  return normalized || null;
}

export function buildTelUrl(phone: string | null | undefined): string | null {
  const normalized = normalizePhoneForTel(phone);
  return normalized ? `tel:${normalized}` : null;
}

/** Digits only (wa.me does not accept a leading "+"). */
export function normalizePhoneForWhatsApp(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  return digits || null;
}

/**
 * Builds a wa.me link from the company's dedicated WhatsApp number when set,
 * falling back to their regular phone number otherwise (never both — this
 * never concatenates or duplicates digits, it just picks one source).
 */
export function buildWhatsAppUrl(
  whatsapp: string | null | undefined,
  phoneFallback?: string | null
): string | null {
  const digits = normalizePhoneForWhatsApp(whatsapp) ?? normalizePhoneForWhatsApp(phoneFallback);
  return digits ? `https://wa.me/${digits}` : null;
}

export function buildInstagramUrl(instagram: string | null | undefined): string | null {
  if (!instagram) return null;
  const trimmed = instagram.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("http") ? trimmed : `https://instagram.com/${trimmed.replace(/^@/, "")}`;
}

export function buildTwoGisUrl(twoGisUrl: string | null | undefined): string | null {
  return twoGisUrl && twoGisUrl.trim() ? twoGisUrl : null;
}
