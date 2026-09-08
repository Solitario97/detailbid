import { NextResponse } from "next/server";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { toPublicRequestDTO } from "@/modules/requests/dto";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const { publicId } = await params;
  const token = new URL(request.url).searchParams.get("t");
  if (!token) return NextResponse.json({ error: "Токен не указан" }, { status: 401 });

  const found = await getRequestByPublicIdAndToken(publicId, token);
  if (!found) return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });

  await prisma.analyticsEvent.create({ data: { type: "REQUEST_VIEWED", requestId: found.id } }).catch(() => {});

  return NextResponse.json(toPublicRequestDTO(found));
}
