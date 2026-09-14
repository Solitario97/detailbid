"use client";

// ---------------------------------------------------------------------------
// Restores a client's active request when they reopen AutoPick in a new tab
// (or come back to "/"), instead of always showing the "create a request"
// landing page. See src/lib/client-request-storage.ts for why this is
// needed and why it's safe.
//
// Behavior:
//   1. Read the persisted {publicId, token} pointer via useSyncExternalStore
//      (hydration-safe: server snapshot is always null, so SSR always
//      renders "landing" and the client only diverges from that, if at all,
//      in a normal post-hydration commit — not a hydration mismatch).
//   2. None stored -> render the landing page. No network call, no delay.
//   3. Stored -> render a loading state and ask the backend, through the
//      SAME token-verified endpoint the request page itself uses (GET
//      /api/client/requests/[publicId]), whether that request still exists
//      and is still ACTIVE.
//        - ACTIVE -> redirect to the request page. Offers/status shown
//          there are always fetched fresh — nothing about the request
//          itself is read from localStorage.
//        - not found / invalid token / a terminal status (CLOSED, EXPIRED,
//          CANCELLED) -> clear the persisted pointer and fall back to the
//          landing page, so the next visit doesn't keep retrying a dead
//          request.
//        - network error -> fail open to the landing page (don't strand a
//          visitor on a spinner because of a hiccup); the pointer is left
//          in place so the next visit can try again.
// ---------------------------------------------------------------------------

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  clearActiveRequest,
  parseStoredActiveRequest,
  readActiveRequestRaw,
  readActiveRequestServerSnapshot,
  subscribeToActiveRequestChanges,
} from "@/lib/client-request-storage";
import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ExampleOffers } from "@/components/marketing/example-offers";
import { CompanyCta, SiteFooter } from "@/components/marketing/company-cta";

const ACTIVE_STATUS = "ACTIVE";

export function HomeGate() {
  const router = useRouter();

  const rawStored = React.useSyncExternalStore(
    subscribeToActiveRequestChanges,
    readActiveRequestRaw,
    readActiveRequestServerSnapshot
  );
  const stored = React.useMemo(() => parseStoredActiveRequest(rawStored), [rawStored]);

  // Tracks the raw stored value we've already finished verifying (found it
  // gone/terminal, or hit a network error) and should stop spinning for.
  // Keyed by the raw string itself (not a boolean) so that if a *different*
  // pointer shows up later — e.g. this tab was idle on the landing page and
  // another tab just created a request — verification automatically
  // re-arms: the new rawStored no longer matches the old gaveUpFor value.
  // Never set on the success path: a successful verification navigates
  // away via router.replace instead, so there's nothing to "stop" for.
  const [gaveUpFor, setGaveUpFor] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!stored) return; // nothing to verify — render() falls back to landing on its own.

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/client/requests/${stored.publicId}?t=${encodeURIComponent(stored.token)}`);
        if (cancelled) return;

        if (!res.ok) {
          // 404 (deleted) or 401 (invalid/stale token) — nothing to restore.
          clearActiveRequest();
          setGaveUpFor(rawStored);
          return;
        }

        const request: { status: string } = await res.json();
        if (cancelled) return;

        if (request.status !== ACTIVE_STATUS) {
          // CLOSED / EXPIRED / CANCELLED (or any future terminal status).
          clearActiveRequest();
          setGaveUpFor(rawStored);
          return;
        }

        router.replace(`/r/${stored.publicId}?t=${encodeURIComponent(stored.token)}`);
        // Deliberately not calling setGaveUpFor here — we're navigating
        // away, so the loading state below just stays up until that
        // completes.
      } catch {
        if (!cancelled) setGaveUpFor(rawStored);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stored, rawStored, router]);

  const showLanding = !stored || gaveUpFor === rawStored;

  if (!showLanding) {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-ink-faint" aria-label="Загрузка" />
      </main>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ExampleOffers />
        <CompanyCta />
      </main>
      <SiteFooter />
    </>
  );
}
