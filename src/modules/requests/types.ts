import { z } from "zod";

export const createRequestSchema = z.object({
  cityId: z.string().min(1, "Выберите город"),
  serviceIds: z.array(z.string().min(1)).min(1, "Выберите хотя бы одну услугу"),
  carBrand: z.string().min(1, "Укажите марку").max(60),
  carModel: z.string().min(1, "Укажите модель").max(60),
  carYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  carCondition: z.enum(["NEW", "USED"]),
  customerName: z.string().min(1, "Укажите имя").max(80),
  customerPhone: z
    .string()
    .min(6, "Укажите телефон")
    .max(30)
    .regex(/^[0-9+()\s-]+$/, "Некорректный номер телефона"),
  customerWhatsapp: z
    .string()
    .max(30)
    .regex(/^[0-9+()\s-]*$/, "Некорректный номер WhatsApp")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  comment: z.string().max(1000).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  desiredDate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  imageUrls: z.array(z.string()).max(10).optional().default([]),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export type OfferSort = "recommended" | "price_asc" | "price_desc" | "soonest" | "fastest";
