"use client";

/* eslint-disable @next/next/no-img-element */
import { startTransition, useActionState } from "react";
import type { ActionState } from "@/lib/admin/staff";
import { buttonClass, inputClass } from "@/components/ui";
import { usePhoto } from "./use-photo";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Choose a photo, add a caption and upload it. Used for cause galleries and site photo spaces. */
export function PhotoUpload({
  action,
  fields,
  buttonLabel = "Upload photo",
  captionHint = "Say who or what is in the photo. Screen readers read this aloud.",
  compact = false,
}: {
  action: Action;
  fields: Record<string, string>;
  buttonLabel?: string;
  captionHint?: string;
  compact?: boolean;
}) {
  const [state, dispatch, saving] = useActionState(action, null);
  const { photo, busy, error, choose, addTo, clear } = usePhoto();
  const id = Object.values(fields).join("-").replace(/[^\w-]/g, "-");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photo) return;
    const fd = new FormData(e.currentTarget);
    addTo(fd);
    // The form clears straight away; the message below says how the upload went.
    clear();
    e.currentTarget.reset();
    startTransition(() => dispatch(fd));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className={compact ? "text-sm font-semibold" : "font-semibold"} htmlFor={`photo-${id}`}>
        {compact ? "Replace with a new photo" : "Add a photo"}
      </label>
      <input
        id={`photo-${id}`}
        name="photo"
        type="file"
        accept="image/*"
        onChange={(e) => choose(e.target.files?.[0])}
        className="text-sm file:mr-3 file:rounded-md file:border-2 file:border-ink file:bg-surface file:px-3 file:py-1.5 file:font-semibold"
      />
      {busy && <p className="text-sm text-ink-soft">Preparing the photo…</p>}
      {error && <p className="text-sm font-semibold text-alert">{error}</p>}
      {photo && (
        <>
          <img src={photo.preview} alt="" className="max-h-48 w-auto self-start rounded-md" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`caption-${id}`} className="text-sm font-semibold">
              Caption
            </label>
            <p className="text-sm text-ink-soft">{captionHint}</p>
            <input id={`caption-${id}`} name="caption" maxLength={200} className={inputClass} />
          </div>
          <button type="submit" disabled={saving} className={`${buttonClass("primary", "sm")} self-start`}>
            {buttonLabel}
          </button>
        </>
      )}
      {saving && <p role="status" className="text-sm font-semibold">Uploading the photo…</p>}
      {!saving && state?.message && !photo && (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-tea" : "text-alert"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
