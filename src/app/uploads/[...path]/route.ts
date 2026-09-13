import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { env } from "@/lib/env";

// Serves files written by LocalFileStorage (see
// src/modules/storage/file-storage.ts) from env.uploadsDir.
//
// This is a real route handler rather than relying on Next's automatic
// `public/` static passthrough on purpose: in production env.uploadsDir
// points at a Railway Volume mount path (e.g. "/data/uploads") *outside*
// the `public` directory, since anything written to the app's own
// filesystem at runtime (including `public/`) is lost on every redeploy,
// restart, or new instance — Railway's container filesystem is ephemeral
// unless a Volume is mounted. Reading through this route means storage and
// serving always agree on the exact same directory, in every environment.

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  if (
    !segments ||
    segments.length === 0 ||
    segments.some((s) => s.length === 0 || s.includes("..") || s.includes("/") || s.includes("\\"))
  ) {
    return NextResponse.json({ error: "Некорректный путь" }, { status: 400 });
  }

  const ext = path.extname(segments[segments.length - 1]).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Неподдерживаемый тип файла" }, { status: 400 });
  }

  // turbopackIgnore: env.uploadsDir is env-driven on purpose (see the file
  // header) and never reaches into the project's own source tree, so
  // Turbopack's "trace the whole project" heuristic here is a false positive.
  const root = path.resolve(/* turbopackIgnore: true */ env.uploadsDir);
  const filePath = path.resolve(path.join(/* turbopackIgnore: true */ root, ...segments));

  // Defense in depth against path traversal, on top of the segment check above.
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "Некорректный путь" }, { status: 400 });
  }

  try {
    await stat(filePath);
  } catch {
    console.error("[Image] not found", { path: filePath });
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    console.log("[Image] serving file", { path: filePath });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("[Image] failed to read file", {
      path: filePath,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Не удалось прочитать файл" }, { status: 500 });
  }
}
