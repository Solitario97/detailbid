import { describe, it, expect } from "vitest";
import { listActiveRequestsForCompany, getRequestForCompanyById } from "@/modules/requests/service";
import { toCompanyRequestDTO } from "@/modules/requests/dto";
import { makeCompany, makeRequest } from "../helpers/factory";

// Critical security test (see docs/SECURITY.md §1, product spec §6/§20):
// a detailing company must never receive the client's name, phone or
// WhatsApp — not even as an extra/undocumented field in the JSON response.

describe("company-facing request data never contains client PII", () => {
  it("listActiveRequestsForCompany() rows have no customer fields, even at the raw query level", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest({ cityId: company.cityId });

    const rows = await listActiveRequestsForCompany({ companyId: company.id, cityId: company.cityId });
    const row = rows.find((r) => r.id === request.id);
    expect(row).toBeDefined();

    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain("Секретный Клиент");
    expect(serialized).not.toContain("+77079998877");
    expect(row).not.toHaveProperty("customerName");
    expect(row).not.toHaveProperty("customerPhone");
    expect(row).not.toHaveProperty("customerWhatsapp");
  });

  it("getRequestForCompanyById() also excludes customer fields at the query level", async () => {
    const { request } = await makeRequest();
    const row = await getRequestForCompanyById(request.id);
    expect(row).not.toBeNull();
    expect(row).not.toHaveProperty("customerName");
    expect(row).not.toHaveProperty("customerPhone");
    expect(row).not.toHaveProperty("customerWhatsapp");
  });

  it("toCompanyRequestDTO() never emits customer fields even if given a wider source object", async () => {
    const { request } = await makeRequest();
    const full = await getFullRequestForDtoTest(request.id);
    const dto = toCompanyRequestDTO(full);
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("Секретный Клиент");
    expect(serialized).not.toContain("+77079998877");
  });
});

async function getFullRequestForDtoTest(id: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.request.findUniqueOrThrow({
    where: { id },
    include: { city: true, services: { include: { service: true } }, images: true },
  });
}
