"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { GraduationCap, HandHeart, Lightbulb, MessageSquareMore } from "lucide-react";
import { toast } from "sonner";
import { raiseCase } from "@/app/app/actions";
import type { ActionState } from "@/lib/admin/staff";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";

const kinds = [
  { value: "member_in_need", label: "A member in need", hint: "Bereavement, illness or an emergency (yours or another member's)", icon: HandHeart },
  { value: "needy_student", label: "A needy student", hint: "A student at Menyenya who needs fees or support", icon: GraduationCap },
  { value: "project_idea", label: "A project or idea", hint: "Something the association should take on", icon: Lightbulb },
  { value: "other", label: "Something else", hint: "Anything else you'd like the association to look at", icon: MessageSquareMore },
] as const;

export function CaseForm() {
  const form = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<string>("");
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await raiseCase(prev, fd);
    if (result?.ok) {
      toast.success(result.message);
      form.current?.reset();
      setKind("");
    } else if (result?.message) toast.error(result.message);
    return result;
  }, null);
  const err = (k: string) => state?.errors?.[k];
  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <fieldset>
        <legend className="font-semibold">What is it about?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {kinds.map(({ value, label, hint, icon: Icon }) => (
            <label key={value} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${kind === value ? "border-tea bg-secondary" : "border-border bg-card hover:border-tea/60"}`}>
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              <Icon className="mt-0.5 size-6 shrink-0 text-tea" />
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted-foreground">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        {err("kind") && <p className="mt-2 text-sm font-semibold text-alert">{err("kind")}</p>}
      </fieldset>
      <Field label="A short title" name="title" error={err("title")}>
        <input id="title" name="title" required maxLength={120} className={inputClass} />
      </Field>
      <Field label="What happened, or what is the idea?" name="details" error={err("details")}>
        <textarea id="details" name="details" rows={5} required maxLength={4000} className={inputClass} />
      </Field>
      <Field label="What help is needed? (optional)" name="helpNeeded" error={err("helpNeeded")}>
        <textarea id="helpNeeded" name="helpNeeded" rows={2} maxLength={1000} className={inputClass} />
      </Field>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="mayShare" className="mt-1.5 size-4 accent-tea" />
        <span>
          The people handling this may share it with members to rally support
          <span className="block text-sm text-muted-foreground">Leave this unticked to keep it private between you and them.</span>
        </span>
      </label>
      <Button type="submit" disabled={pending} size="lg" className="self-start">{pending ? "Sending…" : "Send"}</Button>
    </form>
  );
}
