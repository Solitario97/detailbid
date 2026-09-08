import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-dark text-sm font-bold text-white">
            D
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-ink">DetailBid</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-soft sm:flex">
          <Link href="/#how-it-works" className="hover:text-ink">Как это работает</Link>
          <Link href="/company/register" className="hover:text-ink">Для детейлинг-центров</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/company/login" className="hidden text-sm font-medium text-ink-soft hover:text-ink sm:block">
            Вход для компаний
          </Link>
          <Link href="/request/new" className={buttonVariants({ size: "sm" })}>
            Получить предложения
          </Link>
        </div>
      </div>
    </header>
  );
}
