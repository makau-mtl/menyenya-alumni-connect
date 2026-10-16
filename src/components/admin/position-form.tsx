"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { savePosition } from "@/app/admin/actions";
import { buttonClass, Field, inputClass } from "@/components/ui";
import { usePhoto } from "./use-photo";

export type PositionValues = {
  id: string;
  section: "leadership" | "secretariat";
  title: string;
  personId: string;
  displayName: string;
  capacityNote: string;
  summary: string;
  linkedinUrl: string;
  photo: string | null;
  hasTenure: boolean;
  termStarts: string;
  termEnds: string;
  status: "published" | "draft";
};

export const emptyPosition: PositionValues = {
  id: "", section: "leadership", title: "", personId: "", displayName: "", capacityNote: "", summary: "",
  linkedinUrl: "", photo: null, hasTenure: false, termStarts: "", termEnds: "", status: "published",
};

/** Add or change a leadership or secretariat position. */
export function PositionForm({ initial, members }: { initial: PositionValues; members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(savePosition, null);
  const [holder, setHolder] = useState<"member" | "other">(initial.id && !initial.personId ? "other" : "member");
  const [tenure, setTenure] = useState(initial.hasTenure);
  const { photo, busy, error: photoError, choose, addTo } = usePhoto();
  const err = state?.errors ?? {};
  const invalid = (k: string) => (err[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.delete("photo");
        if (holder === "other" && photo) addTo(fd);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="id" value={initial.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Section" name="section">
          <select id="section" name="section" defaultValue={initial.section} className={inputClass}>
            <option value="leadership">Leadership (the board)</option>
            <option value="secretariat">Secretariat</option>
          </select>
        </Field>
        <Field label="Role" name="title" error={err.title} hint="As it should appear, e.g. Chair, or School Principal (ex officio).">
          <input id="title" name="title" defaultValue={initial.title} required maxLength={120} className={inputClass} {...invalid("title")} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Who holds this role</legend>
        <label className="flex items-center gap-3">
          <input type="radio" name="holder" value="member" checked={holder === "member"} onChange={() => setHolder("member")} className="size-4 accent-tea" />
          An active member
        </label>
        <label className="flex items-center gap-3">
          <input type="radio" name="holder" value="other" checked={holder === "other"} onChange={() => setHolder("other")} className="size-4 accent-tea" />
          Someone who isn&rsquo;t a member (for example the school principal)
        </label>
      </fieldset>

      {holder === "member" ? (
        <Field label="Member" name="personId" error={err.personId} hint="Their photo, class, summary and LinkedIn come from their own profile.">
          <select id="personId" name="personId" defaultValue={initial.personId} className={inputClass} {...invalid("personId")}>
            <option value="">Choose a member</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Field>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" name="displayName" error={err.displayName}>
            <input id="displayName" name="displayName" defaultValue={initial.displayName} maxLength={120} className={inputClass} {...invalid("displayName")} />
          </Field>
          <Field label="LinkedIn (optional)" name="linkedinUrl" error={err.linkedinUrl}>
            <input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={initial.linkedinUrl} placeholder="https://www.linkedin.com/in/…" className={inputClass} {...invalid("linkedinUrl")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Short summary (optional)" name="summary" error={err.summary} hint="One or two sentences. Shown when someone opens their card.">
              <textarea id="summary" name="summary" defaultValue={initial.summary} maxLength={400} rows={3} className={inputClass} {...invalid("summary")} />
            </Field>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label htmlFor="photo" className="font-semibold">Photo (optional)</label>
            {(photo?.preview ?? initial.photo) && <img src={photo?.preview ?? initial.photo ?? ""} alt="" className="max-h-40 w-auto self-start rounded-md" />}
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={(e) => choose(e.target.files?.[0])}
              className="text-sm file:mr-3 file:rounded-md file:border-2 file:border-ink file:bg-surface file:px-3 file:py-1.5 file:font-semibold"
            />
            {busy && <p className="text-sm text-ink-soft">Preparing the photo…</p>}
            {photoError && <p className="text-sm font-semibold text-alert">{photoError}</p>}
          </div>
        </div>
      )}

      <Field label="Official capacity (optional)" name="capacityNote" error={err.capacityNote} hint="For example: Serves in his official capacity as Principal of Menyenya SDA High School.">
        <input id="capacityNote" name="capacityNote" defaultValue={initial.capacityNote} maxLength={200} className={inputClass} {...invalid("capacityNote")} />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Term of office</legend>
        <label className="flex items-center gap-3">
          <input type="radio" name="hasTenure" value="no" checked={!tenure} onChange={() => setTenure(false)} className="size-4 accent-tea" />
          No fixed term (for example an ex officio role)
        </label>
        <label className="flex items-center gap-3">
          <input type="radio" name="hasTenure" value="yes" checked={tenure} onChange={() => setTenure(true)} className="size-4 accent-tea" />
          Has a term (for example an elected role)
        </label>
        {tenure && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Term starts" name="termStarts" error={err.termStarts}>
              <input id="termStarts" name="termStarts" type="date" defaultValue={initial.termStarts} className={inputClass} {...invalid("termStarts")} />
            </Field>
            <Field label="Term ends" name="termEnds" error={err.termEnds} hint="You will be alerted here 30 days before.">
              <input id="termEnds" name="termEnds" type="date" defaultValue={initial.termEnds} className={inputClass} {...invalid("termEnds")} />
            </Field>
            <p className="text-sm text-ink-soft sm:col-span-2">Term dates are shown to signed-in members only, never to the public.</p>
          </div>
        )}
      </fieldset>

      <Field label="Show on the website" name="status">
        <select id="status" name="status" defaultValue={initial.status} className={`${inputClass} sm:max-w-xs`}>
          <option value="published">Yes, show it</option>
          <option value="draft">Not yet (hidden)</option>
        </select>
      </Field>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending || busy} className={buttonClass("primary")}>
          {pending ? "Saving…" : initial.id ? "Save changes" : "Add position"}
        </button>
        {initial.id && <Link href="/admin/people" className={buttonClass("quiet")}>Cancel</Link>}
        {state?.message && !state.ok && <p role="alert" className="font-semibold text-alert">{state.message}</p>}
      </div>
    </form>
  );
}
