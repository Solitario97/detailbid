import { NextResponse } from "next/server";
import { requireCompanySession, AuthError } from "@/lib/guards";
import { listActiveRequestsForCompany } from "@/modules/requests/service";
import { toCompanyRequestDTO } from "@/modules/requests/dto";

export async function GET(request: Request) {
  try {
    const session = await requireCompanySession();
    const url = new URL(request.url);

    const requests = await listActiveRequestsForCompany({
      companyId: session.companyId,
      cityId: url.searchParams.get("cityId") || undefined,
      serviceId: url.searchParams.get("serviceId") || undefined,
      carBrand: url.searchParams.get("carBrand") || undefined,
      carCondition: (url.searchParams.get("carCondition") as "NEW" | "USED" | null) || undefined,
      onlyWithoutMyOffer: url.searchParams.get("onlyWithoutMyOffer") === "1",
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        ...toCompanyRequestDTO(r),
        myOffer: r.offers[0]
          ? {
              id: r.offers[0].id,
              price: r.offers[0].price,
              durationValue: r.offers[0].durationValue,
              durationUnit: r.offers[0].durationUnit,
              availableAt: r.offers[0].availableAt.toISOString(),
              comment: r.offers[0].comment,
              oldPrice: r.offers[0].oldPrice,
              discountPercent: r.offers[0].discountPercent,
              guarantee: r.offers[0].guarantee,
              extraConditions: r.offers[0].extraConditions,
            }
          : null,
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
