import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { setCompanyStatus, updateCompanyProfile } from "@/modules/companies/service";
import { updateCompanyProfileSchema } from "@/modules/companies/types";

const statusSchema = z.object({ status: z.enum(["PENDING", "APPROVED", "BLOCKED"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const statusParsed = statusSchema.safeParse(body);
    if (statusParsed.success) {
      const company = await setCompanyStatus(id, statusParsed.data.status);
      return NextResponse.json({ company });
    }

    const profileParsed = updateCompanyProfileSchema.safeParse(body);
    if (profileParsed.success) {
      const company = await updateCompanyProfile(id, profileParsed.data);
      return NextResponse.json({ company });
    }

    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
