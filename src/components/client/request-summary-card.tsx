import { Badge } from "@/components/ui/badge";
import { CarThumbnail } from "@/components/ui/car-thumbnail";
import type { PublicRequestDTO } from "@/modules/requests/dto";

export function RequestSummaryCard({ request, offersCount }: { request: PublicRequestDTO; offersCount: number }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-4">
        <CarThumbnail src={request.images[0]} alt={`${request.carBrand} ${request.carModel}`} />
        <div className="min-w-0 w-full flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Моя заявка</p>
          <h1 className="mt-1.5 break-words text-2xl font-semibold tracking-tight text-ink">
            {request.carBrand} {request.carModel}
            {request.carYear ? ` · ${request.carYear}` : ""}
          </h1>
          {/* Each label below is short ("Новый"/"С пробегом", a city name) and
              should never break mid-word on a narrow screen. whitespace-nowrap
              keeps each one intact; flex-wrap on the row still lets a whole
              label drop to the next line as a group if it doesn't fit. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
            <span className="whitespace-nowrap">{request.carCondition === "NEW" ? "Новый" : "С пробегом"}</span>
            <span aria-hidden className="whitespace-nowrap">·</span>
            <span className="whitespace-nowrap">{request.city.name}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {request.services.map((s) => (
          <Badge key={s.id} variant="neutral">
            {s.name}
          </Badge>
        ))}
      </div>

      {request.comment && <p className="mt-4 break-words text-sm text-ink-soft">{request.comment}</p>}

      <div className="mt-6 border-t border-border pt-5">
        {offersCount === 0 ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Получаем предложения от детейлинг-центров
          </p>
        ) : (
          <p className="text-sm font-medium text-ink">
            Получено предложений: <span className="text-brand">{offersCount}</span>
          </p>
        )}
      </div>
    </div>
  );
}
