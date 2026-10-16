import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEMBER_PHOTO_BUCKET, memberPhotoFile } from "./photos";

/** Short-lived links for many member photos at once (the storage rules decide who may see each). */
export async function signedPhotoUrls(supabase: SupabaseClient, paths: (string | null)[], size: "large" | "small" = "small") {
  const files = [...new Set(paths.filter((p): p is string => Boolean(p)))].map((p) => memberPhotoFile(p, size));
  const urls = new Map<string, string>();
  if (!files.length) return urls;
  const { data } = await supabase.storage.from(MEMBER_PHOTO_BUCKET).createSignedUrls(files, 3600);
  for (const row of data ?? []) {
    if (row.signedUrl && row.path) urls.set(row.path.replace(/-(800|400)\.webp$/, ""), row.signedUrl);
  }
  return urls;
}
