"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { savePackage, saveSupporter } from "@/app/admin/actions";
import { buttonClass, Field, inputClass } from "@/components/ui";
import { usePhoto } from "./use-photo";

type Kind = "sponsor" | "partner";

export type SupporterValues = {
  id: string; kind: Kind; name: string; websiteUrl: string; blurb: string; packageId: string;
  sinceYear: string; featured: boolean; status: "published" | "draft"; logo: string | null;
};
export const emptySupporter: SupporterValues = {
  id: "", kind: "sponsor", name: "", websiteUrl: "", blurb: "", packageId: "", sinceYear: "", featured: false, status: "published", logo: null,
};

export type PackageValues = {
  id: string; kind: Kind; name: string; audience: string; description: string; benefits: string;
  amount: string; amountPeriod: "one_off" | "annual"; status: "published" | "draft";
};
export const emptyPackage: PackageValues = {
  id: "", kind: "sponsor", name: "", audience: "", description: "", benefits: "", amount: "", amountPeriod: "annual", status: "published",
};

function useInvalid(errors: Record<string, string>) {
  return (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});
}

function Actions({ pending, editing, label, message }: { pending: boolean; editing: boolean; label: string; message?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending} className={buttonClass("primary")}>{pending ? "Saving…" : editing ? "Save changes" : label}</button>
      {editing && <Link href="/admin/support" className={buttonClass("quiet")}>Cancel</Link>}
      {message && <p role="alert" className="font-semibold text-alert">{message}</p>}
    </div>
  );
}

export function SupporterForm({ initial, packages }: { initial: SupporterValues; packages: { id: string; name: string; kind: Kind }[] }) {
  const [state, action, pending] = useActionState(saveSupporter, null);
  const [kind, setKind] = useState<Kind>(initial.kind);
  const { photo, busy, error: photoError, choose, addTo } = usePhoto([800, 400]);
  const err = state?.errors ?? {};
  const invalid = useInvalid(err);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("photo");
        if (photo) addTo(fd);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="id" value={initial.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Type" name="kind">
          <select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={inputClass}>
            <option value="sponsor">Corporate sponsor</option>
            <option value="partner">Strategic partner</option>
          </select>
        </Field>
        <Field label="Organisation name" name="name" error={err.name}>
          <input id="name" name="name" defaultValue={initial.name} required maxLength={120} className={inputClass} {...invalid("name")} />
        </Field>
        <Field label="Website (optional)" name="websiteUrl" error={err.websiteUrl}>
          <input id="websiteUrl" name="websiteUrl" type="url" defaultValue={initial.websiteUrl} placeholder="https://…" className={inputClass} {...invalid("websiteUrl")} />
        </Field>
        <Field label={kind === "sponsor" ? "Sponsorship option (optional)" : "Partnership area (optional)"} name="packageId">
          <select id="packageId" name="packageId" defaultValue={initial.packageId} className={inputClass}>
            <option value="">None</option>
            {packages.filter((p) => p.kind === kind).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Supporting us since (optional)" name="sinceYear" error={err.sinceYear}>
          <input id="sinceYear" name="sinceYear" inputMode="numeric" maxLength={4} defaultValue={initial.sinceYear} className={`${inputClass} w-32`} {...invalid("sinceYear")} />
        </Field>
        <Field label="Show on the website" name="status">
          <select id="status" name="status" defaultValue={initial.status} className={inputClass}>
            <option value="published">Yes, show it</option>
            <option value="draft">Not yet (hidden)</option>
          </select>
        </Field>
      </div>
      <Field label="One line about them (optional)" name="blurb" error={err.blurb}>
        <input id="blurb" name="blurb" defaultValue={initial.blurb} maxLength={300} className={inputClass} {...invalid("blurb")} />
      </Field>
      <div className="flex flex-col gap-2">
        <label htmlFor="photo" className="font-semibold">Logo</label>
        <p className="text-sm text-ink-soft">A PNG with a transparent or white background looks best. Logos show in grey and turn to colour on hover.</p>
        {(photo?.preview ?? initial.logo) && <img src={photo?.preview ?? initial.logo ?? ""} alt="" className="h-20 w-auto self-start rounded-md bg-white object-contain p-2 ring-1 ring-line" />}
        <input id="photo" name="photo" type="file" accept="image/*" onChange={(e) => choose(e.target.files?.[0])}
          className="text-sm file:mr-3 file:rounded-md file:border-2 file:border-ink file:bg-surface file:px-3 file:py-1.5 file:font-semibold" />
        {busy && <p className="text-sm text-ink-soft">Preparing the logo…</p>}
        {photoError && <p className="text-sm font-semibold text-alert">{photoError}</p>}
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="featured" defaultChecked={initial.featured} className="mt-1.5 size-4 accent-tea" />
        <span>Also show on the home page</span>
      </label>
      <Actions pending={pending || busy} editing={Boolean(initial.id)} label="Add" message={state && !state.ok ? state.message : undefined} />
    </form>
  );
}

export function PackageForm({ initial }: { initial: PackageValues }) {
  const [state, action, pending] = useActionState(savePackage, null);
  const err = state?.errors ?? {};
  const invalid = useInvalid(err);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="id" value={initial.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Page" name="pkind">
          <select id="pkind" name="kind" defaultValue={initial.kind} className={inputClass}>
            <option value="sponsor">Corporate sponsorships (an option)</option>
            <option value="partner">Strategic partnerships (an area)</option>
          </select>
        </Field>
        <Field label="Name" name="pname" error={err.name} hint="e.g. Business Alliance, or Mentorship and careers.">
          <input id="pname" name="name" defaultValue={initial.name} required maxLength={80} className={inputClass} {...invalid("name")} />
        </Field>
      </div>
      <Field label="Who it is for (optional)" name="audience" error={err.audience} hint="Short line above the name, e.g. For businesses that want to grow impact with us.">
        <input id="audience" name="audience" defaultValue={initial.audience} maxLength={160} className={inputClass} {...invalid("audience")} />
      </Field>
      <Field label="Description" name="description" error={err.description}>
        <textarea id="description" name="description" defaultValue={initial.description} rows={3} maxLength={600} className={inputClass} {...invalid("description")} />
      </Field>
      <Field label="What they receive (one per line)" name="benefits" error={err.benefits} hint="e.g. Logo on our website · Certificate of appreciation · Quarterly impact updates">
        <textarea id="benefits" name="benefits" defaultValue={initial.benefits} rows={4} className={inputClass} {...invalid("benefits")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Amount in KES (optional)" name="amount" error={err.amount} hint="Leave blank to show “Amount on request”.">
          <input id="amount" name="amount" inputMode="numeric" defaultValue={initial.amount} className={inputClass} {...invalid("amount")} />
        </Field>
        <Field label="Per" name="amountPeriod">
          <select id="amountPeriod" name="amountPeriod" defaultValue={initial.amountPeriod} className={inputClass}>
            <option value="annual">Year</option>
            <option value="one_off">One-off</option>
          </select>
        </Field>
        <Field label="Show on the website" name="pstatus">
          <select id="pstatus" name="status" defaultValue={initial.status} className={inputClass}>
            <option value="published">Yes, show it</option>
            <option value="draft">Not yet (hidden)</option>
          </select>
        </Field>
      </div>
      <Actions pending={pending} editing={Boolean(initial.id)} label="Add option" message={state && !state.ok ? state.message : undefined} />
    </form>
  );
}
