"use client";

import { useEffect, useState } from "react";

// Shrinks a chosen photo in the browser before upload: a 1600px copy and an 800px copy.
// Phone photos are often 4–10 MB; these come out at a few hundred KB, which keeps uploads
// quick on mobile data and pages light for visitors.

async function shrink(bitmap: ImageBitmap, width: number): Promise<Blob> {
  const scale = Math.min(1, width / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // WebP is smallest; older browsers that can't make it fall back to JPEG.
  const webp = await encode("image/webp", 0.8);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", 0.82);
  if (!jpeg) throw new Error("encode failed");
  return jpeg;
}

export type PreparedPhoto = { large: Blob; small: Blob; preview: string; name: string };

export function usePhoto() {
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.preview);
  }, [photo]);

  async function choose(file: File | undefined) {
    setError(null);
    setPhoto(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo (JPG, PNG, HEIC or WebP).");
      return;
    }
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      if (bitmap.width < 600) {
        bitmap.close();
        setError("This photo is very small and will look blurry. Use one at least 600 pixels wide.");
        return;
      }
      const [large, small] = [await shrink(bitmap, 1600), await shrink(bitmap, 800)];
      bitmap.close();
      setPhoto({ large, small, preview: URL.createObjectURL(small), name: file.name });
    } catch {
      setError("This photo couldn't be read. Try a JPG or PNG, or take a screenshot of it.");
    } finally {
      setBusy(false);
    }
  }

  /** Adds the shrunk copies to the form data in place of the original file. */
  function addTo(formData: FormData) {
    formData.delete("photo");
    if (photo) {
      const ext = photo.large.type === "image/webp" ? "webp" : "jpg";
      formData.set("large", photo.large, `large.${ext}`);
      formData.set("small", photo.small, `small.${ext}`);
    }
  }

  function clear() {
    setPhoto(null);
    setError(null);
  }

  return { photo, busy, error, choose, addTo, clear };
}
