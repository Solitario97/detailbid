"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

const NAV = [
  { href: "/company/requests", label: "Заявки" },
  { href: "/company/analytics", label: "Аналитика" },
  { href: "/company/profile", label: "Профиль" },
];

export function DashboardShell({
  companyName,
  status,
  children,
}: {
  companyName: string;
  status: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/company/requests" className="flex items-center gap-2">
              <Image src="/autopick-logo.png" alt="AutoPick" width={40} height={40} className="rounded-lg object-contain" />
              <span className="text-sm font-semibold text-ink">{companyName}</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    pathname === item.href ? "bg-surface-muted text-ink" : "text-ink-soft hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-3 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
                pathname === item.href ? "bg-surface-muted text-ink" : "text-ink-soft"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {status !== "APPROVED" && (
        <div
          className={cn(
            "px-4 py-3 text-center text-sm font-medium sm:px-6",
            status === "PENDING" ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger"
          )}
        >
          {status === "PENDING"
            ? "Ваша компания ожидает подтверждения администратора. Вы сможете отправлять предложения после одобрения."
            : "Ваша компания заблокирована администратором. Обратитесь в поддержку."}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
