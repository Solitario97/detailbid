import { Card, CardContent } from "@/components/ui/card";
import { getAdminDashboard, getCompanyLeaderboard } from "@/modules/analytics/service";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [dashboard, leaderboard] = await Promise.all([getAdminDashboard(), getCompanyLeaderboard("leads")]);

  const cards = [
    { label: "Заявок сегодня", value: dashboard.requestsToday },
    { label: "Заявок за неделю", value: dashboard.requestsThisWeek },
    { label: "Активных заявок", value: dashboard.activeRequests },
    { label: "Зарегистрировано компаний", value: dashboard.registeredCompanies },
    { label: "Активных компаний", value: dashboard.activeCompanies },
    { label: "Предложений всего", value: dashboard.totalOffers },
    { label: "Среднее предложений/заявку", value: dashboard.avgOffersPerRequest },
    { label: "Contact reveals", value: dashboard.contactReveals },
    { label: "Конверсия", value: `${dashboard.conversionPct}%` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className="text-sm text-ink-soft">{c.label}</p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold tracking-tight text-ink">Top by leads</h2>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-faint">
              <th className="px-5 py-3 font-medium">Компания</th>
              <th className="px-5 py-3 font-medium">Предложений</th>
              <th className="px-5 py-3 font-medium">Leads</th>
              <th className="px-5 py-3 font-medium">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.slice(0, 5).map((row) => (
              <tr key={row.companyId} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium text-ink">{row.companyName}</td>
                <td className="px-5 py-3 text-ink-soft">{row.offers}</td>
                <td className="px-5 py-3 text-ink-soft">{row.contactReveals}</td>
                <td className="px-5 py-3 text-ink-soft">{row.conversionPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
