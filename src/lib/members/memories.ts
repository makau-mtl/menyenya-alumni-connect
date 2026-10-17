import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Memories are private to members: stored in the "memories" bucket and shown through short-lived links.
export const MEMORY_BUCKET = "memories";
export const memoryFile = (path: string, size: "large" | "small") => `${path}-${size === "large" ? 1600 : 800}.webp`;

export async function memoryUrls(db: SupabaseClient, paths: string[], size: "large" | "small") {
  const urls = new Map<string, string>();
  const files = [...new Set(paths)].map((p) => memoryFile(p, size));
  if (!files.length) return urls;
  const { data } = await db.storage.from(MEMORY_BUCKET).createSignedUrls(files, 3600);
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) urls.set(item.path.replace(/-(1600|800)\.webp$/, ""), item.signedUrl);
  }
  return urls;
}

export type MemoryRow = {
  id: string; person_id: string; full_name: string; year_left: number | null; photo_path: string; caption: string; place: string | null;
  taken_year: number | null; status: string; created_at: string; hearts: number; i_hearted: boolean; comments: number; mine: boolean; reports: number | null;
};
