import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { CompanyRequestDTO } from "@/modules/requests/dto";

export function CompanyRequestCard({
  request,
  hasMyOffer,
  onOfferClick,
}: {
  request: CompanyRequestDTO;
  hasMyOffer: boolean;
  onOfferClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-ink">
              {request.carBrand} {request.carModel}
              {request.carYear ? ` · ${request.carYear}` : ""}
            </h3>
            <Badge variant="neutral">{request.carCondition === "NEW" ? "Новый" : "С пробегом"}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {request.city.name} · {formatDateTime(request.createdAt)}
          </p>
        </div>
        {hasMyOffer && <Badge variant="success">Вы предложили</Badge>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {request.services.map((s) => (
          <Badge key={s.id} variant="brand">
            {s.name}
          </Badge>
        ))}
      </div>

      {request.comment && <p className="mt-3 text-sm text-ink-soft">{request.comment}</p>}

      {request.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {request.images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-5">
        <Button onClick={onOfferClick} variant={hasMyOffer ? "outline" : "primary"}>
          {hasMyOffer ? "Изменить предложение" : "Предложить цену"}
        </Button>
      </div>
    </div>
  );
}
