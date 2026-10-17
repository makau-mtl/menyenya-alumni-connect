"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { saveCauseVideo } from "@/app/admin/actions";
import type { ActionState } from "@/lib/admin/staff";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";

const suggestions = [
  "Project video", "Message from the Chairman", "Message from the Principal", "Message from the lead architect",
  "Why I give", "A student's story", "A walk through the design",
];

/** One short video per initiative, with a caption: what it is, and who is speaking. */
export function CauseVideoForm({ slug, initial }: { slug: string; initial: { url: string; title: string; speaker: string } | null }) {
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await saveCauseVideo(prev, fd);
    if (result?.message) (result.ok ? toast.success : toast.error)(result.message);
    return result;
  }, null);
  const err = (k: string) => state?.errors?.[k];
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <Field label="YouTube link" name="url" error={err("url")} hint="Upload the video to the association's YouTube channel (Unlisted is fine), then paste its link.">
        <input id="url" name="url" defaultValue={initial?.url ?? ""} placeholder="https://youtu.be/…" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What it is" name="title" error={err("title")} hint="Shown on the video.">
          <input id="title" name="title" list="video-titles" maxLength={80} defaultValue={initial?.title ?? ""} placeholder="Project video" className={inputClass} />
        </Field>
        <Field label="Who is speaking (optional)" name="speaker" error={err("speaker")} hint="e.g. Peter Ondieki, Class of 2012. Leave blank for a project video with many voices.">
          <input id="speaker" name="speaker" maxLength={100} defaultValue={initial?.speaker ?? ""} className={inputClass} />
        </Field>
      </div>
      <datalist id="video-titles">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Save video</Button>
        {initial && <Button type="submit" name="remove" value="yes" variant="ghost" disabled={pending}>Remove video</Button>}
      </div>
    </form>
  );
}
