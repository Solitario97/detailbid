import { NextResponse } from "next/server";
import { requireAdminSession, AuthError } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { toAdminRequestDTO } from "@/modules/requests/dto";

export async function GET() {
  try {
    await requireAdminSession();
    const requests = await prisma.request.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        publicId: true,
        customerName: true,
        customerPhone: true,
        customerWhatsapp: true,
        city: { select: { id: true, name: true, slug: true } },
        carBrand: true,
        carModel: true,
        carYear: true,
        carCondition: true,
        comment: true,
        desiredDate: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        services: { select: { service: { select: { id: true, name: true, slug: true } } } },
        images: { select: { url: true } },
        _count: { select: { offers: true } },
      },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({ ...toAdminRequestDTO(r), offersCount: r._count.offers })),
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
