import { NextResponse } from "next/server";
import { requireCompanySession, AuthError } from "@/lib/guards";
import { getCompanyProfile, updateCompanyProfile } from "@/modules/companies/service";
import { updateCompanyProfileSchema } from "@/modules/companies/types";

export async function GET() {
  try {
    const session = await requireCompanySession();
    const company = await getCompanyProfile(session.companyId);
    return NextResponse.json({ company });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireCompanySession();
    const parsed = updateCompanyProfileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Некорректные данные", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const company = await updateCompanyProfile(session.companyId, parsed.data);
    return NextResponse.json({ company });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
