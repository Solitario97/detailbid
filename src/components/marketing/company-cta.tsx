import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function CompanyCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-accent-dark p-10 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Вы детейлинг-центр?</h2>
          <p className="mt-2 max-w-md text-white/70">
            Получайте заявки от клиентов вашего города и отправляйте предложения — без обзвона и рекламы.
          </p>
        </div>
        <Link href="/company/register" className={buttonVariants({ size: "lg" })}>
          Регистрация для компаний
        </Link>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-ink-faint sm:flex-row sm:items-center sm:px-6">
        <p>© {new Date().getFullYear()} DetailBid</p>
        <div className="flex gap-6">
          <Link href="/company/login" className="hover:text-ink-soft">Вход для компаний</Link>
          <Link href="/admin/login" className="hover:text-ink-soft">Админ</Link>
        </div>
      </div>
    </footer>
  );
}
