import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { getRequestByPublicIdAndToken } from "@/modules/requests/service";
import { toPublicRequestDTO } from "@/modules/requests/dto";
import { makeRequest } from "../helpers/factory";

// This is the exact backend contract src/components/marketing/home-gate.tsx
// relies on (via GET /api/client/requests/[publicId], which is a thin
// wrapper around these same two calls) to decide whether to redirect a
// returning visitor to their request or fall back to the landing page.
describe("active-request restore: backend contract used by the homepage gate", () => {
  it("an active request resolves with status ACTIVE for its correct token", async () => {
    const { request, token } = await makeRequest({ status: "ACTIVE" });

    const found = await getRequestByPublicIdAndToken(request.publicId, token);
    expect(found).not.toBeNull();

    const dto = toPublicRequestDTO(found!);
    expect(dto.status).toBe("ACTIVE");
    // The DTO must never carry anything that would let the homepage gate
    // (or any other caller) mistake this for the bot's internal marker —
    // regression guard for the DTO boundary rule in modules/requests/dto.ts.
    expect("source" in dto).toBe(false);
  });

  it("an expired request resolves with a non-ACTIVE status, so the gate clears its pointer instead of redirecting", async () => {
    const { request, token } = await makeRequest({ status: "EXPIRED" });

    const found = await getRequestByPublicIdAndToken(request.publicId, token);
    expect(found).not.toBeNull();
    expect(toPublicRequestDTO(found!).status).toBe("EXPIRED");
  });

  it("a closed/cancelled request also resolves with a non-ACTIVE status", async () => {
    const { request, token } = await makeRequest({ status: "ACTIVE" });
    await prisma.request.update({ where: { id: request.id }, data: { status: "CANCELLED" } });

    const found = await getRequestByPublicIdAndToken(request.publicId, token);
    expect(toPublicRequestDTO(found!).status).toBe("CANCELLED");
  });

  it("a deleted request resolves to null — the gate must treat this like an invalid token (clear + landing)", async () => {
    const { request, token } = await makeRequest();
    await prisma.request.delete({ where: { id: request.id } });

    const found = await getRequestByPublicIdAndToken(request.publicId, token);
    expect(found).toBeNull();
  });

  it("an invalid/forged token never resolves a request, even for a real publicId", async () => {
    const { request } = await makeRequest();

    const found = await getRequestByPublicIdAndToken(request.publicId, "forged-token-guess");
    expect(found).toBeNull();
  });
});
