"use client";

import * as React from "react";
import { Phone, MessageCircle, AtSign, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatKzt, formatDate, formatDurationValue } from "@/lib/utils";
import { buildTelUrl, buildWhatsAppUrl, buildInstagramUrl, buildTwoGisUrl } from "@/lib/contact-links";
import type { OfferPublicDTO, OfferContactDTO } from "@/modules/offers/dto";

type OutboundType = "PHONE" | "WHATSAPP" | "INSTAGRAM" | "TWO_GIS";

interface Props {
  offer: OfferPublicDTO;
  onReveal: (offerId: string) => Promise<OfferContactDTO | null>;
  // Fire-and-forget analytics ping — NOT awaited before navigating anywhere.
  // The href on each contact link below is computed synchronously from
  // already-revealed contact data, so a click always navigates immediately
  // as part of the same user gesture (a real <a href>, never
  // `window.open()` after an `await`). See docs/MOBILE_CONTACT_FIX.md.
  onOutboundClick: (offerId: string, type: OutboundType) => void;
}

export function OfferCard({ offer, onReveal, onOutboundClick }: Props) {
  const [contact, setContact] = React.useState<OfferContactDTO | null>(null);
  const [revealing, setRevealing] = React.useState(false);

  React.useEffect(() => {
    if (offer.contactRevealed && !contact) {
      onReveal(offer.id).then((c) => c && setContact(c));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.contactRevealed]);

  async function handleReveal() {
    setRevealing(true);
    const c = await onReveal(offer.id);
    setRevealing(false);
    if (c) setContact(c);
  }

  // Real links, computed once contact data is available — never built from
  // undefined/null, and hidden entirely (not rendered as a dead button)
  // when the company hasn't provided that channel.
  const whatsappHref = contact ? buildWhatsAppUrl(contact.whatsapp, contact.phone) : null;
  const telHref = contact ? buildTelUrl(contact.phone) : null;
  const instagramHref = contact ? buildInstagramUrl(contact.instagram) : null;
  const twoGisHref = contact ? buildTwoGisUrl(contact.twoGisUrl) : null;

  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent-dark text-sm font-bold text-white">
            {offer.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={offer.company.logoUrl} alt={offer.company.name} className="h-full w-full object-cover" />
            ) : (
              offer.company.name[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-ink">{offer.company.name}</p>
            {offer.discountPercent ? <Badge variant="brand">Скидка {offer.discountPercent}%</Badge> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-end gap-2">
        <p className="text-3xl font-semibold tracking-tight text-ink">{formatKzt(offer.price)}</p>
        {offer.oldPrice && offer.oldPrice > offer.price && (
          <p className="mb-1 text-sm text-ink-faint line-through">{formatKzt(offer.oldPrice)}</p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-ink-faint">Срок</p>
          <p className="font-medium text-ink">{formatDurationValue(offer.durationValue, offer.durationUnit)}</p>
        </div>
        <div>
          <p className="text-ink-faint">Ближайшая запись</p>
          <p className="font-medium text-ink">{formatDate(offer.availableAt)}</p>
        </div>
      </div>

      {offer.comment && <p className="mt-4 break-words text-sm leading-relaxed text-ink-soft">{offer.comment}</p>}
      {offer.guarantee && <p className="mt-2 break-words text-xs text-ink-faint">Гарантия: {offer.guarantee}</p>}

      <div className="mt-6">
        {!contact ? (
          <Button className="w-full" onClick={handleReveal} disabled={revealing}>
            {revealing && <Loader2 className="h-4 w-4 animate-spin" />}
            Связаться
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-faint">
              Связаться с {offer.company.name}
            </p>
            {whatsappHref && (
              <a
                href={whatsappHref}
                onClick={() => onOutboundClick(offer.id, "WHATSAPP")}
                className={cn(buttonVariants({ variant: "primary" }), "w-full justify-start")}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {telHref && (
              <a
                href={telHref}
                onClick={() => onOutboundClick(offer.id, "PHONE")}
                className={cn(buttonVariants({ variant: "dark" }), "w-full justify-start")}
              >
                <Phone className="h-4 w-4" /> Позвонить
              </a>
            )}
            {instagramHref && (
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOutboundClick(offer.id, "INSTAGRAM")}
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}
              >
                <AtSign className="h-4 w-4" /> Instagram
              </a>
            )}
            {twoGisHref && (
              <a
                href={twoGisHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOutboundClick(offer.id, "TWO_GIS")}
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}
              >
                <MapPin className="h-4 w-4" /> Открыть в 2GIS
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
