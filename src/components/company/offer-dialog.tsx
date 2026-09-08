"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export interface OfferFormValues {
  price: string;
  durationValue: string;
  durationUnit: "HOURS" | "DAYS";
  availableAt: string;
  comment: string;
  oldPrice: string;
  discountPercent: string;
  guarantee: string;
  extraConditions: string;
}

const EMPTY: OfferFormValues = {
  price: "",
  durationValue: "1",
  durationUnit: "DAYS",
  availableAt: "",
  comment: "",
  oldPrice: "",
  discountPercent: "",
  guarantee: "",
  extraConditions: "",
};

export function OfferDialog({
  open,
  onClose,
  requestTitle,
  initialValues,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  requestTitle: string;
  initialValues?: Partial<OfferFormValues>;
  onSubmit: (values: OfferFormValues) => Promise<string | null>;
}) {
  const [values, setValues] = React.useState<OfferFormValues>({ ...EMPTY, ...initialValues });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the form when the dialog is (re)opened for a different offer
      setValues({ ...EMPTY, ...initialValues });
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function update<K extends keyof OfferFormValues>(key: K, value: OfferFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = await onSubmit(values);
    setSubmitting(false);
    if (err) setError(err);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Ваше предложение" description={requestTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Стоимость, ₸</Label>
            <Input
              type="number"
              required
              min={1000}
              value={values.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder="120000"
            />
          </div>
          <div>
            <Label>Старая цена (опционально)</Label>
            <Input type="number" value={values.oldPrice} onChange={(e) => update("oldPrice", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Срок</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                required
                min={1}
                value={values.durationValue}
                onChange={(e) => update("durationValue", e.target.value)}
                className="w-20"
              />
              <Select value={values.durationUnit} onChange={(e) => update("durationUnit", e.target.value as "HOURS" | "DAYS")}>
                <option value="HOURS">часов</option>
                <option value="DAYS">дней</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Можем принять</Label>
            <Input type="date" required value={values.availableAt} onChange={(e) => update("availableAt", e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Комментарий</Label>
          <Textarea
            value={values.comment}
            onChange={(e) => update("comment", e.target.value)}
            placeholder="Например: в стоимость входит двухфазная мойка, подготовка кузова и Ceramic Pro..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Скидка, % (опционально)</Label>
            <Input type="number" min={0} max={100} value={values.discountPercent} onChange={(e) => update("discountPercent", e.target.value)} />
          </div>
          <div>
            <Label>Гарантия (опционально)</Label>
            <Input value={values.guarantee} onChange={(e) => update("guarantee", e.target.value)} placeholder="12 месяцев" />
          </div>
        </div>

        <div>
          <Label>Доп. условия (опционально)</Label>
          <Input value={values.extraConditions} onChange={(e) => update("extraConditions", e.target.value)} />
        </div>

        {error && <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Отправить предложение
        </Button>
      </form>
    </Dialog>
  );
}
