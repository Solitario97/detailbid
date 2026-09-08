import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-accent-dark text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 80% 0%, rgba(255,90,31,0.35) 0%, rgba(13,13,16,0) 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          Маркетплейс детейлинг-услуг · Казахстан
        </div>

        <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Получите цены от детейлинг-центров вашего города
        </h1>

        <p className="mt-5 max-w-xl text-lg text-white/70">
          Не обзванивайте компании. Опишите автомобиль и нужные услуги — детейлинг-центры сами
          предложат цену и ближайшую дату приёма.
        </p>

        <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/request/new" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
            Получить предложения
          </Link>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
            {["Бесплатно", "Без регистрации", "Несколько предложений"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
