"use client";

import { startTransition, useActionState } from "react";
import { createInviteLink } from "@/app/admin/actions";
import { Field, buttonClass, inputClass } from "@/components/ui";

export function InviteForm({ years }: { years: number[] }) {
  const [state, action, saving] = useActionState(createInviteLink, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Class" name="year" hint="Fills in the class for everyone using the link.">
          <select id="year" name="year" className={inputClass}>
            <option value="">No class (general link)</option>
            {years.map((y) => <option key={y} value={y}>Class of {y}</option>)}
          </select>
        </Field>
        <Field label="Name for the link (optional)" name="label" hint="Shown to people who open it.">
          <input id="label" name="label" maxLength={80} placeholder="e.g. Class of 1998 WhatsApp group" className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="fromMe" defaultChecked className="size-4 accent-tea" /> Record me as the person who invited them
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="tester" className="mt-1 size-4 accent-tea" />
        <span><span className="font-semibold">Testers&rsquo; link</span><span className="block text-sm text-ink-soft">Works while registration is closed. People who join through it are marked as testers; their accounts and test content are cleared at launch.</span></span>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={saving} className={buttonClass("primary")}>{saving ? "Creating…" : "Create link"}</button>
        {state?.message && <p role="status" className={`font-semibold ${state.ok ? "text-tea" : "text-alert"}`}>{state.message}</p>}
      </div>
    </form>
  );
}

export function CopyLink({ url }: { url: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        navigator.clipboard?.writeText(url).then(
          () => {
            e.currentTarget.textContent = "Copied";
          },
          () => {},
        );
      }}
      className="rounded-md border border-line px-2.5 py-1 text-sm font-semibold hover:border-ink"
    >
      Copy link
    </button>
  );
}
