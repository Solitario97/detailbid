import { describe, it, expect } from "vitest";
import { recordOutboundClick, listActiveOffersForRequest, getRevealedOfferIds } from "@/modules/offers/service";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { toOfferPublicDTO } from "@/modules/offers/dto";
import { prisma } from "@/lib/prisma";
import { makeCompany, makeRequest, makeOffer } from "../helpers/factory";

// Regression test for the "WhatsApp / Call do nothing after reopening the
// site" report. The user's working theory was that the offer/company data
// returned after restoring a request (closed tab -> new tab -> HomeGate ->
// GET /api/client/requests/[publicId]) might be a different, contact-data-
// stripped shape compared to the data shown right after creating the
// request. It is NOT: both paths call the exact same
// `getRequestByPublicIdAndToken` + `listActiveOffersForRequest` +
// `toOfferPublicDTO` functions (see src/app/r/[publicId]/page.tsx), so this
// pins down that the two reads are byte-identical, and separately confirms
// `recordOutboundClick` returns a real, correctly normalized tel:/wa.me URL
// -- the actual bug was the frontend calling `window.open()` on that URL
// after an `await`, not missing/different backend data.
describe("outbound-click URLs and request/offer read parity", () => {
  it("recordOutboundClick returns a normalized tel: URL for PHONE", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const offer = await makeOffer(request.id, company.id);

    const url = await recordOutboundClick(request.id, offer.id, "PHONE");
    expect(url).toBe("tel:+77010000000");
  });

  it("recordOutboundClick returns a normalized wa.me URL for WHATSAPP", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const offer = await makeOffer(request.id, company.id);

    const url = await recordOutboundClick(request.id, offer.id, "WHATSAPP");
    expect(url).toBe("https://wa.me/77010000000");
  });

  it("never returns a URL built from missing contact data", async () => {
    // A company with no phone/whatsapp/instagram/2GIS on file at all.
    const company = await makeCompany();
    await prisma.company.update({
      where: { id: company.id },
      data: { phone: null, whatsapp: null, instagram: null, twoGisUrl: null },
    });
    const { request } = await makeRequest();
    const offer = await makeOffer(request.id, company.id);

    expect(await recordOutboundClick(request.id, offer.id, "PHONE")).toBeNull();
    expect(await recordOutboundClick(request.id, offer.id, "WHATSAPP")).toBeNull();
    expect(await recordOutboundClick(request.id, offer.id, "INSTAGRAM")).toBeNull();
    expect(await recordOutboundClick(request.id, offer.id, "TWO_GIS")).toBeNull();
  });

  it("the offer/request DTOs read right after creation and after a simulated restore are identical", async () => {
    const company = await makeCompany();
    const { request, token } = await makeRequest();
    await makeOffer(request.id, company.id);

    // "Fresh" read: exactly what src/app/r/[publicId]/page.tsx does right
    // after the wizard redirects to /r/[publicId]?t=...
    const freshFound = await getRequestByPublicIdAndToken(request.publicId, token);
    const freshOffers = await listActiveOffersForRequest(freshFound!.id);
    const freshRevealed = await getRevealedOfferIds(freshFound!.id);
    const freshDTOs = freshOffers.map((o) => toOfferPublicDTO(o, freshRevealed.has(o.id)));

    // "Restored" read: exactly what happens after HomeGate verifies the
    // localStorage pointer and router.replace()s to the same URL -- the
    // request page runs again, from scratch, with the same publicId/token.
    const restoredFound = await getRequestByPublicIdAndToken(request.publicId, token);
    const restoredOffers = await listActiveOffersForRequest(restoredFound!.id);
    const restoredRevealed = await getRevealedOfferIds(restoredFound!.id);
    const restoredDTOs = restoredOffers.map((o) => toOfferPublicDTO(o, restoredRevealed.has(o.id)));

    expect(restoredDTOs).toEqual(freshDTOs);
  });
});
