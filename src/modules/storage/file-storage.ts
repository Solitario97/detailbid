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
    // env.uploadsDir is a Railway Volume mount path in production (e.g.
    // "/data/uploads") and defaults to "<repo>/public/uploads" locally.
    // It must match the directory the /uploads route reads from — see
    // src/app/uploads/[...path]/route.ts.
    const dir = path.join(env.uploadsDir, folder);
    const fullPath = path.join(dir, filename);
    try {
      await mkdir(dir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(fullPath, buffer);
    } catch (err) {
      console.error("[Upload] failed", {
        path: fullPath,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new Error("Не удалось сохранить файл");
    }
    const url = `/uploads/${folder}/${filename}`;
    console.log("[Upload] file saved", { path: fullPath, url });
    return { url, filename };
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
