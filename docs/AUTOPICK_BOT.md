# AutoPickBot — synthetic traffic scheduler

## What it is

A twice-daily background job (10:00 and 19:00, `AUTOPICK_BOT_TIMEZONE`,
default `Asia/Almaty`) that creates one synthetic `Request` through the
**exact same production code path** as a real client request, so the
whole system — matching, notifications, statistics, admin panel, offers —
gets exercised close to real production traffic. Each bot request is
deleted exactly 24h after it was created.

## Why it's safe to leave running

- **Same service layer, no fork.** `src/modules/autopick-bot/service.ts`
  builds a normal `CreateRequestInput`, validates it through
  `createRequestSchema` (the same Zod schema `POST /api/requests` uses),
  and calls `createRequest()` / `notifyCompaniesOfNewRequest()` — the same
  two functions the public API route calls. There is no bot-specific
  insert, no bypassed validation, no bot-specific matching/statistics code.
- **`source` never gates behavior.** `Request.source` is `"user"` by
  default and `"autopick_bot"` for bot rows. It is read in exactly two
  places in the whole codebase: the bot's own 24h cleanup query, and the
  `[AutoPickBot]` log lines. No statistics query, DTO, admin query, or
  matching query filters on it — bot requests count everywhere a real
  request would.
- **Never shown to users as a bot.** No DTO (`toCompanyRequestDTO` /
  `toPublicRequestDTO` / `toAdminRequestDTO`) exposes `source`. A company
  or admin looking at a bot request in the UI sees an ordinary request.
- **24h deletion reuses the one deletion path.** `deleteRequestById()` in
  `modules/requests/service.ts` is the only place in the codebase that
  deletes a `Request`; it relies on the schema's `onDelete: Cascade`
  relations (services, images, offers, contact reveals, analytics events)
  so no orphan rows are left behind. Cleanup only ever targets
  `source = "autopick_bot" AND createdAt <= now() - 24h` — a real
  (`source = "user"`) request is never touched by this code.
- **Multi-instance safe.** See `src/modules/autopick-bot/lock.ts` —
  before creating a request for a given slot, every instance tries to
  `INSERT` a row into `BotJobExecution` with a unique key
  (`autopick_bot:<date>:<hour>`, Almaty-local). Only one instance's insert
  can ever succeed for a given key, so N instances / a redeploy mid-slot /
  a restart replaying the same tick all still produce exactly one request
  per slot.
- **Fails loud, never fails hard.** Every entry point
  (`runAutopickBotCreate`, `runAutopickBotCleanup`,
  `runSchedulerTickSafely`) catches its own errors and logs them with the
  `[AutoPickBot] Failed to ...` prefix. A scheduler tick can never crash
  the Next.js process.

## Configuration

| Env var | Default | Meaning |
| --- | --- | --- |
| `AUTOPICK_BOT_ENABLED` | `false` | Master switch. `false`/unset = the scheduler starts but does nothing; no requests are ever created or deleted. |
| `AUTOPICK_BOT_TIMEZONE` | `Asia/Almaty` | IANA timezone the 10:00/19:00 slots and the daily "avoid repeating today's combo" check are computed in. |

Car models, driver names, and the model year pool are configuration data
in `src/modules/autopick-bot/config.ts` (`AUTOPICK_BOT_CARS`,
`AUTOPICK_BOT_NAMES`, `AUTOPICK_BOT_YEARS`) — extend those arrays to widen
the pool, no other file needs to change.

## How it's wired up

There is no existing cron/queue in this app (see `docs/ARCHITECTURE.md` —
"no microservices, no message queue"), so the scheduler is a plain
`setInterval` (ticks every minute) started from `src/instrumentation.ts`
(`register()`), Next.js's official server-startup hook. This app runs as a
persistent `next start` process on Railway (not per-request serverless),
so the interval lives for the process's whole lifetime, same as any other
Node background job would.

## Logs

```
[AutoPickBot] Request created request_id=... name=... vehicle=... year=... source=autopick_bot created_at=...
[AutoPickBot] Request deleted request_id=... created_at=... deleted_at=... age=<hours>h
[AutoPickBot] Failed to create request <error>
[AutoPickBot] Failed to delete request <error>
```
