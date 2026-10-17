"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { saveCohortWelcome } from "@/app/app/actions";
import type { ActionState } from "@/lib/admin/staff";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

export function CohortWelcomeForm({ year, current }: { year: number; current: string }) {
  const [, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await saveCohortWelcome(prev, fd);
    if (r?.message) (r.ok ? toast.success : toast.error)(r.message);
    return r;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="year" value={year} />
      <label htmlFor="welcome" className="text-sm font-semibold">Welcome note (you can edit this as cohort rep)</label>
      <textarea id="welcome" name="welcome" defaultValue={current} rows={3} maxLength={800} placeholder="Karibu! Plans for our reunion, how to reach me…" className={inputClass} />
      <Button type="submit" size="sm" variant="outline" className="self-start" disabled={pending}>Save welcome</Button>
    </form>
  );
}
