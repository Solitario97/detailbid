# DetailBid — Product Specification

## 1. What it is

DetailBid is a two-sided marketplace connecting car owners ("clients") with
detailing companies. A client posts a request describing their car and the
services they want, without registering. Approved detailing companies see
the request (without any client personal data), and submit price offers.
The client compares offers on a private link and only reveals a company's
contact details when they actively choose to.

## 2. Roles

- **Guest / Client** — no account. Identified only by a per-request secure
  access token embedded in a private link.
- **Detailing Company** — registers with email/password, must be approved
  by an admin before submitting offers.
- **Admin** — internal staff, manages companies, catalog data (services,
  cities), and views full analytics including client PII.

## 3. Core user flows

### 3.1 Client flow

1. Client opens the landing page and clicks "Получить предложения".
2. Client completes a multi-step wizard: services (multi-select) → car
   (brand, model, year, condition) → city → contact info (name, phone,
   optional WhatsApp) → optional comment/photos/desired date.
3. On submit, the server creates a `Request`, generates a cryptographically
   random access token, stores only its hash, and returns the plaintext
   token once in the redirect URL.
4. Client is redirected to `/r/{publicId}?t={token}` — their private
   "Заявка опубликована" page.
5. The page polls the server for new offers every few seconds (no reload).
6. Each offer card shows company name, logo, price, duration, earliest
   appointment date, and comment — but never contact details.
7. Client can sort offers (price asc/desc, soonest appointment, fastest
   turnaround, "recommended").
8. Client clicks "Связаться" on an offer. The frontend calls
   `POST /api/client/offers/{offerId}/contact` with the request token. The
   server validates the token belongs to the request that owns the offer,
   records a `CONTACT_REVEAL` analytics event, and returns the company's
   contact payload (phone, WhatsApp, Instagram, 2GIS) — which was **never**
   present in the initial page payload.
9. Client can then click WhatsApp / Call / Instagram / 2GIS buttons. Each
   click calls `POST /api/client/offers/{offerId}/outbound-click` with a
   `type`, which records an event and returns the destination URL — the
   frontend never stores the raw links up front.

### 3.2 Company flow

1. Company registers (email, password, company profile fields). Status
   starts as `PENDING`.
2. Admin reviews and sets status to `APPROVED` (or `BLOCKED`).
3. Approved companies log in and see "Новые заявки" — a list of active,
   non-expired requests, built from a DTO that contains zero client PII,
   with filters (city, service, brand, new/used, date, "without my offer").
4. Company clicks "Предложить цену" → drawer with price, duration
   (value+unit), available date, comment, optional old price/discount/
   guarantee. Submitting creates an `Offer` (unique per company+request).
   The company may later edit that same offer (price/terms), but may
   never have two active offers on one request.
5. Company has its own analytics dashboard (today/7d/30d/all-time): offers
   sent, impressions, contact reveals, WhatsApp/phone/Instagram/2GIS
   clicks, outbound leads, conversion rates, and its best-performing offer.

### 3.3 Admin flow

1. Admin logs in to `/admin`.
2. Dashboard: requests today/this week, active requests, registered &
   active companies, offers, avg offers/request, contact reveals,
   conversion rate, top companies by leads/conversion (min-impression
   threshold configurable).
3. Companies: approve/block/edit, view per-company stats.
4. Requests: full visibility including client PII.
5. Offers: browse all offers.
6. Services / Cities: CRUD, used to populate the client wizard and company
   filters.
7. Analytics: company leaderboard (offers, impressions, contact reveals,
   WhatsApp/phone clicks, outbound leads, conversion, sortable), price
   analytics per request/service (min/max/avg/median), popular
   services/brands/models, per-city stats.

## 4. Privacy model (critical)

- A detailing company must **never** receive `customerName`,
  `customerPhone`, `customerWhatsapp`, or any client identifying data —
  not in HTML, not in the React server payload, not in any JSON API
  response, not in analytics.
- Client contact details for a *company* are withheld from the client
  until an explicit `CONTACT_REVEAL` action, enforced server-side (the
  data is simply absent from the initial payload — not hidden via CSS).
- Only the Admin role can see client contact data, and only through
  admin-only endpoints.

See `docs/SECURITY.md` for the enforcement mechanism (per-role DTOs).

## 5. Analytics funnel

```
REQUEST_CREATED
  → OFFER_CREATED (company side)
  → OFFER_IMPRESSION (client actually saw the offer card)
  → CONTACT_REVEAL (client requested contacts)
  → PHONE_CLICK / WHATSAPP_CLICK / INSTAGRAM_CLICK / TWO_GIS_CLICK (outbound)
```

- **Unique Lead** = unique `(requestId, offerId)` pair with at least one
  `CONTACT_REVEAL`. Repeated reveals are stored as raw events but do not
  increase the unique count.
- **Unique Outbound Lead** = unique `(requestId, offerId)` pair with at
  least one outbound click event, counted independently of how many
  channels or repeat clicks occurred.
- Conversion rates:
  - Offer → Contact = uniqueContactReveals / uniqueOfferImpressions
  - Contact → Outbound = uniqueOutboundLeads / uniqueContactReveals
  - Offer → Outbound = uniqueOutboundLeads / uniqueOfferImpressions

## 6. Statuses

- `Request`: `NEW → ACTIVE → CLOSED | EXPIRED | CANCELLED`
- `Offer`: `ACTIVE | WITHDRAWN`
- `Company`: `PENDING | APPROVED | BLOCKED`

Request lifetime is configurable (`REQUEST_TTL_DAYS`, default 7). After
`expiresAt`, new offers are rejected server-side.

## 7. Out of scope for MVP

Payments, subscriptions, billing, chat, maps, AI ranking, native apps,
microservices. The architecture (see ARCHITECTURE.md §6) leaves room to add
these later without a rewrite.

## 8. Definition of done

See root `README.md` "End-to-end scenario" section — the full
client → company → client → admin loop must work against a real Postgres
database with no mocked data.
