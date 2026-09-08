import { z } from "zod";

export const upsertOfferSchema = z.object({
  price: z.coerce.number().int().min(1000, "Укажите цену").max(100_000_000),
  durationValue: z.coerce.number().int().min(1).max(365),
  durationUnit: z.enum(["HOURS", "DAYS"]),
  availableAt: z.string().min(1, "Укажите дату приёма"),
  comment: z.string().max(1000).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  oldPrice: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  discountPercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
  guarantee: z.string().max(200).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  extraConditions: z.string().max(500).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export type UpsertOfferInput = z.infer<typeof upsertOfferSchema>;

export const outboundClickSchema = z.object({
  type: z.enum(["PHONE", "WHATSAPP", "INSTAGRAM", "TWO_GIS"]),
});
