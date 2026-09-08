import { prisma } from "@/lib/prisma";
import { toAdminRequestDTO } from "@/modules/requests/dto";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Requests</h1>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-faint">
              <th className="px-5 py-3 font-medium">Авто</th>
              <th className="px-5 py-3 font-medium">Клиент</th>
              <th className="px-5 py-3 font-medium">Телефон</th>
              <th className="px-5 py-3 font-medium">Город</th>
              <th className="px-5 py-3 font-medium">Статус</th>
              <th className="px-5 py-3 font-medium">Предложений</th>
              <th className="px-5 py-3 font-medium">Создана</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const dto = toAdminRequestDTO(r);
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">
                    {dto.carBrand} {dto.carModel} {dto.carYear ?? ""}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{dto.customerName}</td>
                  <td className="px-5 py-3 text-ink-soft">{dto.customerPhone}</td>
                  <td className="px-5 py-3 text-ink-soft">{dto.city.name}</td>
                  <td className="px-5 py-3">
                    <Badge variant={dto.status === "ACTIVE" ? "success" : "neutral"}>{dto.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{r._count.offers}</td>
                  <td className="px-5 py-3 text-ink-soft">{formatDateTime(dto.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
