# AutoPick — Database Schema

PostgreSQL via Prisma. See `prisma/schema.prisma` for the source of truth;
this document explains the design decisions.

## Entities

### User
Auth account for `COMPANY` and `ADMIN` roles only (clients never get a
`User` row). `email` unique, `passwordHash` (bcrypt), `role` enum.
A `COMPANY` user has a 1:1 `Company` profile.

### Company
```
id, userId (FK User, unique), name, slug (unique), description, logoUrl,
phone, whatsapp, instagram, twoGisUrl, address, cityId (FK City),
extraLinks (Json, nullable), workingHours (Json, nullable),
status (PENDING|APPROVED|BLOCKED), createdAt, updatedAt
```
Only `phone/whatsapp/instagram/twoGisUrl/address` are ever included in a
"contact reveal" payload. `name`, `logoUrl`, `description` are public in
offer cards pre-reveal.

### City
```
id, name, slug (unique), countryCode (default "KZ"), createdAt
```
Deliberately not hardcoded to Kazakhstan — `countryCode` allows future
expansion; currency is stored per-request/offer, not per-city.

### Service
```
id, name, slug (unique), isActive, sortOrder, createdAt
```
Admin-manageable catalog entity, referenced by both `RequestService`
(what the client wants) and `Offer` indirectly through the request.

### Request
```
id, publicId (unique, random, used in the client-facing URL),
accessTokenHash (unique, sha-256 hash of the plaintext token — the
  plaintext is NEVER stored),
cityId (FK City), carBrand, carModel, carYear (nullable),
carCondition (NEW|USED), customerName, customerPhone,
customerWhatsapp (nullable), comment (nullable), desiredDate (nullable),
status (NEW|ACTIVE|CLOSED|EXPIRED|CANCELLED), expiresAt, createdAt, updatedAt
```
`publicId` is a short random slug used in the URL path; `accessTokenHash`
is a separate, longer, higher-entropy secret whose plaintext is only ever
returned once (at creation) and passed by the client on every request.
Splitting "which request" (publicId, low entropy ok, not secret) from
"proof of ownership" (token, high entropy, secret) keeps URLs readable
while keeping authorization cryptographically strong.

### RequestService (join table)
```
id, requestId (FK), serviceId (FK), UNIQUE(requestId, serviceId)
```

### RequestImage
```
id, requestId (FK), url, createdAt
```

### Offer
```
id, requestId (FK), companyId (FK), price (Int, minor-unit-free integer
  KZT has no cents in practice, stored as whole tenge), currency (default
  "KZT"), durationValue (Int), durationUnit (HOURS|DAYS),
  availableAt (DateTime), comment (nullable), oldPrice (nullable),
  discountPercent (nullable), guarantee (nullable text),
  extraConditions (nullable text), status (ACTIVE|WITHDRAWN),
  createdAt, updatedAt
UNIQUE(requestId, companyId)
```
The unique constraint enforces "one active relationship per company per
request" at the database level; "editing" an offer is an UPDATE on the
same row, never a new INSERT.

### ContactReveal
```
id, requestId (FK), offerId (FK), companyId (FK), createdAt
```
One row per reveal *event* (not deduped) — used for raw auditing. The
*unique lead* metric is derived by `COUNT(DISTINCT (requestId, offerId))`
over this table, never by adding a boolean column, so no data is lost.

### AnalyticsEvent
```
id, type (enum, see below), requestId (nullable FK), offerId (nullable FK),
companyId (nullable FK), metadata (Json, nullable), createdAt
```
Generic event stream. `type` enum: `REQUEST_CREATED`, `REQUEST_VIEWED`,
`OFFER_CREATED`, `OFFER_UPDATED`, `OFFER_IMPRESSION`, `CONTACT_REVEAL`,
`PHONE_CLICK`, `WHATSAPP_CLICK`, `INSTAGRAM_CLICK`, `TWO_GIS_CLICK`.
`ContactReveal` rows are written *in addition to* a `CONTACT_REVEAL`
analytics event (the dedicated table gives us a clean FK-checked
join target; the generic table gives us a uniform funnel/export view).

### Notification
Company/Admin sessions are a stateless JWT in an httpOnly cookie (see
`lib/auth.ts`), not a NextAuth database session — there is no `Session`
table in the schema.
`Notification` — outbox-style table (`id, channel, recipientType,
recipientId, type, payload Json, status, createdAt, sentAt`) written by the
`Notifier` abstraction; MVP uses a console/no-op sender that still logs a
row here so the data model is exercised.

## Derived metrics (computed, not stored)

- Unique Contact Reveals = distinct `(requestId, offerId)` in `ContactReveal`
- Unique Outbound Leads = distinct `(requestId, offerId)` in
  `AnalyticsEvent` where `type IN (PHONE_CLICK, WHATSAPP_CLICK,
  INSTAGRAM_CLICK, TWO_GIS_CLICK)`
- Offer price stats per request: `MIN/MAX/AVG` via SQL aggregate,
  median computed in application code (small N per request)

## Indexes

- `Request(status, expiresAt)`, `Request(cityId)`, `Request(createdAt)`
- `Offer(requestId)`, `Offer(companyId)`
- `AnalyticsEvent(companyId, type, createdAt)`,
  `AnalyticsEvent(requestId)`, `AnalyticsEvent(offerId)`
- `ContactReveal(companyId)`, unique-ish lookups via
  `(requestId, offerId)` composite index

## Why no plaintext token / no plaintext password

`Request.accessTokenHash` and `User.passwordHash` never store the secret
itself — only a one-way hash (SHA-256 for the request token, bcrypt for
the password, since one is machine-generated & verified programmatically
and the other is human-chosen). A database leak alone cannot be used to
impersonate a client or a company user.
