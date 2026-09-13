"use client";

import * as React from "react";
import { CarFront } from "lucide-react";
import { cn } from "@/lib/utils";

// Fixed 228x128 tile everywhere a request's car photo is shown.
const SIZE_CLASSES = "h-[128px] w-[228px]";

/**
 * Fixed-size car photo tile used everywhere a request's car image is shown
 * (company request cards, the client's own request page, ...). Always
 * renders something — a neutral placeholder icon when there is no photo,
 * or the photo failed to load — never a broken-image icon.
 */
export function CarThumbnail({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div
      className={cn(SIZE_CLASSES, "shrink-0 overflow-hidden rounded-xl bg-surface-muted", className)}
    >
      {showPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center" role="img" aria-label={alt}>
          <CarFront className="h-10 w-10 text-ink-faint" aria-hidden />
        </div>
      ) : (
        // Uploaded request photos are arbitrary user images, not part of the
        // Next.js-optimized asset set — plain <img>, same as elsewhere.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
