import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MEMBER_PHOTO_BUCKET, memberPhotoFile } from "./photos";

// The photo that comes with Google or LinkedIn sign-in is used by default, until the member
// uploads their own. We copy it into the association's private storage (provider links expire).

const allowedHosts = [/\.googleusercontent\.com$/, /^media\.licdn\.com$/];

export function providerPhotoUrl(meta: Record<string, unknown>): string | null {
  const raw = String(meta.avatar_url ?? meta.picture ?? "");
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !allowedHosts.some((h) => h.test(url.hostname))) return null;
    // Google serves small thumbnails by default; ask for a larger one.
    if (url.hostname.endsWith("googleusercontent.com")) return raw.replace(/=s\d+(-c)?$/, "=s400-c");
    return raw;
  } catch {
    return null;
  }
}

export async function importProviderPhoto(supabase: SupabaseClient, personId: string, url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    if (!res.ok || !["image/jpeg", "image/webp"].includes(type)) return false;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > 1024 * 1024) return false;
    const path = `${personId}/${crypto.randomUUID()}`;
    for (const size of ["large", "small"] as const) {
      const { error } = await supabase.storage
        .from(MEMBER_PHOTO_BUCKET)
        .upload(memberPhotoFile(path, size), new Blob([bytes], { type }), { contentType: type, upsert: false });
      if (error) return false;
    }
    const { error } = await supabase.from("member_profiles").update({ photo_path: path }).eq("person_id", personId);
    return !error;
  } catch {
    return false;
  }
}
