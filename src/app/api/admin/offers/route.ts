import { NextResponse } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdminSession();
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        company: { select: { id: true, name: true } },
        request: { select: { id: true, publicId: true, carBrand: true, carModel: true } },
      },
    });
    return NextResponse.json({ offers });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
