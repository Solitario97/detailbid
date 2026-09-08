import { NextResponse } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/guards";
import {
  getCompanyLeaderboard,
  getPopularServices,
  getPopularBrands,
  getCityStats,
  type LeaderboardSort,
} from "@/modules/analytics/service";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const url = new URL(request.url);
    const sort = (url.searchParams.get("sort") as LeaderboardSort | null) || "leads";

    const [leaderboard, popularServices, popularBrands, cityStats] = await Promise.all([
      getCompanyLeaderboard(sort),
      getPopularServices(),
      getPopularBrands(),
      getCityStats(),
    ]);

    return NextResponse.json({ leaderboard, popularServices, popularBrands, cityStats });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
