"use client";

/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState, useRef, useState } from "react";
import type { ActionState } from "@/lib/admin/staff";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { shareStory } from "@/app/app/actions";
import { usePhoto } from "@/components/admin/use-photo";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      {children}
      {hint && !error && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      {error && <span className="text-xs text-alert">{error}</span>}
    </label>
  );
}

/** Share your own story or suggest someone else's. The photo is shrunk on the phone before upload. */
export function StoryForm({ myName }: { myName: string }) {
  const { photo, busy, error: photoError, choose, addTo, clear } = usePhoto([1600, 800]);
  const form = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"own" | "nomination">("own");
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await shareStory(prev, fd);
    if (result?.ok) {
      toast.success(result.message);
      form.current?.reset();
      clear();
      setKind("own");
    } else if (result?.message) toast.error(result.message);
    return result;
  }, null);
  const err = state?.errors ?? {};

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("photo");
        if (photo) addTo(fd);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-4"
    >
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Whose story is it?</legend>
        {([["own", "My own story", `Shared as ${myName}`], ["nomination", "Someone else's", "A classmate, teacher or friend"]] as const).map(([value, label, hint]) => (
          <label key={value} className={`flex cursor-pointer flex-col rounded-xl p-3 ring-1 ${kind === value ? "bg-secondary ring-tea" : "ring-border"}`}>
            <span className="flex items-center gap-2 font-semibold">
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="accent-tea" />
              {label}
            </span>
            <span className="ml-6 text-xs text-muted-foreground">{hint}</span>
          </label>
        ))}
      </fieldset>

      {kind === "nomination" && (
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <Field label="Who is it about?" error={err.subjectName}>
            <input name="subjectName" maxLength={120} placeholder="Their name" className={inputClass} />
          </Field>
          <Field label="Class of" error={err.subjectYear}>
            <input name="subjectYear" inputMode="numeric" maxLength={4} placeholder="2004" className={inputClass} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="How can we reach them? (optional)" hint="Phone or email. Only the officials see this; we ask them before publishing." error={err.subjectContact}>
              <input name="subjectContact" maxLength={120} className={inputClass} />
            </Field>
          </div>
        </div>
      )}

      <Field label="Title" error={err.title}>
        <input name="title" maxLength={120} placeholder="e.g. From the Menyenya lab to a career in medicine" className={inputClass} />
      </Field>
      <Field label="In one or two lines (optional)" hint="Shown on the stories page." error={err.summary}>
        <textarea name="summary" rows={2} maxLength={280} className={inputClass} />
      </Field>
      <Field label="The story" hint="What happened at Menyenya, what came after, and what you'd tell students today." error={err.body}>
        <textarea name="body" rows={9} maxLength={8000} className={inputClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-start">
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted text-center text-xs font-semibold text-muted-foreground hover:border-tea">
          {photo ? <img src={photo.preview} alt="" className="size-full object-cover" /> : (<><ImagePlus className="size-7" /> Add a photo (optional)</>)}
          <input name="photo" type="file" accept="image/*" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
        </label>
        <div className="flex flex-col gap-2">
          <Field label="Photo caption (optional)">
            <input name="photoCaption" maxLength={200} placeholder="Who's in it, and where" className={inputClass} />
          </Field>
          {busy && <p className="text-sm text-muted-foreground">Preparing the photo…</p>}
          {photoError && <p className="text-sm font-semibold text-alert">{photoError}</p>}
          {photo && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={clear}>Remove photo</Button>}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        The officials read every story before it appears on the public website, and may tidy the wording.
        {kind === "own" ? " By sending it you agree to it being published with your name." : " Nothing about someone else is published until they agree."}
        {" "}Please don&rsquo;t include photos of today&rsquo;s students.
      </p>
      <Button type="submit" size="lg" className="self-start" disabled={pending || busy}>{pending ? "Sending…" : "Send for review"}</Button>
    </form>
  );
}
