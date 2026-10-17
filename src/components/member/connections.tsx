"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { createMeetup, saveClassGroup } from "@/app/app/actions";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/admin/staff";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function useToastForm(action: Action, onDone?: () => void) {
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.ok) {
      toast.success(result.message);
      form.current?.reset();
      onDone?.();
    } else if (result?.message) toast.error(result.message);
    return result;
  }, null);
  return {
    form,
    pending,
    err: (k: string) => state?.errors?.[k],
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(() => run(fd));
    },
  };
}

/** The class rep adds or changes the class WhatsApp group link. */
export function ClassGroupForm({ year, current }: { year: number; current: string | null }) {
  const [open, setOpen] = useState(false);
  const { form, onSubmit, pending } = useToastForm(saveClassGroup, () => setOpen(false));
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-white/90 underline underline-offset-4 hover:text-white">
        {current ? "Change the class WhatsApp link" : "Add your class WhatsApp group link (class rep)"}
      </button>
    );
  }
  return (
    <form ref={form} onSubmit={onSubmit} className="flex w-full flex-wrap items-end gap-2">
      <input type="hidden" name="year" value={year} />
      <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-semibold text-white">
        WhatsApp group invite link
        <input name="url" defaultValue={current ?? ""} placeholder="https://chat.whatsapp.com/…" className={`${inputClass} text-ink`} />
      </label>
      <Button type="submit" disabled={pending} className="bg-gold text-ink hover:bg-gold/90">{pending ? "Saving…" : "Save"}</Button>
      <Button type="button" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}

/** Post a meet-up: "I'll be in Kisii town on Saturday — anyone for nyama choma?" */
export function MeetupForm({ hasClass, region }: { hasClass: boolean; region: string | null }) {
  const { form, onSubmit, pending, err } = useToastForm(createMeetup);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  return (
    <form ref={form} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Form ni gani? (What's the plan?)" name="title" error={err("title")} hint="For example: Nyama choma, or chai after church.">
          <input id="title" name="title" required maxLength={100} className={inputClass} />
        </Field>
      </div>
      <Field label="Where (town or area)" name="place" error={err("place")} hint="No exact address needed. Share details with those who are in.">
        <input id="place" name="place" required maxLength={100} placeholder="e.g. Kisii town" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" name="happensOn" error={err("happensOn")}>
          <input id="happensOn" name="happensOn" type="date" min={today} defaultValue={today} required className={inputClass} />
        </Field>
        <Field label="Time (optional)" name="timeNote" error={err("timeNote")}>
          <input id="timeNote" name="timeNote" maxLength={60} placeholder="from 2 pm" className={inputClass} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="A note (optional)" name="note" error={err("note")}>
          <textarea id="note" name="note" rows={2} maxLength={500} className={inputClass} />
        </Field>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="font-semibold">Who can see it</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-2"><input type="radio" name="audience" value="everyone" defaultChecked className="size-4 accent-tea" /> All members</label>
          {hasClass && <label className="flex items-center gap-2"><input type="radio" name="audience" value="class" className="size-4 accent-tea" /> My class</label>}
          {region && <label className="flex items-center gap-2"><input type="radio" name="audience" value="region" className="size-4 accent-tea" /> {region} region</label>}
        </div>
      </fieldset>
      <Button type="submit" disabled={pending} className="self-start sm:col-span-2" size="lg">{pending ? "Posting…" : "Weka form!"}</Button>
    </form>
  );
}
