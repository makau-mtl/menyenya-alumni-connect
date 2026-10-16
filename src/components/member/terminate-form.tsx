"use client";

import { startTransition, useActionState, useState } from "react";
import { terminateMembership } from "@/app/app/actions";
import { Field, inputClass } from "@/components/ui";

const reasons = ["No longer have time", "Moved away", "Disagree with the association's direction", "Cost of membership", "Joined by mistake", "Other"];

export function TerminateForm({ rejoinDays }: { rejoinDays: number }) {
  const [state, action, pending] = useActionState(terminateMembership, null);
  const [ack, setAck] = useState(false);
  const [typed, setTyped] = useState("");
  const ready = ack && typed.trim().toUpperCase() === "TERMINATE";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-6"
    >
      <Field label="Why are you leaving? (optional)" name="reason" hint="It helps the association improve. Only officials see it.">
        <select id="reason" name="reason" className={inputClass} defaultValue="">
          <option value="">Prefer not to say</option>
          {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Anything else? (optional)" name="reasonText">
        <textarea id="reasonText" name="reasonText" rows={3} maxLength={400} className={inputClass} />
      </Field>

      <label className="flex items-start gap-3 rounded-lg border border-line p-4">
        <input type="checkbox" name="deleteData" className="mt-1.5 size-4 accent-alert" />
        <span>
          <span className="font-semibold">Also delete my personal data</span>
          <span className="block text-sm text-ink-soft">
            Carried out when the {rejoinDays}-day rejoin window closes. Your name, contacts, photo and profile are erased.
            Records of gifts and payments stay in the accounts without your name. You will be emailed a certificate of
            deletion. Rejoining within {rejoinDays} days cancels the request.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="acknowledged" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1.5 size-4 accent-alert" />
        <span>I have read the above and understand that my membership ends now, that there are no refunds, and that fees already paid are forfeited.</span>
      </label>

      <Field label="Type TERMINATE to confirm" name="confirmText">
        <input id="confirmText" name="confirmText" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={`${inputClass} sm:max-w-xs`} />
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={!ready || pending}
          className="inline-flex items-center justify-center rounded-md bg-alert px-6 py-3 text-lg font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Terminating…" : "Terminate my membership"}
        </button>
        {state?.message && <p role="alert" className="font-semibold text-alert">{state.message}</p>}
      </div>
    </form>
  );
}
