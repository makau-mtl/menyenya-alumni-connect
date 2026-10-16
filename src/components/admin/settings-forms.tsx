"use client";

import { startTransition, useActionState } from "react";
import { assignRole, saveMemberSettings } from "@/app/admin/actions";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { useState } from "react";

const roleLabels: Record<string, string> = {
  cohort_rep: "Class rep (for their own class)",
  cluster_rep: "Regional cluster rep (for their own region)",
  verifier: "Verifier",
  admin: "Administrator",
};

function Save({ pending, state, label = "Save" }: { pending: boolean; state: { ok?: boolean; message?: string } | null; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending} className={buttonClass("primary")}>{pending ? "Saving…" : label}</button>
      {state?.message && <p role="status" className={`font-semibold ${state.ok ? "text-tea" : "text-alert"}`}>{state.message}</p>}
    </div>
  );
}

export function MemberSettingsForm({ verification, roles, rejoinDays }: { verification: boolean; roles: { alumnus: string[]; friend: string[] }; rejoinDays: number }) {
  const [state, action, pending] = useActionState(saveMemberSettings, null);
  const [on, setOn] = useState(verification);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex max-w-3xl flex-col gap-8"
    >
      <fieldset className="rounded-xl border border-line bg-surface p-6">
        <legend className="px-1 text-xl font-bold">Confirming new members</legend>
        <label className="mt-2 flex items-start gap-3">
          <input type="checkbox" name="verification" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-1.5 size-4 accent-tea" />
          <span>
            <span className="font-semibold">New members must be confirmed</span>
            <span className="block text-sm text-ink-soft">
              Off: people are members as soon as they finish registering. On: they show as &ldquo;Registered&rdquo; until someone below confirms them.
            </span>
          </span>
        </label>
        <div className={`mt-6 grid gap-6 sm:grid-cols-2 ${on ? "" : "opacity-50"}`}>
          {(["alumnus", "friend"] as const).map((cat) => (
            <div key={cat}>
              <p className="font-semibold">{cat === "alumnus" ? "Who confirms alumni" : "Who confirms friends of the alumni"}</p>
              <div className="mt-2 flex flex-col gap-2">
                {Object.entries(roleLabels)
                  .filter(([r]) => cat === "alumnus" || r !== "cohort_rep")
                  .map(([r, label]) => (
                    <label key={r} className="flex items-center gap-2">
                      <input type="checkbox" name={`${cat}_${r}`} defaultChecked={roles[cat].includes(r)} disabled={!on} className="size-4 accent-tea" />
                      {label}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-line bg-surface p-6">
        <legend className="px-1 text-xl font-bold">Terminating membership</legend>
        <Field label="Rejoin window (days)" name="rejoinDays" hint="How long a member who terminates can rejoin with everything restored. A deletion request is carried out when this window closes.">
          <input id="rejoinDays" name="rejoinDays" type="number" min={0} max={365} defaultValue={rejoinDays} className={`${inputClass} sm:max-w-32`} />
        </Field>
      </fieldset>
      <Save pending={pending} state={state} />
    </form>
  );
}

type RoleOption = { key: string; name: string; scope: string };

export function AssignRoleForm({
  people, roles, years, regions, committees,
}: {
  people: { id: string; name: string }[];
  roles: RoleOption[];
  years: number[];
  regions: string[];
  committees: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(assignRole, null);
  const [roleKey, setRoleKey] = useState("");
  const scope = roles.find((r) => r.key === roleKey)?.scope ?? "association";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Person" name="person" hint="People with a record: members, and officials who have signed in.">
          <select id="person" name="person" required className={inputClass} defaultValue="">
            <option value="" disabled>Choose a person</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Role" name="role">
          <select id="role" name="role" required value={roleKey} onChange={(e) => setRoleKey(e.target.value)} className={inputClass}>
            <option value="" disabled>Choose a role</option>
            {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </Field>
        {scope === "cohort" && (
          <Field label="For which class" name="year">
            <select id="year" name="year" required className={inputClass} defaultValue="">
              <option value="" disabled>Choose a class</option>
              {years.map((y) => <option key={y} value={y}>Class of {y}</option>)}
            </select>
          </Field>
        )}
        {scope === "cluster" && (
          <Field label="For which regional cluster" name="region">
            <select id="region" name="region" required className={inputClass} defaultValue="">
              <option value="" disabled>Choose a region</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        )}
        {scope === "committee" && (
          <Field label="Which committee" name="committee">
            <select id="committee" name="committee" required className={inputClass} defaultValue="">
              <option value="" disabled>Choose a committee</option>
              {committees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Starts on" name="startsOn">
          <input id="startsOn" name="startsOn" type="date" className={inputClass} />
        </Field>
      </div>
      <Save pending={pending} state={state} label="Give role" />
    </form>
  );
}
