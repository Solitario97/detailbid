"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ServiceRow {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export function ServicesManager({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setBusy(false);
    router.refresh();
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={addService} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новая услуга" className="max-w-xs" />
        <Button type="submit" disabled={busy}>Добавить</Button>
      </form>

      <div className="mt-6 space-y-2">
        {services.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-medium text-ink">{s.name}</span>
              <Badge variant={s.isActive ? "success" : "neutral"}>{s.isActive ? "активна" : "скрыта"}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleActive(s.id, s.isActive)}>
                {s.isActive ? "Скрыть" : "Показать"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>Удалить</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CityRow {
  id: string;
  name: string;
}

export function CitiesManager({ cities }: { cities: CityRow[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function addCity(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    await fetch("/api/admin/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/cities/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={addCity} className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новый город" className="max-w-xs" />
        <Button type="submit" disabled={busy}>Добавить</Button>
      </form>

      <div className="mt-6 space-y-2">
        {cities.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-3">
            <span className="font-medium text-ink">{c.name}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(c.id)}>Удалить</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
