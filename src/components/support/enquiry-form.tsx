"use client";

import { startTransition, useActionState } from "react";
import { useToastResult } from "@/components/use-toast-result";
import { sendEnquiry } from "@/app/support/actions";
import { buttonClass, Field, inputClass } from "@/components/ui";

export function EnquiryForm({ kind, packages, packageLabel }: { kind: "sponsor" | "partner"; packages: { id: string; name: string }[]; packageLabel: string }) {
  const [state, action, pending] = useActionState(sendEnquiry, null);
  useToastResult(state);
  const err = state?.errors ?? {};
  const invalid = (k: string) => (err[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});

  if (state?.ok) {
    return (
      <div role="status" className="rounded-2xl bg-tea-tint p-8">
        <p className="font-display text-2xl font-bold">Message received</p>
        <p className="mt-2 text-lg">{state.message}</p>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-5 sm:grid-cols-2"
    >
      <input type="hidden" name="kind" value={kind} />
      <div aria-hidden className="hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Field label="Organisation" name="organisation" error={err.organisation}>
        <input id="organisation" name="organisation" required maxLength={160} autoComplete="organization" className={inputClass} {...invalid("organisation")} />
      </Field>
      <Field label="Your name" name="contactName" error={err.contactName}>
        <input id="contactName" name="contactName" required maxLength={120} autoComplete="name" className={inputClass} {...invalid("contactName")} />
      </Field>
      <Field label="Email" name="email" error={err.email}>
        <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} {...invalid("email")} />
      </Field>
      <Field label="Phone (optional)" name="phone" error={err.phone}>
        <input id="phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className={inputClass} {...invalid("phone")} />
      </Field>
      {packages.length > 0 && (
        <div className="sm:col-span-2">
          <Field label={packageLabel} name="packageId">
            <select id="packageId" name="packageId" defaultValue="" className={inputClass}>
              <option value="">Not sure yet</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
        </div>
      )}
      <div className="sm:col-span-2">
        <Field label="Message (optional)" name="message" error={err.message} hint="Tell us what you have in mind.">
          <textarea id="message" name="message" rows={4} maxLength={3000} className={inputClass} {...invalid("message")} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
          {pending ? "Sending…" : "Send enquiry"}
        </button>
        {state?.message && <p role="alert" className="font-semibold text-alert">{state.message}</p>}
      </div>
      <p className="text-sm text-ink-soft sm:col-span-2">
        We use these details only to reply to you. See our <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}
