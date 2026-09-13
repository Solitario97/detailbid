# AutoPick — Security & Privacy Model

## 1. The core invariant

**A detailing company must never receive client PII
(`customerName`, `customerPhone`, `customerWhatsapp`), in any form, at any
layer.** This is enforced structurally, not by convention:

- `modules/requests/dto.ts` defines three separate mapping functions:
  - `toPublicRequestDTO(request)` — used on the client's own private page;
    includes the client's own data back to themselves (they already have
    it) but never a company's contact info before reveal.
  - `toCompanyRequestDTO(request)` — used everywhere a company reads a
    request. Built by an explicit **allow-list** pick of fields
    (city, car info, services, comment, images, createdAt). It is
    structurally impossible for this function to leak `customerPhone`
    etc. because those fields are never read off the source object inside
    it.
  - `toAdminRequestDTO(request)` — full data, admin-only route.
- Route handlers for `/api/company/**` call the Prisma query with an
  explicit `select` that excludes `customerName/customerPhone/
  customerWhatsapp` at the database query level (defense in depth: even if
  a developer forgets the DTO mapper, the ORM query itself never fetches
  the columns).
- A regression test (`tests/security/company-no-pii.test.ts`) asserts the
  serialized JSON body of `GET /api/company/requests` and
  `GET /api/company/requests/{id}` never contains the seeded client's name
  or phone string, and that the response object has no
  `customerName/customerPhone/customerWhatsapp` keys at all.

## 2. Client contact reveal is a real backend transition, not a UI toggle

- The initial `GET /api/client/requests/{id}/offers` response
  (`OfferPublicDTO`) never includes `phone/whatsapp/instagram/twoGisUrl`.
- `POST /api/client/offers/{offerId}/contact`:
  1. Requires the request's access token (validated by re-hashing and
     comparing to `accessTokenHash`, constant-time compare).
  2. Loads the `Offer`, verifies `offer.requestId === request.id` (IDOR
     check — a token for request A can never reveal contacts for an offer
     that belongs to request B).
  3. Writes a `ContactReveal` row + `CONTACT_REVEAL` `AnalyticsEvent`.
  4. Returns the contact payload, freshly read from `Company`, only now.
- `POST /api/client/offers/{offerId}/outbound-click` follows the same
  token + ownership check, records the event, and returns the **redirect
  URL** — the frontend does not construct `wa.me`/`tel:`/Instagram/2GIS
  links itself, so it cannot leak them before the click either.

## 3. Client token design

- Generated with `crypto.randomBytes(32)` → base64url, ~256 bits of
  entropy — cryptographically random, unpredictable, not derived from the
  sequential DB id.
- Only `sha256(token)` is persisted (`accessTokenHash`), so a database
  read alone doesn't yield a usable token.
- Comparison uses `crypto.timingSafeEqual` on the hash to avoid timing
  side-channels.
- URL shape: `/r/{publicId}?t={token}` — `publicId` is a separate, lower-
  entropy nanoid used only for routing/display, never sufficient on its
  own to authorize anything.
- The token is mirrored into `localStorage` under
  `autopick:request:{publicId}` purely for the "continue where I left
  off" convenience (auto-fill on revisit); it is **never** treated as a
  trusted identity by the server — every request still validates the hash
  server-side.

## 4. Company / Admin auth

- Hand-rolled session (`lib/auth.ts`, via `jose`), not Auth.js/NextAuth:
  `bcrypt` (cost 12) password hashing, signed JWT session cookie.
- JWT session cookie: `httpOnly`, `secure` (in production), `sameSite:
  'lax'`.
- `src/proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts`; same
  edge-runtime mechanism) does an optimistic JWT check on `/company/:path*`
  and `/admin/:path*`, redirecting unauthenticated/wrong-role requests to
  the matching login page before the route even renders. The
  `(dashboard)` route group layouts (`app/company/(dashboard)/layout.tsx`,
  `app/admin/(dashboard)/layout.tsx`) perform the same check again
  server-side as a second layer.
- All `/api/company/**` and `/api/admin/**` route handlers additionally
  re-check `session.user.role` and, for company routes,
  `session.user.companyId` server-side — `proxy.ts` and the layouts are a
  UX convenience, not the authorization boundary.
- Only `status = APPROVED` companies may call
  `POST /api/company/requests/{id}/offers`; blocked/pending companies get
  a `403`.

## 5. IDOR prevention checklist

| Action | Check |
|---|---|
| Company reads request | request must be `ACTIVE`/non-expired (visible list); reading a single request by id does not require ownership (requests are broadcast) but never returns PII |
| Company creates/edits offer | `offer.companyId === session.company.id` on edit; unique `(requestId, companyId)` prevents duplicate offers |
| Client reads offers | scoped to `request.id` derived from `publicId`, no cross-request leakage |
| Client reveals contact | offer must belong to the request identified by the presented token |
| Admin routes | `session.user.role === 'ADMIN'` required on every handler |

## 6. Rate limiting

`lib/rate-limit.ts` implements a simple in-memory sliding-window limiter
(per-IP, per-route-family) — adequate for MVP single-instance deployment:
- `POST /api/requests` (request creation): 5 / 10 min / IP
- `POST /api/client/offers/*/contact` and `/outbound-click`: 30 / min / IP
- `POST /api/auth/*` (login): 10 / min / IP
Documented as swappable for a Redis-backed limiter behind the same
interface when scaling beyond one instance.

## 7. Input validation

Every route handler validates its body/query with a Zod schema before
touching the database; validation failures return `400` with a field
error map, never a stack trace.

## 8. Other

- SQL injection: excluded by using Prisma's parameterized query builder
  everywhere; no raw string-concatenated SQL.
- XSS: React escapes all rendered text by default; no `dangerouslySetInnerHTML`
  is used anywhere in the codebase for user-supplied content.
- Secrets: `.env` is git-ignored; `.env.example` documents required vars
  with placeholder values only.
- File uploads: validated by MIME type + size limit before being handed to
  the storage abstraction; served from a dedicated `/uploads` path, never
  executed.
