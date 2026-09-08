"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

type Ref = { id: string; name: string };

const STEPS = ["Услуги", "Автомобиль", "Город и детали", "Контакты"] as const;

export function RequestWizard({ cities, services }: { cities: Ref[]; services: Ref[] }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const [form, setForm] = React.useState({
    serviceIds: [] as string[],
    carBrand: "",
    carModel: "",
    carYear: "",
    carCondition: "" as "" | "NEW" | "USED",
    cityId: cities[0]?.id ?? "",
    desiredDate: "",
    comment: "",
    imageUrls: [] as string[],
    customerName: "",
    customerPhone: "",
    customerWhatsapp: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }));
  }

  const stepValid = React.useMemo(() => {
    switch (step) {
      case 0:
        return form.serviceIds.length > 0;
      case 1:
        return form.carBrand.trim().length > 0 && form.carModel.trim().length > 0 && form.carCondition !== "";
      case 2:
        return form.cityId.length > 0;
      case 3:
        return form.customerName.trim().length > 0 && form.customerPhone.trim().length >= 6;
      default:
        return false;
    }
  }, [step, form]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 10 - form.imageUrls.length)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "requests");
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          uploaded.push(data.url);
        }
      }
      update("imageUrls", [...form.imageUrls, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceIds: form.serviceIds,
          carBrand: form.carBrand,
          carModel: form.carModel,
          carYear: form.carYear ? Number(form.carYear) : undefined,
          carCondition: form.carCondition,
          cityId: form.cityId,
          desiredDate: form.desiredDate || undefined,
          comment: form.comment || undefined,
          imageUrls: form.imageUrls,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerWhatsapp: form.customerWhatsapp || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось отправить заявку");
        setSubmitting(false);
        return;
      }

      try {
        localStorage.setItem(
          `detailbid:request:${data.publicId}`,
          JSON.stringify({ token: data.token, createdAt: Date.now() })
        );
      } catch {
        // localStorage unavailable — the URL below still carries the token.
      }

      router.push(`/r/${data.publicId}?t=${encodeURIComponent(data.token)}`);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < step ? "bg-brand text-brand-ink" : i === step ? "bg-accent-dark text-white" : "bg-surface-muted text-ink-faint"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 rounded-full", i < step ? "bg-brand" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1">
        {step === 0 && (
          <StepShell title="Что хотите сделать?" subtitle="Можно выбрать сразу несколько услуг">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {services.map((s) => {
                const active = form.serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleService(s.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-3.5 text-left text-sm font-medium transition-colors",
                      active
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-border bg-surface text-ink hover:border-ink/20"
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title="Ваш автомобиль">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Марка</Label>
                <Input value={form.carBrand} onChange={(e) => update("carBrand", e.target.value)} placeholder="BMW" />
              </div>
              <div>
                <Label>Модель</Label>
                <Input value={form.carModel} onChange={(e) => update("carModel", e.target.value)} placeholder="X5" />
              </div>
              <div>
                <Label>Год (опционально)</Label>
                <Input
                  type="number"
                  value={form.carYear}
                  onChange={(e) => update("carYear", e.target.value)}
                  placeholder="2023"
                />
              </div>
              <div>
                <Label>Состояние</Label>
                <div className="flex h-12 items-center gap-4">
                  {(["NEW", "USED"] as const).map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="radio"
                        name="carCondition"
                        checked={form.carCondition === c}
                        onChange={() => update("carCondition", c)}
                        className="h-4 w-4 accent-[var(--brand)]"
                      />
                      {c === "NEW" ? "Новый" : "С пробегом"}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title="Где находится автомобиль?">
            <div className="space-y-4">
              <div>
                <Label>Город</Label>
                <Select value={form.cityId} onChange={(e) => update("cityId", e.target.value)}>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Желаемая дата (опционально)</Label>
                <Input type="date" value={form.desiredDate} onChange={(e) => update("desiredDate", e.target.value)} />
              </div>
              <div>
                <Label>Комментарий (опционально)</Label>
                <Textarea
                  value={form.comment}
                  onChange={(e) => update("comment", e.target.value)}
                  placeholder="Например: есть мелкие царапины на переднем крыле"
                />
              </div>
              <div>
                <Label>Фото автомобиля (опционально)</Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleUpload(e.target.files)}
                  className="block w-full text-sm text-ink-soft file:mr-4 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink"
                />
                {uploading && <p className="mt-2 text-sm text-ink-faint">Загрузка…</p>}
                {form.imageUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.imageUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt="" className="h-16 w-16 rounded-xl object-cover" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title="Как сообщить о предложениях?">
            <div className="space-y-4">
              <div>
                <Label>Имя</Label>
                <Input value={form.customerName} onChange={(e) => update("customerName", e.target.value)} placeholder="Иван" />
              </div>
              <div>
                <Label>Телефон</Label>
                <Input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => update("customerPhone", e.target.value)}
                  placeholder="+7 700 000 00 00"
                />
              </div>
              <div>
                <Label>WhatsApp (если отличается от телефона)</Label>
                <Input
                  type="tel"
                  value={form.customerWhatsapp}
                  onChange={(e) => update("customerWhatsapp", e.target.value)}
                  placeholder="+7 700 000 00 00"
                />
              </div>
              <p className="text-xs text-ink-faint">
                Ваши контакты видны только вам. Детейлинг-компании не получают их — они видят только заявку.
              </p>
            </div>
          </StepShell>
        )}

        {error && <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} className={cn(step === 0 && "invisible")}>
          Назад
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
            Продолжить
          </Button>
        ) : (
          <Button disabled={!stepValid || submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Получить предложения
          </Button>
        )}
      </div>
    </div>
  );
}

function StepShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}
