import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { listAllServices, createService } from "@/modules/catalog/service";

const createSchema = z.object({ name: z.string().min(1).max(80), sortOrder: z.coerce.number().int().optional() });

export async function GET() {
  try {
    await requireAdminSession();
    const services = await listAllServices();
    return NextResponse.json({ services });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    const service = await createService(parsed.data.name, parsed.data.sortOrder ?? 0);
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
