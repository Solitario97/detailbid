"use client";

import * as React from "react";
import { Phone, MessageCircle, AtSign, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKzt, formatDate, formatDurationValue } from "@/lib/utils";
import type { OfferPublicDTO, OfferContactDTO } from "@/modules/offers/dto";

interface Props {
  offer: OfferPublicDTO;
  onReveal: (offerId: string) => Promise<OfferContactDTO | null>;
  onOutboundClick: (offerId: string, type: "PHONE" | "WHATSAPP" | "INSTAGRAM" | "TWO_GIS") => Promise<string | null>;
}

export function OfferCard({ offer, onReveal, onOutboundClick }: Props) {
  const [contact, setContact] = React.useState<OfferContactDTO | null>(null);
  const [revealing, setRevealing] = React.useState(false);
  const [clicking, setClicking] = React.useState<string | null>(null);

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

  async function handleOutbound(type: "PHONE" | "WHATSAPP" | "INSTAGRAM" | "TWO_GIS") {
    setClicking(type);
    const url = await onOutboundClick(offer.id, type);
    setClicking(null);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-accent-dark text-sm font-bold text-white">
            {offer.company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={offer.company.logoUrl} alt={offer.company.name} className="h-full w-full object-cover" />
            ) : (
              offer.company.name[0]?.toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{offer.company.name}</p>
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

      {offer.comment && <p className="mt-4 text-sm leading-relaxed text-ink-soft">{offer.comment}</p>}
      {offer.guarantee && <p className="mt-2 text-xs text-ink-faint">Гарантия: {offer.guarantee}</p>}

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
            {contact.whatsapp && (
              <Button
                variant="primary"
                className="w-full justify-start"
                onClick={() => handleOutbound("WHATSAPP")}
                disabled={clicking === "WHATSAPP"}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            )}
            {contact.phone && (
              <Button
                variant="dark"
                className="w-full justify-start"
                onClick={() => handleOutbound("PHONE")}
                disabled={clicking === "PHONE"}
              >
                <Phone className="h-4 w-4" /> Позвонить
              </Button>
            )}
            {contact.instagram && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleOutbound("INSTAGRAM")}
                disabled={clicking === "INSTAGRAM"}
              >
                <AtSign className="h-4 w-4" /> Instagram
              </Button>
            )}
            {contact.twoGisUrl && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleOutbound("TWO_GIS")}
                disabled={clicking === "TWO_GIS"}
              >
                <MapPin className="h-4 w-4" /> Открыть в 2GIS
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
