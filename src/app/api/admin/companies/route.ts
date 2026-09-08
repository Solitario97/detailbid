import { NextResponse } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { listCompaniesForAdmin } from "@/modules/companies/service";

export async function GET() {
  try {
    await requireAdminSession();
    const companies = await listCompaniesForAdmin();
    return NextResponse.json({ companies });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
