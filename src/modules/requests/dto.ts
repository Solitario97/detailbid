// ---------------------------------------------------------------------------
// DTO boundary for Request (see docs/SECURITY.md §1).
//
// Rule: every mapper below builds its return object field-by-field. None of
// them ever spreads the source object (`{ ...request }`) — that is what
// makes it structurally impossible for `toCompanyRequestDTO` to leak
// `customerName` / `customerPhone` / `customerWhatsapp`, even if a future
// change accidentally fetches those columns upstream.
// ---------------------------------------------------------------------------

export type ServiceRef = { id: string; name: string; slug: string };
export type CityRef = { id: string; name: string; slug: string };

// --- shapes the mappers are allowed to read from -----------------------------

export type RequestSourceForCompany = {
  id: string;
  city: CityRef;
  carBrand: string;
  carModel: string;
  carYear: number | null;
  carCondition: "NEW" | "USED";
  comment: string | null;
  desiredDate: Date | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  services: { service: ServiceRef }[];
  images: { url: string }[];
};

export type RequestSourceForClient = RequestSourceForCompany & {
  publicId: string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string | null;
};

export type RequestSourceForAdmin = RequestSourceForClient;

// --- DTO output types ---------------------------------------------------------

export interface CompanyRequestDTO {
  id: string;
  city: CityRef;
  carBrand: string;
  carModel: string;
  carYear: number | null;
  carCondition: "NEW" | "USED";
  comment: string | null;
  desiredDate: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
  services: ServiceRef[];
  images: string[];
}

export interface PublicRequestDTO extends CompanyRequestDTO {
  publicId: string;
  customerName: string;
}

export interface AdminRequestDTO extends PublicRequestDTO {
  customerPhone: string;
  customerWhatsapp: string | null;
}

// --- mappers -------------------------------------------------------------------

export function toCompanyRequestDTO(r: RequestSourceForCompany): CompanyRequestDTO {
  return {
    id: r.id,
    city: { id: r.city.id, name: r.city.name, slug: r.city.slug },
    carBrand: r.carBrand,
    carModel: r.carModel,
    carYear: r.carYear,
    carCondition: r.carCondition,
    comment: r.comment,
    desiredDate: r.desiredDate ? r.desiredDate.toISOString() : null,
    status: r.status,
    expiresAt: r.expiresAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    services: r.services.map((s) => ({ id: s.service.id, name: s.service.name, slug: s.service.slug })),
    images: r.images.map((i) => i.url),
  };
}

export function toPublicRequestDTO(r: RequestSourceForClient): PublicRequestDTO {
  return {
    ...toCompanyRequestDTO(r),
    publicId: r.publicId,
    customerName: r.customerName,
  };
}

export function toAdminRequestDTO(r: RequestSourceForAdmin): AdminRequestDTO {
  return {
    ...toPublicRequestDTO(r),
    customerPhone: r.customerPhone,
    customerWhatsapp: r.customerWhatsapp,
  };
}
