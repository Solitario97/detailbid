import { NextResponse } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { getAdminDashboard, getCompanyLeaderboard } from "@/modules/analytics/service";

export async function GET() {
  try {
    await requireAdminSession();
    const [dashboard, leaderboard] = await Promise.all([
      getAdminDashboard(),
      getCompanyLeaderboard("leads"),
    ]);
    return NextResponse.json({ dashboard, topByLeads: leaderboard.slice(0, 5) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
