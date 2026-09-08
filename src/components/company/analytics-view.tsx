"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatKzt } from "@/lib/utils";

type TimeRange = "today" | "7d" | "30d" | "all";

const RANGE_LABELS: Record<TimeRange, string> = {
  today: "Сегодня",
  "7d": "7 дней",
  "30d": "30 дней",
  all: "Всё время",
};

interface Stats {
  offersCount: number;
  impressions: number;
  contactReveals: number;
  outboundLeads: number;
  whatsappClicks: number;
  phoneClicks: number;
  instagramClicks: number;
  twoGisClicks: number;
  contactConversionPct: number;
  outboundConversionPct: number;
  offerToOutboundConversionPct: number;
}

interface BestOffer {
  carBrand: string;
  carModel: string;
  services: string[];
  price: number;
  currency: string;
  impressions: number;
  contactReveals: number;
  whatsappClicks: number;
}

export function CompanyAnalyticsView() {
  const [range, setRange] = React.useState<TimeRange>("30d");
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [bestOffer, setBestOffer] = React.useState<BestOffer | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the loading flag before an intentional refetch on `range` change
    setLoading(true);
    fetch(`/api/company/analytics?range=${range}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setBestOffer(data.bestOffer);
      })
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Ваш результат</h1>
        <div className="flex gap-1 rounded-full bg-surface-muted p-1">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                range === key ? "bg-surface text-ink shadow-sm" : "text-ink-soft"
              }`}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {loading || !stats ? (
        <p className="mt-6 text-sm text-ink-faint">Загрузка…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Предложений" value={stats.offersCount} />
            <StatCard label="Просмотров" value={stats.impressions} />
            <StatCard label="Открыли контакты" value={stats.contactReveals} />
            <StatCard label="Перешли в WhatsApp" value={stats.whatsappClicks} />
            <StatCard label="Звонков" value={stats.phoneClicks} />
            <StatCard label="Outbound-лиды" value={stats.outboundLeads} />
            <StatCard label="Конверсия в контакт" value={`${stats.contactConversionPct}%`} />
            <StatCard label="Конверсия в outbound" value={`${stats.outboundConversionPct}%`} />
          </div>

          {bestOffer && (
            <Card className="mt-8">
              <CardContent>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Ваше самое эффективное предложение</p>
                <h3 className="mt-1.5 text-lg font-semibold text-ink">
                  {bestOffer.carBrand} {bestOffer.carModel}
                </h3>
                <p className="text-sm text-ink-soft">{bestOffer.services.join(", ")}</p>
                <p className="mt-2 text-xl font-semibold text-ink">{formatKzt(bestOffer.price)}</p>
                <div className="mt-3 flex gap-4 text-sm text-ink-soft">
                  <span>{bestOffer.impressions} просмотров</span>
                  <span>{bestOffer.contactReveals} открытий контактов</span>
                  <span>{bestOffer.whatsappClicks} WhatsApp</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      </CardContent>
    </Card>
  );
}
