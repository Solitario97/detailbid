"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { RequestSummaryCard } from "@/components/client/request-summary-card";
import { OfferCard } from "@/components/client/offer-card";
import { Select } from "@/components/ui/input";
import type { PublicRequestDTO } from "@/modules/requests/dto";
import type { OfferPublicDTO, OfferContactDTO } from "@/modules/offers/dto";
import { saveActiveRequest } from "@/lib/client-request-storage";

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
  const [offers, setOffers] = React.useState(initialOffers);
  const [sort, setSort] = React.useState<Sort>("recommended");
  const seenImpressions = React.useRef(new Set<string>());

  // Keep the persistent "current active request" pointer fresh every time
  // this page is viewed — covers a visitor who opens a `/r/...?t=...` link
  // directly (email/bookmark) without having gone through the wizard first.
  React.useEffect(() => {
    saveActiveRequest(publicId, token);
  }, [publicId, token]);

  React.useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/client/requests/${publicId}/offers?t=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setOffers(data.offers);
      } catch {
        // network hiccup — next poll will retry
      }
    };
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/autopick-logo.png" alt="AutoPick" width={56} height={56} className="rounded-xl object-contain" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <RequestSummaryCard request={initialRequest} offersCount={offers.length} />

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
