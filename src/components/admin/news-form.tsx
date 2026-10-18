"use client";

/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState } from "react";
import { useToastResult } from "@/components/use-toast-result";
import { saveNews } from "@/app/admin/actions";
import type { NewsPost } from "@/lib/types";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { usePhoto } from "./use-photo";

export function NewsForm({ post }: { post: NewsPost | null }) {
  const [state, action, saving] = useActionState(saveNews, null);
  useToastResult(state);
  const { photo, busy, error: photoError, choose, addTo } = usePhoto();
  const err = state?.errors ?? {};
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        addTo(fd);
        startTransition(() => action(fd));
      }}
      className="flex max-w-3xl flex-col gap-7"
    >
      <input type="hidden" name="id" value={post?.id ?? ""} />

      <fieldset className="flex flex-wrap gap-6">
        <legend className="mb-2 font-semibold">Type</legend>
        {(["news", "event"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2">
            <input type="radio" name="kind" value={k} defaultChecked={(post?.kind ?? "news") === k} className="size-4 accent-tea" />
            {k === "news" ? "News" : "Event"}
          </label>
        ))}
      </fieldset>

      <Field label="Title" name="title" error={err.title}>
        <input id="title" name="title" defaultValue={post?.title} required maxLength={140} className={inputClass} aria-invalid={!!err.title} />
      </Field>

      <Field label="Date" name="date" hint="For an event, the day it happens. For news, the day it happened." error={err.date}>
        <input id="date" name="date" type="date" defaultValue={post?.date ?? today} required className={`${inputClass} sm:max-w-xs`} aria-invalid={!!err.date} />
      </Field>

      <Field label="Summary" name="summary" hint="One or two sentences, shown on the news cards. For events, include the time and place." error={err.summary}>
        <textarea id="summary" name="summary" defaultValue={post?.summary} rows={3} maxLength={400} required className={inputClass} aria-invalid={!!err.summary} />
      </Field>

      <Field label="Full story (optional)" name="body" hint="If you add a story, the card gets a “Read more” link. Leave a blank line between paragraphs." error={err.body}>
        <textarea id="body" name="body" defaultValue={post?.body.join("\n\n")} rows={8} className={inputClass} />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Photo (optional)</legend>
        {post?.photo && !photo && (
          <div className="flex flex-wrap items-end gap-4">
            <img src={post.photo.srcSmall} alt="" className="max-h-40 rounded-md" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="removePhoto" className="size-4 accent-tea" /> Remove this photo
            </label>
          </div>
        )}
        <input
          name="photo"
          type="file"
          accept="image/*"
          aria-label={post?.photo ? "Replace the photo" : "Choose a photo"}
          onChange={(e) => choose(e.target.files?.[0])}
          className="text-sm file:mr-3 file:rounded-md file:border-2 file:border-ink file:bg-surface file:px-3 file:py-1.5 file:font-semibold"
        />
        {busy && <p className="text-sm text-ink-soft">Preparing the photo…</p>}
        {photoError && <p className="text-sm font-semibold text-alert">{photoError}</p>}
        {photo && <img src={photo.preview} alt="" className="max-h-40 self-start rounded-md" />}
        <Field label="Photo caption" name="photoCaption" hint="Say who or what is in the photo.">
          <input id="photoCaption" name="photoCaption" defaultValue={post?.photo?.caption === post?.title ? "" : post?.photo?.caption} maxLength={200} className={inputClass} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Show on the website?</legend>
        {[
          { value: "published", label: "Publish", hint: "Visible to everyone straight away" },
          { value: "draft", label: "Save as draft", hint: "Only admins and the Secretary can see it" },
          { value: "archived", label: "Hide", hint: "Taken off the website but kept on file" },
        ].map((o) => (
          <label key={o.value} className="flex items-start gap-3">
            <input type="radio" name="status" value={o.value} defaultChecked={(post?.status ?? "draft") === o.value} className="mt-1.5 size-4 accent-tea" />
            <span>
              {o.label}
              <span className="block text-sm text-ink-soft">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving || busy} className={buttonClass("primary", "lg")}>
          {saving ? "Saving…" : "Save"}
        </button>
        {state?.message && !state.ok && (
          <p role="alert" className="font-semibold text-alert">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
