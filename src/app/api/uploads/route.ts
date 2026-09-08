import { NextResponse } from "next/server";
import { fileStorage } from "@/modules/storage/file-storage";
import { getSession } from "@/lib/auth";

// Used by: client wizard (car photos, no auth required — folder "requests")
// and the company profile (logo, requires a company session — folder "logos").
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Некорректная форма" }, { status: 400 });

  const file = formData.get("file");
  const folder = String(formData.get("folder") || "requests");

  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не найден" }, { status: 400 });

  if (folder === "logos") {
    const session = await getSession();
    if (!session || session.role !== "COMPANY") {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }
  }

  try {
    const stored = await fileStorage.put(file, folder === "logos" ? "logos" : "requests");
    return NextResponse.json(stored, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось загрузить файл";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
