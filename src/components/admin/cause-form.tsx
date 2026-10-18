"use client";

import { startTransition, useActionState, useState } from "react";
import { useToastResult } from "@/components/use-toast-result";
import { updateCause } from "@/app/admin/actions";
import { lifecycleLabels } from "@/lib/admin/labels";
import type { Component, ReadinessItem } from "@/lib/types";
import { Field, buttonClass, inputClass } from "@/components/ui";

export type CauseFormValues = {
  slug: string;
  title: string;
  summary: string;
  story: string[];
  components: Component[];
  readiness: ReadinessItem[];
  targetAmount: number | null;
  lifecycle: string;
  visibility: string;
  pledgesEnabled: boolean;
};

const smallButton = "rounded-md border border-line px-2.5 py-1 text-sm font-semibold hover:border-ink";

export function CauseForm({ cause }: { cause: CauseFormValues }) {
  const [state, action, saving] = useActionState(updateCause, null);
  useToastResult(state);
  const [components, setComponents] = useState<Component[]>(cause.components);
  const [readiness, setReadiness] = useState<ReadinessItem[]>(cause.readiness);
  const err = state?.errors ?? {};

  return (
    // Submitted by hand so typed changes stay in the form if something needs fixing.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex max-w-3xl flex-col gap-7"
    >
      <input type="hidden" name="slug" value={cause.slug} />
      <input type="hidden" name="components" value={JSON.stringify(components)} />
      <input type="hidden" name="readiness" value={JSON.stringify(readiness)} />

      <Field label="Title" name="title" error={err.title}>
        <input id="title" name="title" defaultValue={cause.title} required maxLength={120} className={inputClass} aria-invalid={!!err.title} />
      </Field>

      <Field label="Summary" name="summary" hint="One or two sentences. Shown on cards and at the top of the cause page." error={err.summary}>
        <textarea id="summary" name="summary" defaultValue={cause.summary} rows={3} maxLength={400} className={inputClass} aria-invalid={!!err.summary} />
      </Field>

      <Field label="Why this matters" name="story" hint="Leave a blank line between paragraphs." error={err.story}>
        <textarea id="story" name="story" defaultValue={cause.story.join("\n\n")} rows={10} className={inputClass} />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">What it includes</legend>
        <p className="text-sm text-ink-soft">For the tuition block: the library, laboratories and so on. Leave empty if not needed.</p>
        {components.map((c, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[1fr_2fr_auto]">
            <input
              aria-label={`Part ${i + 1} name`}
              placeholder="Name, e.g. Library"
              value={c.name}
              maxLength={80}
              onChange={(e) => setComponents(components.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              className={inputClass}
            />
            <input
              aria-label={`Part ${i + 1} purpose`}
              placeholder="What it is for"
              value={c.purpose}
              maxLength={300}
              onChange={(e) => setComponents(components.map((x, j) => (j === i ? { ...x, purpose: e.target.value } : x)))}
              className={inputClass}
            />
            <button type="button" className={smallButton} onClick={() => setComponents(components.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className={`${smallButton} self-start`} onClick={() => setComponents([...components, { name: "", purpose: "" }])}>
          Add a part
        </button>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Launch checklist</legend>
        <p className="text-sm text-ink-soft">Shown while the cause is preparing for launch. Tick each step when it is done.</p>
        {readiness.map((r, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-line p-3 sm:grid-cols-[auto_1fr_auto]">
            <input
              type="checkbox"
              aria-label={`Step ${i + 1} done`}
              checked={r.done}
              onChange={(e) => setReadiness(readiness.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))}
              className="size-5 accent-tea"
            />
            <input
              aria-label={`Step ${i + 1}`}
              value={r.label}
              maxLength={200}
              onChange={(e) => setReadiness(readiness.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              className={`${inputClass} min-w-0`}
            />
            <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
              <button type="button" className={smallButton} disabled={i === 0} aria-label={`Move step ${i + 1} up`}
                onClick={() => setReadiness(swap(readiness, i, i - 1))}>↑</button>
              <button type="button" className={smallButton} disabled={i === readiness.length - 1} aria-label={`Move step ${i + 1} down`}
                onClick={() => setReadiness(swap(readiness, i, i + 1))}>↓</button>
              <button type="button" className={smallButton} onClick={() => setReadiness(readiness.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <button type="button" className={`${smallButton} self-start`} onClick={() => setReadiness([...readiness, { label: "", done: false }])}>
          Add a step
        </button>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Target (KES)" name="target" hint="Leave empty if the cause has no target." error={err.target}>
          <input
            id="target"
            name="target"
            inputMode="numeric"
            defaultValue={cause.targetAmount === null ? "" : cause.targetAmount.toLocaleString("en-KE")}
            className={inputClass}
            aria-invalid={!!err.target}
          />
        </Field>
        <Field label="Who can see it" name="visibility">
          <select id="visibility" name="visibility" defaultValue={cause.visibility} className={inputClass}>
            <option value="public">Everyone</option>
            <option value="members">Signed-in members only</option>
          </select>
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-semibold">Stage</legend>
        {Object.entries(lifecycleLabels).map(([value, { label, hint }]) => (
          <label key={value} className="flex items-start gap-3">
            <input type="radio" name="lifecycle" value={value} defaultChecked={cause.lifecycle === value} className="mt-1.5 size-4 accent-tea" />
            <span>
              {label}
              <span className="block text-sm text-ink-soft">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="pledgesEnabled" defaultChecked={cause.pledgesEnabled} className="mt-1.5 size-4 accent-tea" />
        <span>
          Accept pledges
          <span className="block text-sm text-ink-soft">Shows the &ldquo;Make a pledge&rdquo; button. Gifts are always accepted while the cause is shown.</span>
        </span>
      </label>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur">
        <button type="submit" disabled={saving} className={buttonClass("primary", "lg")}>
          {saving ? "Saving…" : "Save changes"}
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

function swap<T>(list: T[], a: number, b: number): T[] {
  const copy = [...list];
  [copy[a], copy[b]] = [copy[b], copy[a]];
  return copy;
}
