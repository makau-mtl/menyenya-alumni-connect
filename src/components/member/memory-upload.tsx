"use client";

/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState, useRef, useState } from "react";
import type { ActionState } from "@/lib/admin/staff";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { postMemory } from "@/app/app/actions";
import { usePhoto } from "@/components/admin/use-photo";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

/** Share a memory: a photo, a caption, where and when. The photo is shrunk on the phone before upload. */
export function MemoryUpload() {
  const { photo, busy, error, choose, addTo, clear } = usePhoto([1600, 800]);
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await postMemory(prev, fd);
    if (result?.ok) {
      toast.success(result.message);
      form.current?.reset();
      clear();
      setOpen(false);
    } else if (result?.message) toast.error(result.message);
    return result;
  }, null);

  if (!open) {
    return (
      <Button size="lg" onClick={() => setOpen(true)}>
        <ImagePlus /> Share a memory
      </Button>
    );
  }
  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        if (!photo) return toast.error("Choose a photo first.");
        const fd = new FormData(e.currentTarget);
        fd.delete("photo");
        addTo(fd);
        startTransition(() => action(fd));
      }}
      className="grid gap-4 rounded-2xl bg-card p-5 ring-1 ring-border sm:grid-cols-[12rem_1fr]"
    >
      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted text-center text-sm font-semibold text-muted-foreground hover:border-tea">
        {photo ? <img src={photo.preview} alt="" className="size-full object-cover" /> : (<><ImagePlus className="size-8" /> Choose a photo</>)}
        <input name="photo" type="file" accept="image/*" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
      </label>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Caption
          <textarea name="caption" rows={2} maxLength={500} placeholder="Who's in it, and what was happening?" className={inputClass} />
        </label>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Where (optional)
            <input name="place" maxLength={80} placeholder="e.g. Menyenya, the dining hall" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Year
            <input name="year" inputMode="numeric" maxLength={4} placeholder="2009" className={inputClass} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Seen by members only. Please don&rsquo;t share photos of today&rsquo;s students without the school&rsquo;s permission.
        </p>
        {busy && <p className="text-sm text-muted-foreground">Preparing the photo…</p>}
        {error && <p className="text-sm font-semibold text-alert">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || busy}>{pending ? "Sharing…" : "Share"}</Button>
          <Button type="button" variant="ghost" onClick={() => { clear(); setOpen(false); }}>Cancel</Button>
        </div>
      </div>
    </form>
  );
}
