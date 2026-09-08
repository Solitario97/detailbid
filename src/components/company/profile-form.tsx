"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface CompanyProfile {
  name: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  twoGisUrl: string | null;
  address: string | null;
  cityId: string;
}

export function CompanyProfileForm({ profile, cities }: { profile: CompanyProfile; cities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: profile.name,
    description: profile.description ?? "",
    logoUrl: profile.logoUrl ?? "",
    phone: profile.phone ?? "",
    whatsapp: profile.whatsapp ?? "",
    instagram: profile.instagram ?? "",
    twoGisUrl: profile.twoGisUrl ?? "",
    address: profile.address ?? "",
    cityId: profile.cityId,
  });
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleLogoUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "logos");
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      update("logoUrl", data.url);
    }
    setUploading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/company/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMessage(res.ok ? "Профиль сохранён" : "Не удалось сохранить профиль");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <Label>Логотип</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-surface-muted">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-ink-faint">{form.name[0]}</span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={(e) => handleLogoUpload(e.target.files?.[0])} className="text-sm" />
          {uploading && <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />}
        </div>
      </div>

      <div>
        <Label>Название компании</Label>
        <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
      </div>
      <div>
        <Label>Описание</Label>
        <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} />
      </div>
      <div>
        <Label>Город</Label>
        <Select value={form.cityId} onChange={(e) => update("cityId", e.target.value)}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Адрес</Label>
        <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Телефон</Label>
          <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
        </div>
        <div>
          <Label>Instagram</Label>
          <Input value={form.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="@username" />
        </div>
        <div>
          <Label>Ссылка на 2GIS</Label>
          <Input value={form.twoGisUrl} onChange={(e) => update("twoGisUrl", e.target.value)} />
        </div>
      </div>

      {message && <p className="text-sm text-ink-soft">{message}</p>}

      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Сохранить
      </Button>
    </form>
  );
}
