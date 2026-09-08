import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// Storage abstraction (see docs/ARCHITECTURE.md §5).
// `FileStorage` is the seam; `LocalFileStorage` is the MVP dev implementation.
// An `S3FileStorage` implementing the same interface can be dropped in later
// (STORAGE_DRIVER=s3) without touching any calling code.
// ---------------------------------------------------------------------------

export interface StoredFile {
  url: string;
  filename: string;
}

export interface FileStorage {
  put(file: File, folder: string): Promise<StoredFile>;
}

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB

export function assertValidUploadFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large (max 8MB)");
  }
}

class LocalFileStorage implements FileStorage {
  async put(file: File, folder: string): Promise<StoredFile> {
    assertValidUploadFile(file);
    const ext = (file.type.split("/")[1] || "bin").replace("jpeg", "jpg");
    const filename = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    return { url: `/uploads/${folder}/${filename}`, filename };
  }
}

class S3FileStorage implements FileStorage {
  async put(): Promise<StoredFile> {
    // Seam for a future S3-compatible implementation. Kept out of the MVP
    // dependency tree on purpose — wire an S3 SDK client here using
    // S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY /
    // S3_ENDPOINT from src/lib/env.ts when needed.
    throw new Error("S3FileStorage is not implemented in this MVP. Set STORAGE_DRIVER=local.");
  }
}

export const fileStorage: FileStorage =
  env.storageDriver === "s3" ? new S3FileStorage() : new LocalFileStorage();
