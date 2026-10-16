import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Member photos are private: only signed-in members see them, through short-lived links.
export const MEMBER_PHOTO_BUCKET = "member-photos";
export const memberPhotoFile = (path: string, size: "large" | "small") => `${path}-${size === "large" ? 800 : 400}.webp`;

export async function memberPhotoUrl(supabase: SupabaseClient, path: string | null, size: "large" | "small" = "small") {
  if (!path) return null;
  const { data } = await supabase.storage.from(MEMBER_PHOTO_BUCKET).createSignedUrl(memberPhotoFile(path, size), 3600);
  return data?.signedUrl ?? null;
}
