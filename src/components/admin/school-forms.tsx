"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { saveResult, savePriority, saveSchoolStats } from "@/app/admin/actions";
import type { ActionState } from "@/lib/admin/staff";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function useToastForm(action: Action, resetOnSuccess = false) {
  const [state, run, pending] = useActionState(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) {
      toast.success(state.message);
      if (resetOnSuccess) form.current?.reset();
    } else toast.error(state.message);
  }, [state, resetOnSuccess]);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  };
  const err = (k: string) => state?.errors?.[k];
  return { form, onSubmit, pending, err };
}

type Fees = { feesYear: number | null; termFee: number | null; annualFee: number | null; needyAdmitted: number | null };

export function SchoolStatsForm({ last, fees }: { last: { students: number; needy: number | null; supported: number | null; teachers: number | null } | null; fees: Fees | null }) {
  const { form, onSubmit, pending, err } = useToastForm(saveSchoolStats);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Figures as of" name="asOf" error={err("asOf")}>
          <input id="asOf" name="asOf" type="date" defaultValue={today} className={inputClass} />
        </Field>
        <Field label="Students" name="students" error={err("students")}>
          <input id="students" name="students" inputMode="numeric" required defaultValue={last?.students ?? ""} className={inputClass} />
        </Field>
        <Field label="Teachers (optional)" name="teachers" error={err("teachers")}>
          <input id="teachers" name="teachers" inputMode="numeric" defaultValue={last?.teachers ?? ""} className={inputClass} />
        </Field>
        <Field label="Students in need (optional)" name="needy" error={err("needy")}>
          <input id="needy" name="needy" inputMode="numeric" defaultValue={last?.needy ?? ""} className={inputClass} />
        </Field>
        <Field label="Supported by alumni (optional)" name="supported" error={err("supported")}>
          <input id="supported" name="supported" inputMode="numeric" defaultValue={last?.supported ?? ""} className={inputClass} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-4 rounded-lg bg-muted/50 p-4">
        <legend className="px-1 font-semibold">Fees and bursary figures (shown on the Bursary Fund page)</legend>
        <p className="text-sm text-muted-foreground">From the school. Leave blank until confirmed; the website then says &ldquo;to be confirmed&rdquo;.</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Fees for the year" name="feesYear" error={err("feesYear")}>
            <input id="feesYear" name="feesYear" inputMode="numeric" maxLength={4} placeholder="2027" defaultValue={fees?.feesYear ?? ""} className={inputClass} />
          </Field>
          <Field label="Fees per term (KES)" name="termFee" error={err("termFee")}>
            <input id="termFee" name="termFee" inputMode="numeric" defaultValue={fees?.termFee ?? ""} className={inputClass} />
          </Field>
          <Field label="Fees per year (KES)" name="annualFee" error={err("annualFee")}>
            <input id="annualFee" name="annualFee" inputMode="numeric" defaultValue={fees?.annualFee ?? ""} className={inputClass} />
          </Field>
          <Field label="Needy students admitted a year (average)" name="needyAdmitted" error={err("needyAdmitted")}>
            <input id="needyAdmitted" name="needyAdmitted" inputMode="numeric" defaultValue={fees?.needyAdmitted ?? ""} className={inputClass} />
          </Field>
        </div>
      </fieldset>
      <Field label="Note (optional)" name="note" error={err("note")} hint="For example: Figures from the Principal, Term 3.">
        <input id="note" name="note" maxLength={500} className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending} className="self-start">{pending ? "Saving…" : "Save these figures"}</Button>
    </form>
  );
}

export function ResultForm() {
  const { form, onSubmit, pending, err } = useToastForm(saveResult, true);
  return (
    <form ref={form} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[6rem_1fr_7rem_5rem_7rem_auto] sm:items-end">
      <Field label="Year" name="year" error={err("year")}>
        <input id="year" name="year" inputMode="numeric" maxLength={4} required className={inputClass} />
      </Field>
      <Field label="Measure" name="measure" error={err("measure")}>
        <input id="measure" name="measure" defaultValue="KCSE mean score" className={inputClass} />
      </Field>
      <Field label="Score" name="value" error={err("value")}>
        <input id="value" name="value" inputMode="decimal" required placeholder="7.125" className={inputClass} />
      </Field>
      <Field label="Grade" name="grade" error={err("grade")}>
        <input id="grade" name="grade" maxLength={4} placeholder="C+" className={inputClass} />
      </Field>
      <Field label="Candidates" name="candidates" error={err("candidates")}>
        <input id="candidates" name="candidates" inputMode="numeric" className={inputClass} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save year"}</Button>
    </form>
  );
}

export function PriorityForm({ initial }: { initial: { id: string; title: string; description: string } }) {
  const { form, onSubmit, pending, err } = useToastForm(savePriority);
  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={initial.id} />
      <Field label="Priority" name="title" error={err("title")} hint="For example: Completing the tuition block.">
        <input id="title" name="title" required maxLength={120} defaultValue={initial.title} className={inputClass} />
      </Field>
      <Field label="Short explanation (optional)" name="description" error={err("description")}>
        <textarea id="description" name="description" rows={2} maxLength={600} defaultValue={initial.description} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : initial.id ? "Save changes" : "Add priority"}</Button>
        {initial.id && <Button asChild variant="ghost"><Link href="/admin/school#priorities">Cancel</Link></Button>}
      </div>
    </form>
  );
}
