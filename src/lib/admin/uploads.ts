import "server-only";
import type { Staff } from "./staff";
import { PHOTO_BUCKET, photoFile } from "@/lib/photos";

// Photos arrive already shrunk in the browser: a large copy (1600px) and a small one (800px).
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/webp", "image/jpeg"];

export class UploadError extends Error {}

function readFile(formData: FormData, name: string): File {
  const f = formData.get(name);
  if (!(f instanceof File) || f.size === 0) throw new UploadError("Choose a photo first.");
  if (!TYPES.includes(f.type)) throw new UploadError("That file isn't a photo we can use. Try a JPG or PNG photo.");
  if (f.size > MAX_BYTES) throw new UploadError("That photo is too large. Try a smaller one.");
  return f;
}

export function hasPhoto(formData: FormData) {
  const f = formData.get("large");
  return f instanceof File && f.size > 0;
}

/** Saves both copies in a new folder entry and returns the path stored in the database. */
export async function savePhoto(staff: Staff, folder: string, formData: FormData): Promise<string> {
  const large = readFile(formData, "large");
  const small = readFile(formData, "small");
  const path = `${folder}/${crypto.randomUUID()}`;
  for (const [file, width] of [[large, 1600], [small, 800]] as const) {
    const { error } = await staff.supabase.storage.from(PHOTO_BUCKET).upload(photoFile(path, width), file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      console.error("Photo upload failed", error);
      throw new UploadError("The photo could not be saved. Check you are still signed in, then try again.");
    }
  }
  return path;
}
