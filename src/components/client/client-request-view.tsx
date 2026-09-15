"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RequestSummaryCard } from "@/components/client/request-summary-card";
import { OfferCard } from "@/components/client/offer-card";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PublicRequestDTO } from "@/modules/requests/dto";
import type { OfferPublicDTO, OfferContactDTO } from "@/modules/offers/dto";
import { saveActiveRequest, clearActiveRequest } from "@/lib/client-request-storage";

type Sort = "recommended" | "price_asc" | "price_desc" | "soonest" | "fastest";

const SORT_LABELS: Record<Sort, string> = {
  recommended: "Рекомендуемые",
  price_asc: "Дешевле",
  price_desc: "Дороже",
  soonest: "Ближайшая запись",
  fastest: "Быстрее выполнение",
};

const POLL_INTERVAL_MS = 4000;

export function ClientRequestView({
  publicId,
  token,
  initialRequest,
  initialOffers,
}: {
  publicId: string;
  token: string;
  initialRequest: PublicRequestDTO;
  initialOffers: OfferPublicDTO[];
}) {
  const router = useRouter();
  const [offers, setOffers] = React.useState(initialOffers);
  const [sort, setSort] = React.useState<Sort>("recommended");
  const seenImpressions = React.useRef(new Set<string>());
  const [newRequestConfirmOpen, setNewRequestConfirmOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  // Set the instant deletion succeeds, so the poll (which fires on its own
  // timer, independent of React's render cycle) can't overwrite state with
  // stale offers or hit the now-404 endpoint during the brief window before
  // router.replace() actually unmounts this component.
  const deletedRef = React.useRef(false);
  const pollIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the persistent "current active request" pointer fresh every time
  // this page is viewed — covers a visitor who opens a `/r/...?t=...` link
  // directly (email/bookmark) without having gone through the wizard first.
  React.useEffect(() => {
    saveActiveRequest(publicId, token);
  }, [publicId, token]);

  React.useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (deletedRef.current) return;
      try {
        const res = await fetch(`/api/client/requests/${publicId}/offers?t=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && !deletedRef.current) setOffers(data.offers);
      } catch {
        // network hiccup — next poll will retry
      }
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    pollIntervalRef.current = interval;
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [publicId, token]);

  // Defends the "delete a request, hit browser Back" scenario: if this page
  // is ever restored from the browser's back/forward cache (a full bfcache
  // restore skips React entirely, so nothing above would re-run), re-check
  // with the backend that the request/token are still valid and bounce to
  // the homepage if not. A hard `location.replace` is used deliberately —
  // a bfcache restore bypasses the Next.js router, so this can't rely on it.
  React.useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (!event.persisted) return;
      fetch(`/api/client/requests/${publicId}?t=${encodeURIComponent(token)}`)
        .then((res) => {
          if (!res.ok) {
            clearActiveRequest();
            window.location.replace("/");
          }
        })
        .catch(() => {
          // network hiccup on a Back-navigation edge case — fail open and
          // leave the (still possibly-valid) cached page as-is.
        });
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [publicId, token]);

  React.useEffect(() => {
    for (const offer of offers) {
      if (!seenImpressions.current.has(offer.id)) {
        seenImpressions.current.add(offer.id);
        fetch(`/api/client/offers/${offer.id}/impression`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId, token }),
        }).catch(() => {});
      }
    }
  }, [offers, publicId, token]);

  const sortedOffers = React.useMemo(() => sortOffers(offers, sort), [offers, sort]);

  // Backs BOTH "Новая заявка" and "Удалить заявку" — they are the exact
  // same backend action (delete this request via the existing
  // deleteRequestById service, the one deletion path in the codebase);
  // only the confirmation copy differs between the two dialogs below.
  // Returns an error message on failure (dialog stays open, shows it,
  // re-enables its buttons) or null on success (caller navigates away).
  async function handleDeleteRequest(): Promise<string | null> {
    try {
      const res = await fetch(`/api/client/requests/${publicId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        return data?.error ?? "Не удалось удалить заявку. Попробуйте ещё раз.";
      }
    } catch {
      return "Не удалось удалить заявку. Попробуйте ещё раз.";
    }

    // Success: stop polling/realtime immediately (don't wait for unmount),
    // clear the persistent restore pointer so HomeGate can't bring the now-
    // deleted request back, then leave the request page entirely — replace
    // (not push) so browser Back can't land on it either.
    deletedRef.current = true;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    clearActiveRequest();
    router.replace("/");
    return null;
  }

  async function handleReveal(offerId: string): Promise<OfferContactDTO | null> {
    try {
      const res = await fetch(`/api/client/offers/${offerId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, token }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // Fire-and-forget analytics ping for an outbound WhatsApp/Call/Instagram/
  // 2GIS click. Deliberately NOT awaited by the caller and NOT involved in
  // building the link the user actually navigates to (OfferCard computes
  // that itself, synchronously, from the already-revealed contact data) --
  // the button is a real <a href>, so the browser starts navigating the
  // instant the click happens, in the same tick as the user gesture. Mobile
  // Safari/Chrome had been silently blocking these as popups because the
  // old code awaited this exact request before calling `window.open()`,
  // which breaks "direct user activation" on those browsers.
  //
  // Uses sendBeacon (falling back to a keepalive fetch) so the request
  // survives the page losing focus/unloading right after the tap, which is
  // the normal outcome of a WhatsApp/tel link handing off to another app.
  function handleOutboundClick(offerId: string, type: "PHONE" | "WHATSAPP" | "INSTAGRAM" | "TWO_GIS") {
    const body = JSON.stringify({ publicId, token, type });
    const url = `/api/client/offers/${offerId}/outbound-click`;
    try {
      if (navigator.sendBeacon) {
        const ok = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
        if (ok) return;
      }
    } catch {
      // fall through to fetch
    }
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/autopick-logo.png" alt="AutoPick" width={56} height={56} className="rounded-xl object-contain" />
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => setNewRequestConfirmOpen(true)}>
            Новая заявка
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <RequestSummaryCard
          request={initialRequest}
          offersCount={offers.length}
          onDeleteClick={() => setDeleteConfirmOpen(true)}
        />

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Предложения компаний</h2>
          {offers.length > 1 && (
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 w-auto text-sm">
              {(Object.keys(SORT_LABELS) as Sort[]).map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {sortedOffers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-10 text-center">
              <p className="text-sm text-ink-soft">
                Компании уже видят вашу заявку.
                <br />
                Предложения появятся здесь.
              </p>
            </div>
          ) : (
            sortedOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} onReveal={handleReveal} onOutboundClick={handleOutboundClick} />
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={newRequestConfirmOpen}
        onClose={() => setNewRequestConfirmOpen(false)}
        title="Создать новую заявку?"
        description="Текущая заявка и полученные по ней предложения будут удалены. После этого вы сможете создать новую заявку."
        confirmLabel="Удалить и создать новую"
        onConfirm={handleDeleteRequest}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Удалить заявку?"
        description="Заявка и полученные предложения будут удалены. Это действие нельзя отменить."
        confirmLabel="Удалить заявку"
        onConfirm={handleDeleteRequest}
      />
    </main>
  );
}

function sortOffers(offers: OfferPublicDTO[], sort: Sort): OfferPublicDTO[] {
  const copy = [...offers];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price);
    case "soonest":
      return copy.sort((a, b) => new Date(a.availableAt).getTime() - new Date(b.availableAt).getTime());
    case "fastest":
      return copy.sort((a, b) => normalizedDuration(a) - normalizedDuration(b));
    case "recommended":
    default:
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

function normalizedDuration(offer: OfferPublicDTO): number {
  return offer.durationUnit === "HOURS" ? offer.durationValue : offer.durationValue * 24;
}
