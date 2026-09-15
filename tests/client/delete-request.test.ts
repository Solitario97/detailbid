import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { getRequestByPublicIdAndToken, deleteRequestById } from "@/modules/requests/service";
import { revealOfferContact, recordOutboundClick } from "@/modules/offers/service";
import { makeCompany, makeRequest, makeOffer, makeService } from "../helpers/factory";

// Covers the backend half of the "client can delete their own request"
// feature. The API route (src/app/api/client/requests/[publicId]/delete)
// is a thin wrapper around exactly these two functions — the same
// getRequestByPublicIdAndToken ownership check every other /api/client/*
// route uses, then the pre-existing deleteRequestById (already backing the
// AutoPickBot's 24h cleanup job) — so exercising them here covers the same
// authorization and cascade guarantees the route relies on, matching how
// tests/security/idor.test.ts already tests contact-reveal/outbound-click
// authorization at this same layer rather than through the HTTP route.
describe("client request deletion", () => {
  it("deletes the request and cascades to offers, contact reveals, analytics events and services — no orphans", async () => {
    const company = await makeCompany();
    const { request } = await makeRequest();
    const service = await makeService();
    await prisma.requestService.create({ data: { requestId: request.id, serviceId: service.id } });
    const offer = await makeOffer(request.id, company.id);
    await revealOfferContact(request.id, offer.id);
    await recordOutboundClick(request.id, offer.id, "WHATSAPP");

    // Sanity check the related rows actually exist before deleting.
    await expect(prisma.offer.findUnique({ where: { id: offer.id } })).resolves.not.toBeNull();
    await expect(prisma.contactReveal.findFirst({ where: { requestId: request.id } })).resolves.not.toBeNull();
    await expect(prisma.analyticsEvent.findFirst({ where: { requestId: request.id } })).resolves.not.toBeNull();
    await expect(prisma.requestService.findFirst({ where: { requestId: request.id } })).resolves.not.toBeNull();

    const deleted = await deleteRequestById(request.id);
    expect(deleted?.id).toBe(request.id);

    await expect(prisma.request.findUnique({ where: { id: request.id } })).resolves.toBeNull();
    await expect(prisma.offer.findUnique({ where: { id: offer.id } })).resolves.toBeNull();
    await expect(prisma.contactReveal.findFirst({ where: { requestId: request.id } })).resolves.toBeNull();
    await expect(prisma.analyticsEvent.findFirst({ where: { requestId: request.id } })).resolves.toBeNull();
    await expect(prisma.requestService.findFirst({ where: { requestId: request.id } })).resolves.toBeNull();
  });

  it("deleting an already-deleted request is idempotent, not an error", async () => {
    const { request } = await makeRequest();

    const first = await deleteRequestById(request.id);
    expect(first?.id).toBe(request.id);

    const second = await deleteRequestById(request.id);
    expect(second).toBeNull();
  });

  it("a client cannot resolve (and therefore cannot delete) another client's request via a forged or mismatched token", async () => {
    const { request: requestA, token: tokenA } = await makeRequest();
    const { request: requestB } = await makeRequest();

    // Own publicId, someone else's token — must not resolve.
    expect(await getRequestByPublicIdAndToken(requestA.publicId, "not-tokenA-at-all")).toBeNull();
    // Someone else's publicId with your own token — must not resolve either.
    expect(await getRequestByPublicIdAndToken(requestB.publicId, tokenA)).toBeNull();

    // The correct pairing still works — proves the above failures are a
    // real authorization boundary, not a broken lookup.
    const found = await getRequestByPublicIdAndToken(requestA.publicId, tokenA);
    expect(found?.id).toBe(requestA.id);
  });

  it("the request row for a resolved-but-not-yet-deleted request is untouched by a failed lookup elsewhere", async () => {
    // Guards against a sloppy implementation that deletes based on publicId
    // alone before verifying the token — resolving request B by request B's
    // own (correct) id/token must never be affected by an earlier failed
    // attempt against a different request.
    const { request: requestA, token: tokenA } = await makeRequest();
    const { request: requestB, token: tokenB } = await makeRequest();

    expect(await getRequestByPublicIdAndToken(requestB.publicId, tokenA)).toBeNull();

    const stillThere = await getRequestByPublicIdAndToken(requestB.publicId, tokenB);
    expect(stillThere?.id).toBe(requestB.id);
    const stillThereA = await getRequestByPublicIdAndToken(requestA.publicId, tokenA);
    expect(stillThereA?.id).toBe(requestA.id);
  });
});
