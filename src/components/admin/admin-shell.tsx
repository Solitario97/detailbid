"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/cities", label: "Cities" },
  { href: "/admin/analytics", label: "Analytics" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-accent-dark px-4 py-6 lg:block">
          <Link href="/admin" className="mb-8 flex items-center gap-2 px-2">
            <Image src="/autopick-logo.png" alt="AutoPick" width={40} height={40} className="rounded-lg object-contain" />
            <span className="text-sm font-semibold text-white">Admin</span>
          </Link>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="mt-8 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </aside>

        <div className="flex-1">
          <nav className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
                  pathname === item.href ? "bg-surface-muted text-ink" : "text-ink-soft"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
