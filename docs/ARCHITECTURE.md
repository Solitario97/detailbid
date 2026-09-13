# AutoPick — Architecture

## 1. Style: modular monolith

A single Next.js 15 (App Router) application hosts both the frontend and
the backend (Route Handlers). No microservices, no message queue. Code is
organized by **module** (bounded context), not by technical layer, so each
domain can later be extracted into a service if needed without a rewrite:

```
src/
  app/                        # Next.js routes (pages + route handlers)
    (marketing)/               # landing page
    r/[publicId]/               # client request page
    request/new/                 # wizard
    company/                    # company auth + dashboard (route group)
    admin/                       # admin panel (route group)
    api/
      requests/                  # POST create request
      client/                    # client-token-scoped endpoints
      company/                   # company-session-scoped endpoints
      admin/                     # admin-session-scoped endpoints
      auth/                      # custom login/register/logout handlers
  modules/
    requests/                    # Request domain: services, DTOs, repo
    offers/
    companies/
    catalog/                     # Service + City
    analytics/
    notifications/               # abstraction, no real provider wired
    storage/                     # FileStorage abstraction
  lib/
    prisma.ts                    # Prisma client singleton
    tokens.ts                    # secure token generation/hash
    rate-limit.ts
    auth.ts                      # session cookie issue/verify (jose + bcrypt)
  components/
    ui/                          # shadcn primitives
    client/  company/  admin/  marketing/
prisma/
  schema.prisma
  migrations/
  seed.ts
docs/
```

Each module exposes a small service layer (`*.service.ts`) that route
handlers call. Route handlers do request parsing, auth/authorization
checks, and DTO mapping; **all business rules and authorization live in
the module service layer / server code, never in the client bundle.**

## 2. Request/response flow

Client (browser) → Next.js Route Handler → module service → Prisma → Postgres.
Route handlers never return Prisma models directly to a client whose role
doesn't own that data — see `docs/SECURITY.md` for the DTO boundary.

## 3. Realtime updates

MVP uses **polling** (client page polls
`GET /api/client/requests/{id}/offers` every 4s while the tab is visible,
backs off if hidden) instead of SSE/WebSockets — simplest reliable option
for MVP, works behind any proxy/CDN without special infra, and is easy to
replace with SSE later behind the same endpoint contract.

## 4. Authentication

- **Company / Admin**: hand-rolled credentials auth (`lib/auth.ts`) backed
  by Prisma `User` records (`role: COMPANY | ADMIN`), `bcrypt` password
  hashing, a signed JWT (via `jose`) in a secure, httpOnly, sameSite=lax
  session cookie — not Auth.js/NextAuth. `src/proxy.ts` (Next.js 16's
  rename of `middleware.ts`) does an optimistic edge-runtime redirect for
  `/company/**` and `/admin/**`; the `(dashboard)` layouts and every
  protected API route re-enforce the session server-side regardless.
- **Client**: no account. A `Request` has an `accessTokenHash`. The
  client's browser holds the plaintext token (in the URL and mirrored to
  `localStorage` for convenience — never trusted as the source of truth).
  Every client-scoped API call must present the token (query/header), the
  server re-hashes and compares in constant time against the stored hash.

## 5. Storage abstraction

`modules/storage/` defines a `FileStorage` interface
(`put(file) -> url`, `delete(url)`), with a `LocalFileStorage`
implementation and a documented seam for an `S3FileStorage` implementation
(same interface, swappable via `STORAGE_DRIVER` env var). Nothing in route
handlers depends on the local implementation directly.

`LocalFileStorage` writes to `env.uploadsDir` (`UPLOADS_DIR` env var,
defaults to `<repo>/public/uploads` locally) and returns a relative
`/uploads/<folder>/<filename>` URL. That URL is served by
`src/app/uploads/[...path]/route.ts` — a real route handler that reads
straight from `env.uploadsDir`, rather than relying on Next's automatic
`public/` static passthrough. This matters in production: **Railway's
container filesystem is ephemeral** — anything written to local disk at
runtime (including `public/`) is discarded on every redeploy, restart, or
when a new instance is scheduled. Deploying this app on Railway therefore
requires a **Railway Volume** mounted at some path (e.g. `/data`), with
`UPLOADS_DIR=/data/uploads` set so both the writer (`LocalFileStorage.put`)
and the reader (the `/uploads` route) agree on the same persisted
directory. Without a volume + `UPLOADS_DIR`, uploads work within a single
running instance but vanish on the next deploy. See the README's
"Production file storage (Railway)" section for the exact setup steps.

## 6. Extensibility seams (not built now, but not blocked)

- **Billing**: `Company` already has a `status`; a future `Plan`/`Credit`/
  `BillableLead` table can attach to `Company` and `ContactReveal` without
  touching existing tables.
- **Notifications**: `modules/notifications/notifier.ts` defines a
  `Notifier` interface with a `ConsoleNotifier`/`NoopEmailNotifier` MVP
  implementation and typed events (`OFFER_RECEIVED`, `NEW_REQUEST`), so
  WhatsApp/Telegram/SMS/email/push channels can be added as new
  implementations later.
- **Ranking/Featured offers**: `Offer` has no rank field yet; sorting is
  done in the query layer so a `priorityScore` column can be added later
  without an API shape change (client already requests a `sort` param).

## 7. Tech stack

- Next.js (App Router, latest stable), TypeScript strict, React 18
- Tailwind CSS + shadcn/ui
- Prisma ORM + PostgreSQL
- Hand-rolled credentials auth (`jose` JWT + `bcryptjs`, for company/admin only)
- Zod for all input validation
- Vitest for unit/integration tests

## 8. Deployment topology (MVP)

Single Next.js app + one Postgres instance. `docker-compose.yml` runs
Postgres for local dev; the app runs with `npm run dev` / `npm start`
against `DATABASE_URL`.
