import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { customAlphabet } from "nanoid";

// ---------------------------------------------------------------------------
// Client request access tokens
//
// Design (see docs/SECURITY.md §3):
// - `publicId` is a short, URL-friendly, low-entropy identifier used purely
//   for routing (`/r/{publicId}`). It is NOT a secret.
// - `token` is a high-entropy secret (256 bits) that proves the bearer owns
//   the request. Only its SHA-256 hash is ever persisted.
// ---------------------------------------------------------------------------

const publicIdAlphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const generatePublicId = customAlphabet(publicIdAlphabet, 12);

export function createPublicId(): string {
  return generatePublicId();
}

/** Generates a new plaintext access token (base64url, 256 bits of entropy). */
export function createAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a candidate token against a stored hash. */
export function verifyAccessToken(candidateToken: string, storedHash: string): boolean {
  if (!candidateToken) return false;
  const candidateHash = hashAccessToken(candidateToken);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
