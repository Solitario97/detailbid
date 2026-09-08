import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { updateCity, deleteCity } from "@/modules/catalog/service";

const updateSchema = z.object({ name: z.string().min(1).max(80) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    const city = await updateCity(id, parsed.data.name);
    return NextResponse.json({ city });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await params;
    await deleteCity(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
