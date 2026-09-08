import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/tokens";

export async function listCities() {
  return prisma.city.findMany({ orderBy: { name: "asc" } });
}

export async function listActiveServices() {
  return prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listAllServices() {
  return prisma.service.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function createCity(name: string, countryCode = "KZ") {
  return prisma.city.create({ data: { name, slug: slugify(name), countryCode } });
}

export async function updateCity(id: string, name: string) {
  return prisma.city.update({ where: { id }, data: { name, slug: slugify(name) } });
}

export async function deleteCity(id: string) {
  return prisma.city.delete({ where: { id } });
}

export async function createService(name: string, sortOrder = 0) {
  return prisma.service.create({ data: { name, slug: slugify(name), sortOrder } });
}

export async function updateService(id: string, data: { name?: string; isActive?: boolean; sortOrder?: number }) {
  return prisma.service.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.name ? slugify(data.name) : undefined,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    },
  });
}

export async function deleteService(id: string) {
  return prisma.service.delete({ where: { id } });
}
