"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function CompanyLoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || data.role !== "COMPANY") {
      setError(data.error || "Неверный email или пароль");
      return;
    }
    router.push("/company/requests");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="detail@example.com" />
      </div>
      <div>
        <Label>Пароль</Label>
        <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Войти
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Нет аккаунта? <Link href="/company/register" className="font-medium text-brand">Зарегистрироваться</Link>
      </p>
    </form>
  );
}

export function CompanyRegisterForm({ cities }: { cities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    cityId: cities[0]?.id ?? "",
    phone: "",
    whatsapp: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Не удалось зарегистрироваться");
      return;
    }
    router.push("/company/requests");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Название компании</Label>
        <Input required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Detail Pro" />
      </div>
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
        <Label>Email</Label>
        <Input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
      </div>
      <div>
        <Label>Пароль</Label>
        <Input type="password" required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Телефон</Label>
          <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+7 700 000 00 00" />
        </div>
        <div>
          <Label>WhatsApp</Label>
          <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="+7 700 000 00 00" />
        </div>
      </div>
      {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Зарегистрироваться
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Уже есть аккаунт? <Link href="/company/login" className="font-medium text-brand">Войти</Link>
      </p>
    </form>
  );
}
