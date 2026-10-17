"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { savePriorityView } from "@/app/app/actions";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

const scale = [
  { v: 1, label: "Not important" },
  { v: 2, label: "Slightly" },
  { v: 3, label: "Important" },
  { v: 4, label: "Very" },
  { v: 5, label: "Most urgent" },
];

/** How important a member thinks one priority is (1–5), with an optional comment. */
export function PriorityView({ id, importance, comment }: { id: string; importance: number | null; comment: string | null }) {
  const [state, action, pending] = useActionState(savePriorityView, null);
  const [value, setValue] = useState(importance ?? 0);
  useEffect(() => {
    if (state?.message) (state.ok ? toast.success : toast.error)(state.message);
  }, [state]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="mt-4 flex flex-col gap-3"
    >
      <input type="hidden" name="priorityId" value={id} />
      <input type="hidden" name="importance" value={value} />
      <fieldset>
        <legend className="text-sm font-semibold">How important is this to you?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {scale.map((s) => (
            <button
              key={s.v}
              type="button"
              aria-pressed={value === s.v}
              onClick={() => setValue(s.v)}
              className={`flex min-w-16 flex-col items-center rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition ${
                value === s.v ? "border-tea bg-tea text-white" : "border-border bg-card hover:border-tea"
              }`}
            >
              <span className="font-display text-lg leading-none">{s.v}</span>
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm font-semibold">
        Your thoughts (optional, seen only by the people who manage the priorities)
        <textarea name="comment" rows={2} maxLength={1000} defaultValue={comment ?? ""} className={inputClass} />
      </label>
      <Button type="submit" disabled={pending || !value} className="self-start">
        {pending ? "Saving…" : importance ? "Update my view" : "Save my view"}
      </Button>
    </form>
  );
}
