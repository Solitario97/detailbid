import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { listCities, createCity } from "@/modules/catalog/service";

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function GET() {
  try {
    await requireAdminSession();
    const cities = await listCities();
    return NextResponse.json({ cities });
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
    const city = await createCity(parsed.data.name);
    return NextResponse.json({ city }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
