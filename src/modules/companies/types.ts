import { z } from "zod";

export const registerCompanySchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Минимум 8 символов").max(100),
  name: z.string().min(2, "Укажите название компании").max(100),
  cityId: z.string().min(1, "Выберите город"),
  phone: z.string().max(30).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  whatsapp: z.string().max(30).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateCompanyProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  instagram: z.string().max(200).optional().nullable(),
  twoGisUrl: z.string().max(500).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  cityId: z.string().min(1).optional(),
  workingHours: z.string().max(500).optional().nullable(),
});

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
