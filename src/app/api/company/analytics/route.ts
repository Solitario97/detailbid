import { NextResponse } from "next/server";
import { requireCompanySession, AuthError } from "@/lib/guards";
import { getCompanyStats, getCompanyBestOffer, type TimeRange } from "@/modules/analytics/service";

export async function GET(request: Request) {
  try {
    const session = await requireCompanySession();
    const url = new URL(request.url);
    const range = (url.searchParams.get("range") as TimeRange | null) || "30d";

    const [stats, bestOffer] = await Promise.all([
      getCompanyStats(session.companyId, range),
      getCompanyBestOffer(session.companyId),
    ]);

    return NextResponse.json({ stats, bestOffer });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
