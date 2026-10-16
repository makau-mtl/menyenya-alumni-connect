import { cache } from "react";
import { getSitePhotos } from "@/lib/data";
import { getPhotoSpace } from "@/content/photo-spaces";
import { ImageSlot } from "./media";

// Read once per page, however many photo spaces the page has.
const sitePhotos = cache(() => getSitePhotos().catch(() => ({})));

/** A named photo space: shows the uploaded photo, or a placeholder saying what belongs there. */
export async function SitePhoto({
  space,
  className,
  tone,
  sizes,
}: {
  space: string;
  className?: string;
  tone?: "dark" | "light";
  sizes?: string;
}) {
  const { label, ratio } = getPhotoSpace(space);
  const photos: Record<string, import("@/lib/types").Photo> = await sitePhotos();
  return <ImageSlot caption={label} photo={photos[space]} ratio={ratio} className={className} tone={tone} sizes={sizes} />;
}
