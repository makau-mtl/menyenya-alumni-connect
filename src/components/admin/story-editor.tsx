"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useActionState } from "react";
import { toast } from "sonner";
import { saveStory } from "@/app/admin/actions";
import type { ActionState } from "@/lib/admin/staff";
import type { ReviewStory } from "@/lib/stories";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";

/** Read and tidy a story, record consent, then publish, decline or hide it. */
export function StoryEditor({ story: s, photo, causes = [] }: { story: ReviewStory; photo: string | null; causes?: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await saveStory(prev, fd);
    if (result?.ok) toast.success(result.message);
    else if (result?.message) toast.error(result.message);
    return result;
  }, null);
  const err = (k: string) => state?.errors?.[k];
  const live = s.status === "published";

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={s.id} />
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Whose story" name="subjectName" error={err("subjectName")}>
          <input id="subjectName" name="subjectName" defaultValue={s.subject_name} maxLength={120} className={inputClass} />
        </Field>
        <Field label="Class of" name="subjectYear" error={err("subjectYear")}>
          <input id="subjectYear" name="subjectYear" defaultValue={s.subject_year_left ?? ""} inputMode="numeric" maxLength={4} className={inputClass} />
        </Field>
      </div>
      {s.kind === "impact" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Initiative" name="causeId">
            <select id="causeId" name="causeId" defaultValue={s.cause_id ?? ""} className={inputClass}>
              <option value="">None</option>
              {causes.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Short video (YouTube link)" name="videoUrl" error={err("videoUrl")}>
            <input id="videoUrl" name="videoUrl" defaultValue={s.video_url ?? ""} maxLength={200} placeholder="https://youtu.be/…" className={inputClass} />
          </Field>
        </div>
      )}
      <Field label="Title" name="title" error={err("title")}>
        <input id="title" name="title" defaultValue={s.title} maxLength={120} className={inputClass} />
      </Field>
      <Field label="Short summary" name="summary" hint="One or two lines for the stories page. Leave blank to use the start of the story." error={err("summary")}>
        <textarea id="summary" name="summary" defaultValue={s.summary} rows={2} maxLength={280} className={inputClass} />
      </Field>
      <Field label="The story" name="body" hint="Leave a blank line between paragraphs." error={err("body")}>
        <textarea id="body" name="body" defaultValue={s.body} rows={14} maxLength={8000} className={inputClass} />
      </Field>

      {s.photo_path && (
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr] sm:items-start">
          {photo ? <img src={photo} alt="" className="aspect-square w-full rounded-lg object-cover ring-1 ring-border" /> : <span className="aspect-square rounded-lg bg-muted" />}
          <div className="flex flex-col gap-3">
            <Field label="Photo caption" name="photoCaption">
              <input id="photoCaption" name="photoCaption" defaultValue={s.photo_caption ?? ""} maxLength={200} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removePhoto" className="size-4 accent-tea" /> Don&rsquo;t use this photo
            </label>
          </div>
        </div>
      )}

      <fieldset className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4">
        <legend className="sr-only">Consent and placement</legend>
        <label className="flex items-start gap-2 font-semibold">
          <input type="checkbox" name="consent" defaultChecked={s.consent_given} disabled={s.kind === "own"} className="mt-1 size-4 accent-tea" />
          <span>
            {s.kind === "impact" ? "Agreement recorded (for a student: a parent or guardian, and the school)" : `${s.subject_name} agreed to this story being on the website`}
            {s.kind === "own" && <span className="block text-sm font-normal text-muted-foreground">They sent it themselves.</span>}
            {err("consent") && <span className="block text-sm text-alert">{err("consent")}</span>}
          </span>
        </label>
        {s.kind === "own" && <input type="hidden" name="consent" value="on" />}
        {s.kind !== "own" && (
          <Field label="How they agreed" name="consentNote" hint="e.g. Agreed by phone with the Secretary, 20 Oct.">
            <input id="consentNote" name="consentNote" defaultValue={s.consent_note} maxLength={300} className={inputClass} />
          </Field>
        )}
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="featured" defaultChecked={s.featured} className="size-4 accent-tea" /> Show on the home page (once published)
        </label>
      </fieldset>

      <Field label="Notes for the officials (not shown publicly)" name="editorNote" hint="If you decline, say why, so others know.">
        <textarea id="editorNote" name="editorNote" defaultValue={s.editor_note} rows={2} maxLength={1000} className={inputClass} />
      </Field>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        {!live && <Button type="submit" name="intent" value="publish" disabled={pending}>Approve and publish</Button>}
        <Button type="submit" name="intent" value="save" variant={live ? "default" : "outline"} disabled={pending}>Save changes</Button>
        {s.status === "submitted" && <Button type="submit" name="intent" value="decline" variant="ghost" disabled={pending}>Don&rsquo;t publish</Button>}
        {live && <Button type="submit" name="intent" value="hide" variant="ghost" disabled={pending}>Hide from the website</Button>}
        {live && s.slug && <Button asChild variant="link"><Link href={`/stories/${s.slug}`}>View on the website</Link></Button>}
      </div>
    </form>
  );
}
