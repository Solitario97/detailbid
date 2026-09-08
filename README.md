# DetailBid

DetailBid is a two-sided marketplace for Kazakhstan connecting car owners with
detailing companies. A client describes their car and the services they need
(no registration required) and detailing companies in their city respond with
priced offers. The client compares offers and, when ready, reveals a
company's contact details and reaches out directly.

The single most important product rule, enforced end-to-end (DB queries, DTOs,
API responses, and tests): **a detailing company never receives the client's
name, phone, or WhatsApp — not in any UI, and not in any raw JSON response —
until the client explicitly clicks "Связаться" on that specific offer.**

See [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/DATABASE.md`](docs/DATABASE.md) and [`docs/SECURITY.md`](docs/SECURITY.md)
for the full product, architecture, schema, and security design.

## Tech stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict)
- Tailwind CSS v4 + a small local component kit (shadcn/ui-style primitives)
- PostgreSQL + Prisma ORM
- Custom JWT session auth (`jose` + `bcryptjs`) — no third-party auth provider
- Zod for input validation
- Vitest for integration tests (run against a real, isolated Postgres database)

Everything lives in one Next.js app (API routes under `src/app/api/**`) — a
modular monolith, not microservices, per the project's scope.

## Getting started

### 1. Start PostgreSQL

Using Docker (recommended on your machine):

```bash
docker compose up -d
```

This starts Postgres 16 on `localhost:5432` with user/password/database all
set to `detailbid`, matching `.env.example`. If you'd rather use a local
Postgres install, just make sure a database matching `DATABASE_URL` exists.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set `AUTH_SECRET` to a long random string (e.g. `openssl rand
-base64 32`). The other defaults work out of the box with `docker-compose.yml`.

### 3. Install dependencies, migrate, and seed

```bash
npm install
npm run db:migrate   # creates tables (prisma migrate dev)
npm run db:seed       # loads demo cities, services, companies, requests
```

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000.

- `/` — landing page, "Оставить заявку" starts the client wizard
- `/request/new` — client request wizard (no login)
- `/r/[publicId]?t=...` — the client's private offers page (the link they're
  redirected to after submitting a request)
- `/company/login`, `/company/register` — detailing company cabinet
- `/admin` — admin panel (login at `/admin/login`)

## Test accounts (seeded, dev only)

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@example.com` | `Admin123!` | full access |
| Company | `detail@example.com` | `Detail123!` | APPROVED — "Detail Pro" |
| Company | `autospa@example.com` | `Detail123!` | APPROVED — "Auto Spa" |
| Company | `premium@example.com` | `Detail123!` | APPROVED — "Premium Detailing" |
| Company | `newwave@example.com` | `Detail123!` | PENDING — not yet approved, can't submit offers until an admin approves it |

These credentials are for local development only. `npm run db:seed` is
idempotent-ish for demo purposes but is meant for a fresh database — see
"Resetting your database" below if you need a clean slate.

## Tests

Tests run against a **separate, isolated** database
(`detailbid_test` by default) so `npm test` can never touch your dev data
or seeded demo content.

```bash
# create the test database once (adjust user/host as needed):
createdb -h localhost -U detailbid detailbid_test

cp .env.test.example .env.test   # if you don't already have one — see below
# .env.test should point DATABASE_URL at detailbid_test, e.g.:
#   DATABASE_URL="postgresql://detailbid:detailbid@localhost:5432/detailbid_test?schema=public"

npx prisma migrate deploy   # apply migrations to the test DB
# (run the line above with DATABASE_URL from .env.test in your shell env,
#  or `dotenv -e .env.test -- npx prisma migrate deploy`)

npm test
```

`vitest.config.ts` loads `.env.test` automatically before the suite runs, so
as long as `.env.test` exists and points at a migrated `detailbid_test`
database, `npm test` just works. The suite covers, among other things:

- companies can never receive client PII, at the DTO layer and the raw
  service/query layer (`tests/security/company-no-pii.test.ts`)
- IDOR protection on client-facing offer actions (`tests/security/idor.test.ts`)
- offer business rules — one active offer per company per request, expired
  requests reject new offers, only APPROVED companies can offer
  (`tests/offers/offer-rules.test.ts`)
- unique-lead counting — repeated contact reveals / outbound clicks are
  recorded as raw events but counted once as a unique lead
  (`tests/analytics/lead-counting.test.ts`)
- per-company analytics isolation (`tests/security/analytics-isolation.test.ts`)

## Resetting your database

To wipe and reseed your **dev** database from scratch:

```bash
npx prisma migrate reset
```

This drops and recreates the schema, reapplies all migrations, and reruns
the seed script. It's interactive by default and will ask for confirmation;
pass `--force` to skip the prompt. Only ever run this against your dev
database — never against a database with real data.

## Production build

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

All four should pass cleanly before deploying.

## Project structure

```
docs/                   product/architecture/database/security docs
prisma/
  schema.prisma          data model
  seed.ts                 demo data
src/
  app/
    (marketing)/           landing page
    request/new/           client wizard
    r/[publicId]/           client's private offers page
    company/                company cabinet (login, register, requests, offers, analytics, profile)
    admin/                  admin panel
    api/
      requests/              client creates a request (no auth)
      client/                 client-facing, token-authenticated actions (view offers, reveal contact, outbound click, impression)
      company/                company cabinet API (auth required, APPROVED-gated where relevant)
      admin/                  admin API (admin auth required)
      auth/                   login/logout/register
  modules/
    requests/                request creation, per-role DTOs, Prisma selects
    offers/                  offer upsert/edit, contact reveal, outbound click, IDOR checks
    companies/                registration, profile
    analytics/                funnel stats, leaderboard, unique-lead counting
  lib/                       auth/session, tokens, prisma client, rate limiting, storage
  components/                UI components (client, company, admin, shared)
tests/                      Vitest integration tests (real Postgres, no mocking)
```

## Known limitations

This is an MVP. Deliberately out of scope for this version: in-app chat,
payments/billing, AI-based offer ranking, maps integration, push/SMS/email
notifications beyond the in-app "Рекомендуемые" ordering, and a native mobile
app. See `docs/PRODUCT_SPEC.md` for the full list and rationale.
