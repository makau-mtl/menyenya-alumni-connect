"use client";

/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { createImpactStory, saveImpactFigure } from "@/app/admin/actions";
import type { ActionState } from "@/lib/admin/staff";
import { usePhoto } from "@/components/admin/use-photo";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";

type Cause = { id: string; title: string };

function useToasted(action: (p: ActionState, fd: FormData) => Promise<ActionState>) {
  return useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.message) (result.ok ? toast.success : toast.error)(result.message);
    return result;
  }, null);
}

export function ImpactFigureForm({ causes, initial }: { causes: Cause[]; initial?: { id: string; cause_id: string; value: string; label: string; as_of: string; note: string } }) {
  const [state, action, pending] = useToasted(saveImpactFigure);
  const err = (k: string) => state?.errors?.[k];
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={initial?.id ?? ""} />
      <Field label="Initiative" name="causeId" error={err("causeId")}>
        <select id="causeId" name="causeId" defaultValue={initial?.cause_id ?? causes[0]?.id} className={inputClass}>
          {causes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
        <Field label="Figure" name="value" error={err("value")}>
          <input id="value" name="value" maxLength={24} placeholder="12" defaultValue={initial?.value} className={inputClass} />
        </Field>
        <Field label="What it counts" name="label" error={err("label")}>
          <input id="label" name="label" maxLength={80} placeholder="students on bursaries in 2027" defaultValue={initial?.label} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
        <Field label="Correct as at" name="asOf" error={err("asOf")}>
          <input id="asOf" name="asOf" type="date" defaultValue={initial?.as_of ?? new Date().toISOString().slice(0, 10)} className={inputClass} />
        </Field>
        <Field label="Note (optional)" name="note" hint="e.g. From the 2027 financial statements.">
          <input id="note" name="note" maxLength={200} defaultValue={initial?.note} className={inputClass} />
        </Field>
      </div>
      <Button type="submit" className="self-start" disabled={pending}>{initial ? "Save changes" : "Add figure"}</Button>
    </form>
  );
}

export function ImpactStoryForm({ causes }: { causes: Cause[] }) {
  const { photo, busy, error: photoError, choose, addTo, clear } = usePhoto([1600, 800]);
  const [state, action, pending] = useToasted(createImpactStory);
  const err = (k: string) => state?.errors?.[k];
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("photo");
        if (photo) addTo(fd);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Initiative" name="causeId" error={err("causeId")}>
          <select id="causeId" name="causeId" className={inputClass}>
            {causes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
        <Field label="Who it is about" name="subjectName" error={err("subjectName")} hint="For a student: first name and form only, e.g. Wanjiku, Form 3.">
          <input id="subjectName" name="subjectName" maxLength={120} className={inputClass} />
        </Field>
      </div>
      <Field label="Title" name="title" error={err("title")}>
        <input id="title" name="title" maxLength={120} placeholder="e.g. Back in class, and top of her stream" className={inputClass} />
      </Field>
      <Field label="Short summary" name="summary" error={err("summary")}>
        <textarea id="summary" name="summary" rows={2} maxLength={280} className={inputClass} />
      </Field>
      <Field label="The story" name="body" error={err("body")} hint="Leave a blank line between paragraphs.">
        <textarea id="body" name="body" rows={10} maxLength={8000} className={inputClass} />
      </Field>
      <Field label="Short video (optional)" name="videoUrl" error={err("videoUrl")} hint="Upload the video to the association's YouTube channel, then paste its link here.">
        <input id="videoUrl" name="videoUrl" maxLength={200} placeholder="https://youtu.be/…" className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:items-start">
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted text-center text-xs font-semibold text-muted-foreground hover:border-tea">
          {photo ? <img src={photo.preview} alt="" className="size-full object-cover" /> : (<><ImagePlus className="size-7" /> Add a photo (optional)</>)}
          <input name="photo" type="file" accept="image/*" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
        </label>
        <div className="flex flex-col gap-2">
          <Field label="Photo caption" name="photoCaption"><input id="photoCaption" name="photoCaption" maxLength={200} className={inputClass} /></Field>
          {busy && <p className="text-sm text-muted-foreground">Preparing the photo…</p>}
          {photoError && <p className="text-sm font-semibold text-alert">{photoError}</p>}
          {photo && <Button type="button" variant="ghost" size="sm" className="self-start" onClick={clear}>Remove photo</Button>}
        </div>
      </div>
      <p className="rounded-lg bg-gold-tint/60 p-3 text-sm">
        A student&rsquo;s story needs the agreement of a parent or guardian <strong>and</strong> the school before it is published, and a
        student&rsquo;s face is shown only with that agreement. You record the agreement on the next screen.
      </p>
      <Button type="submit" size="lg" className="self-start" disabled={pending || busy}>{pending ? "Saving…" : "Save and continue"}</Button>
    </form>
  );
}
