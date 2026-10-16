"use client";

import { startTransition, useActionState } from "react";
import { saveChairVideo } from "@/app/admin/actions";
import { Field, buttonClass, inputClass } from "@/components/ui";

export function VideoForm({ current }: { current: string | null }) {
  const [state, action, saving] = useActionState(saveChairVideo, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex max-w-xl flex-col gap-4"
    >
      <Field
        label="YouTube link"
        name="link"
        hint="On YouTube, press Share and copy the link. Upload the video as Unlisted if it shouldn't appear in YouTube search. Leave empty to remove the video."
        error={state?.errors?.link}
      >
        <input
          id="link"
          name="link"
          defaultValue={current ? `https://youtu.be/${current}` : ""}
          placeholder="https://youtu.be/…"
          className={inputClass}
          aria-invalid={!!state?.errors?.link}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className={buttonClass("primary")}>
          {saving ? "Saving…" : "Save video"}
        </button>
        {state?.message && (
          <p role="status" className={`font-semibold ${state.ok ? "text-tea" : "text-alert"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
