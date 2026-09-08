// ---------------------------------------------------------------------------
// Offer DTOs. `OfferPublicDTO` is what the client sees before "Связаться" —
// it structurally has no phone/whatsapp/instagram/twoGisUrl fields. Contact
// details only ever appear in `OfferContactDTO`, returned exclusively by the
// reveal-contact endpoint after a ContactReveal is recorded server-side.
// ---------------------------------------------------------------------------

export type OfferSourceForClient = {
  id: string;
  price: number;
  currency: string;
  durationValue: number;
  durationUnit: "HOURS" | "DAYS";
  availableAt: Date;
  comment: string | null;
  oldPrice: number | null;
  discountPercent: number | null;
  guarantee: string | null;
  extraConditions: string | null;
  createdAt: Date;
  company: { id: string; name: string; slug: string; logoUrl: string | null; description: string | null; status: string };
};

export interface OfferPublicDTO {
  id: string;
  price: number;
  currency: string;
  durationValue: number;
  durationUnit: "HOURS" | "DAYS";
  availableAt: string;
  comment: string | null;
  oldPrice: number | null;
  discountPercent: number | null;
  guarantee: string | null;
  extraConditions: string | null;
  createdAt: string;
  company: { id: string; name: string; slug: string; logoUrl: string | null; description: string | null };
  contactRevealed: boolean;
}

export function toOfferPublicDTO(o: OfferSourceForClient, contactRevealed: boolean): OfferPublicDTO {
  return {
    id: o.id,
    price: o.price,
    currency: o.currency,
    durationValue: o.durationValue,
    durationUnit: o.durationUnit,
    availableAt: o.availableAt.toISOString(),
    comment: o.comment,
    oldPrice: o.oldPrice,
    discountPercent: o.discountPercent,
    guarantee: o.guarantee,
    extraConditions: o.extraConditions,
    createdAt: o.createdAt.toISOString(),
    company: {
      id: o.company.id,
      name: o.company.name,
      slug: o.company.slug,
      logoUrl: o.company.logoUrl,
      description: o.company.description,
    },
    contactRevealed,
  };
}

export type CompanyContactSource = {
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  twoGisUrl: string | null;
  address: string | null;
};

export interface OfferContactDTO {
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  twoGisUrl: string | null;
  address: string | null;
}

export function toOfferContactDTO(c: CompanyContactSource): OfferContactDTO {
  return {
    phone: c.phone,
    whatsapp: c.whatsapp,
    instagram: c.instagram,
    twoGisUrl: c.twoGisUrl,
    address: c.address,
  };
}

export interface CompanyOfferDTO {
  id: string;
  requestId: string;
  price: number;
  currency: string;
  durationValue: number;
  durationUnit: "HOURS" | "DAYS";
  availableAt: string;
  comment: string | null;
  oldPrice: number | null;
  discountPercent: number | null;
  guarantee: string | null;
  extraConditions: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}
