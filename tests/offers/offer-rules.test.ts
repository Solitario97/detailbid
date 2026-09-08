import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { upsertOffer, OfferError, editOwnOffer } from "@/modules/offers/service";
import { makeCompany, makeRequest } from "../helpers/factory";

const validInput = {
  price: 100000,
  durationValue: 2,
  durationUnit: "DAYS" as const,
  availableAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  comment: undefined,
  guarantee: undefined,
  extraConditions: undefined,
  oldPrice: undefined,
  discountPercent: undefined,
};

describe("offer business rules", () => {
  it("a company can have only one active offer per request (upsert, not duplicate)", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();

    await upsertOffer({ requestId: request.id, companyId: company.id, input: validInput });
    await upsertOffer({ requestId: request.id, companyId: company.id, input: { ...validInput, price: 150000 } });

    const offers = await prisma.offer.findMany({ where: { requestId: request.id, companyId: company.id } });
    expect(offers).toHaveLength(1);
    expect(offers[0]!.price).toBe(150000);
  });

  it("editOwnOffer updates the same row rather than creating a second one", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const offer = await upsertOffer({ requestId: request.id, companyId: company.id, input: validInput });

    await editOwnOffer({ offerId: offer.id, companyId: company.id, input: { ...validInput, price: 200000 } });

    const offers = await prisma.offer.findMany({ where: { requestId: request.id, companyId: company.id } });
    expect(offers).toHaveLength(1);
    expect(offers[0]!.id).toBe(offer.id);
    expect(offers[0]!.price).toBe(200000);
  });

  it("rejects a new offer on an expired request", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest({ expiresAt: new Date(Date.now() - 1000) });

    await expect(upsertOffer({ requestId: request.id, companyId: company.id, input: validInput })).rejects.toBeInstanceOf(
      OfferError
    );

    const offers = await prisma.offer.findMany({ where: { requestId: request.id } });
    expect(offers).toHaveLength(0);
  });

  it("rejects an offer from a company that is not APPROVED", async () => {
    const pendingCompany = await makeCompany({ status: "PENDING" });
    const blockedCompany = await makeCompany({ status: "BLOCKED" });
    const { request } = await makeRequest();

    await expect(
      upsertOffer({ requestId: request.id, companyId: pendingCompany.id, input: validInput })
    ).rejects.toBeInstanceOf(OfferError);
    await expect(
      upsertOffer({ requestId: request.id, companyId: blockedCompany.id, input: validInput })
    ).rejects.toBeInstanceOf(OfferError);
  });

  it("a company cannot edit another company's offer", async () => {
    const companyA = await makeCompany();
    const companyB = await makeCompany();
    const { request } = await makeRequest();
    const offer = await upsertOffer({ requestId: request.id, companyId: companyA.id, input: validInput });

    await expect(
      editOwnOffer({ offerId: offer.id, companyId: companyB.id, input: { ...validInput, price: 1 } })
    ).rejects.toBeInstanceOf(OfferError);
  });
});
