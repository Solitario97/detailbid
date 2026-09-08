import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatKzt, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const offers = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      company: { select: { name: true } },
      request: { select: { carBrand: true, carModel: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Offers</h1>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-faint">
              <th className="px-5 py-3 font-medium">Компания</th>
              <th className="px-5 py-3 font-medium">Заявка</th>
              <th className="px-5 py-3 font-medium">Цена</th>
              <th className="px-5 py-3 font-medium">Статус</th>
              <th className="px-5 py-3 font-medium">Создано</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-ink">{o.company.name}</td>
                <td className="px-5 py-3 text-ink-soft">{o.request.carBrand} {o.request.carModel}</td>
                <td className="px-5 py-3 text-ink-soft">{formatKzt(o.price)}</td>
                <td className="px-5 py-3">
                  <Badge variant={o.status === "ACTIVE" ? "success" : "neutral"}>{o.status}</Badge>
                </td>
                <td className="px-5 py-3 text-ink-soft">{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
