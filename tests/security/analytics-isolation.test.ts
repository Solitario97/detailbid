import { describe, it, expect } from "vitest";
import { revealOfferContact } from "@/modules/offers/service";
import { getCompanyStats } from "@/modules/analytics/service";
import { makeCompany, makeRequest, makeOffer } from "../helpers/factory";

describe("per-company analytics isolation", () => {
  it("company A's stats never include company B's activity", async () => {
    const companyA = await makeCompany();
    const companyB = await makeCompany();
    const { request: requestA } = await makeRequest();
    const { request: requestB } = await makeRequest();
    const offerA = await makeOffer(requestA.id, companyA.id);
    const offerB = await makeOffer(requestB.id, companyB.id);

    await revealOfferContact(requestA.id, offerA.id);
    await revealOfferContact(requestB.id, offerB.id);
    await revealOfferContact(requestB.id, offerB.id); // extra reveal for B only

    const statsA = await getCompanyStats(companyA.id, "all");
    const statsB = await getCompanyStats(companyB.id, "all");

    expect(statsA.contactReveals).toBe(1);
    expect(statsB.contactReveals).toBe(1); // unique, despite two reveal events
  });
});
