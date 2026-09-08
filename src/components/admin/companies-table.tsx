"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CompanyRow {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "BLOCKED";
  city: { name: string };
  createdAt: string;
  _count: { offers: number; contactReveals: number };
}

const STATUS_VARIANT = { PENDING: "brand", APPROVED: "success", BLOCKED: "danger" } as const;

export function CompaniesTable({ companies }: { companies: CompanyRow[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);

  async function setStatus(id: string, status: "PENDING" | "APPROVED" | "BLOCKED") {
    setPending(id);
    await fetch(`/api/admin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-ink-faint">
            <th className="px-5 py-3 font-medium">Компания</th>
            <th className="px-5 py-3 font-medium">Город</th>
            <th className="px-5 py-3 font-medium">Статус</th>
            <th className="px-5 py-3 font-medium">Предложений</th>
            <th className="px-5 py-3 font-medium">Leads</th>
            <th className="px-5 py-3 font-medium">Действия</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0">
              <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
              <td className="px-5 py-3 text-ink-soft">{c.city.name}</td>
              <td className="px-5 py-3">
                <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
              </td>
              <td className="px-5 py-3 text-ink-soft">{c._count.offers}</td>
              <td className="px-5 py-3 text-ink-soft">{c._count.contactReveals}</td>
              <td className="px-5 py-3">
                <div className="flex gap-2">
                  {c.status !== "APPROVED" && (
                    <Button size="sm" variant="outline" disabled={pending === c.id} onClick={() => setStatus(c.id, "APPROVED")}>
                      Approve
                    </Button>
                  )}
                  {c.status !== "BLOCKED" && (
                    <Button size="sm" variant="ghost" disabled={pending === c.id} onClick={() => setStatus(c.id, "BLOCKED")}>
                      Block
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
