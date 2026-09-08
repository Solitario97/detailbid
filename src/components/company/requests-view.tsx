"use client";

import * as React from "react";
import { Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanyRequestCard } from "@/components/company/request-card";
import { OfferDialog, type OfferFormValues } from "@/components/company/offer-dialog";
import type { CompanyRequestDTO } from "@/modules/requests/dto";

type MyOffer = {
  id: string;
  price: number;
  durationValue: number;
  durationUnit: "HOURS" | "DAYS";
  availableAt: string;
  comment: string | null;
  oldPrice: number | null;
  discountPercent: number | null;
  guarantee: string | null;
  extraConditions: string | null;
};

type RequestRow = CompanyRequestDTO & { myOffer: MyOffer | null };

export function CompanyRequestsView({ cities, services }: { cities: { id: string; name: string }[]; services: { id: string; name: string }[] }) {
  const [requests, setRequests] = React.useState<RequestRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({ cityId: "", serviceId: "", carBrand: "", carCondition: "", onlyWithoutMyOffer: false });
  const [activeRequest, setActiveRequest] = React.useState<RequestRow | null>(null);

  const loadRequests = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.cityId) params.set("cityId", filters.cityId);
    if (filters.serviceId) params.set("serviceId", filters.serviceId);
    if (filters.carBrand) params.set("carBrand", filters.carBrand);
    if (filters.carCondition) params.set("carCondition", filters.carCondition);
    if (filters.onlyWithoutMyOffer) params.set("onlyWithoutMyOffer", "1");

    const res = await fetch(`/api/company/requests?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
    }
    setLoading(false);
  }, [filters]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadRequests sets the loading flag before an intentional refetch on `filters` change
    loadRequests();
  }, [loadRequests]);

  async function handleOfferSubmit(values: OfferFormValues): Promise<string | null> {
    if (!activeRequest) return "Заявка не выбрана";

    const payload = {
      price: Number(values.price),
      durationValue: Number(values.durationValue),
      durationUnit: values.durationUnit,
      availableAt: new Date(values.availableAt).toISOString(),
      comment: values.comment || undefined,
      oldPrice: values.oldPrice ? Number(values.oldPrice) : undefined,
      discountPercent: values.discountPercent ? Number(values.discountPercent) : undefined,
      guarantee: values.guarantee || undefined,
      extraConditions: values.extraConditions || undefined,
    };

    const url = activeRequest.myOffer
      ? `/api/company/offers/${activeRequest.myOffer.id}`
      : `/api/company/requests/${activeRequest.id}/offers`;
    const method = activeRequest.myOffer ? "PATCH" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) return data.error || "Не удалось отправить предложение";

    setActiveRequest(null);
    await loadRequests();
    return null;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Новые заявки</h1>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Select value={filters.cityId} onChange={(e) => setFilters((f) => ({ ...f, cityId: e.target.value }))} className="w-auto">
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={filters.serviceId} onChange={(e) => setFilters((f) => ({ ...f, serviceId: e.target.value }))} className="w-auto">
          <option value="">Все услуги</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select value={filters.carCondition} onChange={(e) => setFilters((f) => ({ ...f, carCondition: e.target.value }))} className="w-auto">
          <option value="">Новый / с пробегом</option>
          <option value="NEW">Новый</option>
          <option value="USED">С пробегом</option>
        </Select>
        <Button
          variant={filters.onlyWithoutMyOffer ? "dark" : "outline"}
          size="sm"
          onClick={() => setFilters((f) => ({ ...f, onlyWithoutMyOffer: !f.onlyWithoutMyOffer }))}
        >
          Без моего предложения
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-sm text-ink-faint">Загрузка…</p>
        ) : requests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-10 text-center">
            <p className="text-sm text-ink-soft">Пока нет заявок по выбранным фильтрам.</p>
          </div>
        ) : (
          requests.map((r) => (
            <CompanyRequestCard
              key={r.id}
              request={r}
              hasMyOffer={!!r.myOffer}
              onOfferClick={() => setActiveRequest(r)}
            />
          ))
        )}
      </div>

      <OfferDialog
        open={!!activeRequest}
        onClose={() => setActiveRequest(null)}
        requestTitle={activeRequest ? `${activeRequest.carBrand} ${activeRequest.carModel}` : ""}
        initialValues={
          activeRequest?.myOffer
            ? {
                price: String(activeRequest.myOffer.price),
                durationValue: String(activeRequest.myOffer.durationValue),
                durationUnit: activeRequest.myOffer.durationUnit,
                availableAt: activeRequest.myOffer.availableAt.slice(0, 10),
                comment: activeRequest.myOffer.comment ?? "",
                oldPrice: activeRequest.myOffer.oldPrice ? String(activeRequest.myOffer.oldPrice) : "",
                discountPercent: activeRequest.myOffer.discountPercent ? String(activeRequest.myOffer.discountPercent) : "",
                guarantee: activeRequest.myOffer.guarantee ?? "",
                extraConditions: activeRequest.myOffer.extraConditions ?? "",
              }
            : undefined
        }
        onSubmit={handleOfferSubmit}
      />
    </div>
  );
}
