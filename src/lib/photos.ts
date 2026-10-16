import { supabaseUrl } from "@/lib/supabase/config";
import type { Photo } from "@/lib/types";

// Photos live in the public "site-media" bucket. Each upload is saved twice:
// <path>-1600.webp for large screens and <path>-800.webp for phones.
export const PHOTO_BUCKET = "site-media";
export const PHOTO_WIDTHS = [1600, 800] as const;

export function photoFile(path: string, width: (typeof PHOTO_WIDTHS)[number]) {
  return `${path}-${width}.webp`;
}

export function toPhoto(path: string, caption: string): Photo {
  const base = `${supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/`;
  return { path, caption, src: base + photoFile(path, 1600), srcSmall: base + photoFile(path, 800) };
}

/** Accepts a YouTube link in any common form, or a bare video id. Returns the id or null. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Turns text with blank lines between paragraphs into a list of paragraphs. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** A web-address-friendly name, e.g. "Homecoming 2026!" → "homecoming-2026". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
