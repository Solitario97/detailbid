"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

type Sort = "leads" | "conversion" | "whatsapp" | "offers";

const SORT_LABELS: Record<Sort, string> = {
  leads: "По leads",
  conversion: "По conversion",
  whatsapp: "По WhatsApp",
  offers: "По offers",
};

interface LeaderboardRow {
  companyId: string;
  companyName: string;
  offers: number;
  impressions: number;
  contactReveals: number;
  whatsappClicks: number;
  phoneClicks: number;
  outboundLeads: number;
  conversionPct: number;
  eligibleForConversionRanking: boolean;
}

export function AdminAnalyticsView() {
  const [sort, setSort] = React.useState<Sort>("leads");
  const [data, setData] = React.useState<{
    leaderboard: LeaderboardRow[];
    popularServices: { service: { name: string }; requestCount: number }[];
    popularBrands: { brand: string; requestCount: number }[];
    cityStats: { city: string; requests: number; offers: number; avgOffersPerRequest: number; leads: number }[];
  } | null>(null);

  React.useEffect(() => {
    fetch(`/api/admin/analytics?sort=${sort}`)
      .then((r) => r.json())
      .then(setData);
  }, [sort]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {(Object.keys(SORT_LABELS) as Sort[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${sort === key ? "bg-surface text-ink shadow-sm" : "text-ink-soft"}`}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="mt-6 text-sm text-ink-faint">Загрузка…</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-faint">
                  <th className="px-5 py-3 font-medium">Компания</th>
                  <th className="px-5 py-3 font-medium">Offers</th>
                  <th className="px-5 py-3 font-medium">Impressions</th>
                  <th className="px-5 py-3 font-medium">Contact reveals</th>
                  <th className="px-5 py-3 font-medium">WhatsApp</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Outbound leads</th>
                  <th className="px-5 py-3 font-medium">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((row) => (
                  <tr key={row.companyId} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-ink">{row.companyName}</td>
                    <td className="px-5 py-3 text-ink-soft">{row.offers}</td>
                    <td className="px-5 py-3 text-ink-soft">{row.impressions}</td>
                    <td className="px-5 py-3 text-ink-soft">{row.contactReveals}</td>
                    <td className="px-5 py-3 text-ink-soft">{row.whatsappClicks}</td>
                    <td className="px-5 py-3 text-ink-soft">{row.phoneClicks}</td>
                    <td className="px-5 py-3 text-ink-soft">{row.outboundLeads}</td>
                    <td className="px-5 py-3 text-ink-soft">
                      {row.conversionPct}% {!row.eligibleForConversionRanking && <span className="text-ink-faint">(мало данных)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-ink">Популярные услуги</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.popularServices.map((s) => (
                    <li key={s.service.name} className="flex justify-between text-ink-soft">
                      <span>{s.service.name}</span>
                      <span className="font-medium text-ink">{s.requestCount}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-ink">Популярные марки</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.popularBrands.map((b) => (
                    <li key={b.brand} className="flex justify-between text-ink-soft">
                      <span>{b.brand}</span>
                      <span className="font-medium text-ink">{b.requestCount}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-ink">По городам</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.cityStats.map((c) => (
                    <li key={c.city} className="flex justify-between text-ink-soft">
                      <span>{c.city}</span>
                      <span className="font-medium text-ink">{c.requests} заявок · {c.leads} leads</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
