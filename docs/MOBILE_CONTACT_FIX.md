# Mobile contact buttons + mobile layout fixes (2026-09-14)

Two bugs, found by reproducing the exact scenarios reported, not by
guessing at CSS. Both fixes are scoped to the client-facing pages; no
business logic (matching, limits, admin, auth) was touched.

## Bug 1: WhatsApp / Позвонить did nothing

### What was checked first, and ruled out

The report's own hypothesis was that the offer/company data returned after
restoring a request (closed tab -> new tab -> auto-redirect, see the
client-request-persistence fix from earlier the same day) might be a
different, contact-data-stripped shape compared to right after creating the
request. Read the code path end to end for both cases:

- "fresh" flow: wizard submits -> `router.push("/r/{publicId}?t=...")`
- "restored" flow: `HomeGate` verifies the localStorage pointer -> calls
  the SAME `GET /api/client/requests/[publicId]` used by the request page
  itself -> `router.replace("/r/{publicId}?t=...")`

Both land on the exact same `src/app/r/[publicId]/page.tsx`, which always
calls `getRequestByPublicIdAndToken` + `listActiveOffersForRequest` +
`toOfferPublicDTO` the same way regardless of how the visitor arrived.
`tests/offers/outbound-click-urls.test.ts` pins this down with a test that
reads the same request/offers twice (simulating "fresh" vs "restored") and
asserts the DTOs are `toEqual` each other. **The backend data was never the
problem.**

### The actual root cause

`OfferCard.handleOutbound` (as it existed before this fix):

```tsx
async function handleOutbound(type) {
  setClicking(type);
  const url = await onOutboundClick(offer.id, type); // <- network round-trip
  setClicking(null);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
```

This calls `window.open()` **after an `await`** inside an async click
handler. Once a microtask/network round-trip happens between the user's tap
and the `window.open()` call, the browser can no longer prove the call is a
direct result of that tap ("transient activation" has lapsed). Mobile
Safari enforces this strictly and silently drops the call -- no error, no
console warning, nothing. This is a browser-level restriction, not a bug in
the data or in `buildOutboundUrl`'s phone-normalization logic (which was
already correct).

`tel:` links opened via `window.open()` have the same problem: some mobile
browsers refuse to hand a non-http(s) scheme to `window.open` at all, on
top of the popup-timing issue.

### The fix

- New `src/lib/contact-links.ts`: framework-agnostic `buildTelUrl`,
  `buildWhatsAppUrl`, `buildInstagramUrl`, `buildTwoGisUrl`. Same
  normalization rules as before (strip formatting characters; WhatsApp
  falls back to the phone number when no dedicated WhatsApp number is set;
  never produces a link from `null`/empty data), now shared by both sides
  instead of duplicated.
- `src/modules/offers/service.ts`'s `buildOutboundUrl` now delegates to
  this shared module (used to log analytics against the same URL shape as
  before -- no behavior change there).
- `src/components/client/offer-card.tsx`: WhatsApp/Call/Instagram/2GIS are
  now real `<a href="...">` elements. The href is computed **synchronously**
  from the contact data already sitting in React state (revealed once, via
  the existing "Связаться" button) -- there is no `await` between the tap
  and the browser following the link, because there is no JS-driven
  navigation at all. A button is not rendered when the corresponding field
  is missing (hidden, not a dead disabled-looking button).
- Analytics tracking (`onOutboundClick`) is still called on click, but it's
  fire-and-forget: `client-request-view.tsx` now uses
  `navigator.sendBeacon` (falling back to `fetch(..., { keepalive: true })`)
  so the tracking ping survives the page losing focus the instant the OS
  hands off to WhatsApp/the dialer, without ever gating navigation on it.

## Bug 2: mobile horizontal overflow / "wobble"

### How it was actually found

Static review of every page (`grep` for `100vw`, fixed pixel widths,
negative margins, `translate-x`, etc.) turned up nothing -- none of that
exists in this codebase. A programmatic sweep (an offscreen same-origin
iframe pinned to 320/360/375/390/430px, comparing
`document.documentElement.scrollWidth` to the iframe width, then walking
every element's `getBoundingClientRect()` to find the offender) also came
back clean **for the pages as they render with short/placeholder data**.

The bug only shows up with real content: injecting a synthetic offer card
with a long, single-word (no spaces) company name into the live request
page at 320px reproduced a 511px horizontal overflow. Root cause, in two
related but distinct places:

1. `OfferCard`'s header (`<div className="flex items-center gap-3">`
   wrapping the logo + company name) is a flex row with no `min-w-0` on
   either the row or the text's wrapper `<div>`. Flexbox's default
   `min-width: auto` lets an unbreakable child force the whole row wider
   than its container instead of shrinking/wrapping it.
2. Plain text nodes (`offer.comment`, `offer.guarantee`,
   `request.comment`, the car brand/model heading) had no
   `overflow-wrap`/`break-words`. A single long "word" (a long business
   name, a comment with no spaces, a pasted link) doesn't grow its own
   block box -- it just visually overflows the box -- but that overflow
   still counts toward the document's scrollable width, which is exactly
   what makes the page feel "loose" and draggable sideways on a phone.

This is why the bug felt intermittent: it only appears for certain
real-world content (long company names, long comments), not on every page
load with short test data -- which also matches why it wasn't easy to spot
by eye.

### The fix

- `min-w-0` added to the flex containers around variable-length text in
  `offer-card.tsx`.
- `break-words` (`overflow-wrap: break-word`) added to: the company name,
  the offer comment, the offer guarantee, the request's car brand/model
  heading, and the request comment. This only kicks in when a single word
  genuinely doesn't fit -- normal text with spaces wraps exactly as before.
- Verified directly against the live production DOM/CSS (same fonts, same
  box model) by injecting both the "broken" and "fixed" markup into an
  offscreen iframe at 320px and confirming `scrollWidth` overflow goes from
  511px to 0px.
- `src/app/globals.css` gained `html, body { max-width: 100% }` as
  defense-in-depth only -- explicitly **not** `overflow-x: hidden`, which
  would have silently masked this class of bug instead of the real fix
  above surfacing and eliminating it.

### "С пробегом" wrapping

Unrelated to the scrolling bug (a pure line-break issue, not overflow):
`request-summary-card.tsx`'s condition/city meta row rendered three
`<span>`s in a `flex flex-wrap` row with no `white-space` control, so
"С пробегом" could break between "С" and "пробегом" whenever the row ran
out of room. Each label now has `whitespace-nowrap` (kept scoped to just
those three short spans, not applied globally), while the row itself stays
`flex-wrap` so a whole label can still drop to the next line as one piece
on very narrow screens instead of splitting mid-word.
