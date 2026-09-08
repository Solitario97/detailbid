const steps = [
  { n: "1", title: "Оставьте заявку", desc: "Выберите услуги, расскажите об автомобиле — это займёт меньше двух минут." },
  { n: "2", title: "Получите предложения", desc: "Детейлинг-центры вашего города видят заявку и присылают цену и сроки." },
  { n: "3", title: "Сравните цены и сроки", desc: "Смотрите цену, срок выполнения и ближайшую дату приёма — без звонков." },
  { n: "4", title: "Выберите детейлинг", desc: "Нажмите «Связаться» — и только тогда откроются контакты компании." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Как это работает</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.n} className="rounded-3xl border border-border bg-surface p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
              {step.n}
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
