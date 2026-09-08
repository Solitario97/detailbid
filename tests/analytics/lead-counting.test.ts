import { describe, it, expect } from "vitest";
import { revealOfferContact, recordOutboundClick } from "@/modules/offers/service";
import { getCompanyStats } from "@/modules/analytics/service";
import { makeCompany, makeRequest, makeOffer } from "../helpers/factory";

describe("unique lead / outbound lead counting", () => {
  it("repeated CONTACT_REVEAL on the same (request, offer) counts as a single unique lead", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const offer = await makeOffer(request.id, company.id);

    await revealOfferContact(request.id, offer.id);
    await revealOfferContact(request.id, offer.id);
    await revealOfferContact(request.id, offer.id);

    const stats = await getCompanyStats(company.id, "all");
    expect(stats.contactReveals).toBe(1);
  });

  it("revealing two different offers from the same company counts as two unique leads", async () => {
    const company = await makeCompany();
    const { request: requestA } = await makeRequest();
    const { request: requestB } = await makeRequest();
    const offerA = await makeOffer(requestA.id, company.id);
    const offerB = await makeOffer(requestB.id, company.id);

    await revealOfferContact(requestA.id, offerA.id);
    await revealOfferContact(requestB.id, offerB.id);

    const stats = await getCompanyStats(company.id, "all");
    expect(stats.contactReveals).toBe(2);
  });

  it("repeated WHATSAPP_CLICK on the same offer counts as one unique outbound lead, but every raw click is still recorded", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const offer = await makeOffer(request.id, company.id);
    await revealOfferContact(request.id, offer.id);

    await recordOutboundClick(request.id, offer.id, "WHATSAPP");
    await recordOutboundClick(request.id, offer.id, "WHATSAPP");

    const stats = await getCompanyStats(company.id, "all");
    expect(stats.outboundLeads).toBe(1);
    expect(stats.whatsappClicks).toBe(2);
  });

  it("conversion percentages are computed from impressions -> reveals -> outbound", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const offer = await makeOffer(request.id, company.id);

    const { recordOfferImpression } = await import("@/modules/offers/service");
    await recordOfferImpression(request.id, offer.id);
    await revealOfferContact(request.id, offer.id);
    await recordOutboundClick(request.id, offer.id, "PHONE");

    const stats = await getCompanyStats(company.id, "all");
    expect(stats.impressions).toBe(1);
    expect(stats.contactReveals).toBe(1);
    expect(stats.outboundLeads).toBe(1);
    expect(stats.contactConversionPct).toBe(100);
    expect(stats.outboundConversionPct).toBe(100);
  });
});
