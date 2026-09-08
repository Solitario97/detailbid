import { Badge } from "@/components/ui/badge";
import { formatKzt } from "@/lib/utils";

const examples = [
  { company: "Detail Pro", price: 120000, duration: "2 дня", date: "10 сентября", tag: "Проверенная" },
  { company: "Auto Spa", price: 135000, duration: "1 день", date: "9 сентября", tag: null },
  { company: "Premium Detailing", price: 98000, duration: "3 дня", date: "12 сентября", tag: null },
];

export function ExampleOffers() {
  return (
    <section className="bg-surface-muted py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Так выглядят предложения
          </h2>
          <p className="mt-2 text-ink-soft">
            Пример карточек на странице вашей заявки — цена, срок и дата приёма видны сразу.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {examples.map((o) => (
            <div key={o.company} className="rounded-3xl border border-border bg-surface p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-dark text-sm font-bold text-white">
                  {o.company[0]}
                </div>
                {o.tag && <Badge variant="brand">{o.tag}</Badge>}
              </div>
              <p className="mt-4 text-sm font-medium text-ink-soft">{o.company}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{formatKzt(o.price)}</p>
              <div className="mt-4 flex items-center gap-4 text-sm text-ink-soft">
                <span>Срок: {o.duration}</span>
                <span>Приём: {o.date}</span>
              </div>
              <div className="mt-5 h-11 w-full rounded-full bg-surface-muted text-center text-sm font-medium leading-[44px] text-ink-faint">
                Связаться
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
