import { describe, it, expect } from "vitest";
import { revealOfferContact, recordOutboundClick, OfferError } from "@/modules/offers/service";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { makeCompany, makeRequest, makeOffer } from "../helpers/factory";

describe("IDOR protection on contact reveal / outbound click", () => {
  it("cannot reveal contacts for an offer that belongs to a different request", async () => {
    const company = await makeCompany();
    const { request: requestA } = await makeRequest();
    const { request: requestB } = await makeRequest();
    const offerOnB = await makeOffer(requestB.id, company.id);

    await expect(revealOfferContact(requestA.id, offerOnB.id)).rejects.toBeInstanceOf(OfferError);
  });

  it("cannot record an outbound click for an offer that belongs to a different request", async () => {
    const company = await makeCompany();
    const { request: requestA } = await makeRequest();
    const { request: requestB } = await makeRequest();
    const offerOnB = await makeOffer(requestB.id, company.id);

    await expect(recordOutboundClick(requestA.id, offerOnB.id, "PHONE")).rejects.toBeInstanceOf(OfferError);
  });

  it("a forged/incorrect token never resolves to a request", async () => {
    const { request } = await makeRequest();
    const found = await getRequestByPublicIdAndToken(request.publicId, "totally-wrong-token");
    expect(found).toBeNull();
  });

  it("revealing contacts for a real offer on the correct request succeeds", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const offer = await makeOffer(request.id, company.id);

    const contact = await revealOfferContact(request.id, offer.id);
    expect(contact.phone).toBeTruthy();
  });
});
