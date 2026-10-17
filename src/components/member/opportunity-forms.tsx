"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { postBusiness, postBusinessOpportunity, postJob, postVolunteerRole } from "@/app/app/actions";
import type { ActionState } from "@/lib/admin/staff";
import { businessKinds, sectors, workTypes } from "@/lib/opportunities";
import { Button } from "@/components/shadcn/button";
import { Field, inputClass } from "@/components/ui";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** A "Post …" button that opens the form; closes and clears it after a successful post. */
function PostForm({ label, action, children }: { label: string; action: Action; children: (err: (k: string) => string | undefined) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r?.ok) {
      toast.success(r.message);
      form.current?.reset();
      setOpen(false);
    } else if (r?.message) toast.error(r.message);
    return r;
  }, null);
  if (!open) return <Button onClick={() => setOpen(true)}><Plus /> {label}</Button>;
  const err = (k: string) => state?.errors?.[k];
  return (
    <form ref={form} action={run} className="flex flex-col gap-4 rounded-xl bg-card p-5 shadow-sm ring-1 ring-border">
      {children(err)}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Posting…" : "Post"}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

const in30 = () => new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

export function JobForm({ official }: { official: boolean }) {
  return (
    <PostForm label="Post a job" action={postJob}>
      {(err) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" name="title" error={err("title")}><input id="title" name="title" maxLength={120} className={inputClass} /></Field>
            <Field label="Organisation" name="organisation" error={err("organisation")}><input id="organisation" name="organisation" maxLength={120} className={inputClass} /></Field>
            <Field label="Location" name="location" error={err("location")} hint="A town, or Remote."><input id="location" name="location" maxLength={100} className={inputClass} /></Field>
            <Field label="Type" name="workType">
              <select id="workType" name="workType" className={inputClass}>{Object.entries(workTypes).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="Field (optional)" name="field" hint="e.g. Accounting, Nursing, ICT"><input id="field" name="field" maxLength={60} className={inputClass} /></Field>
            <Field label="Closing date" name="closesOn" error={err("closesOn")}><input id="closesOn" name="closesOn" type="date" defaultValue={in30()} className={inputClass} /></Field>
          </div>
          <Field label="About the job (optional)" name="description"><textarea id="description" name="description" rows={4} maxLength={3000} className={inputClass} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Apply at (link)" name="applyUrl" error={err("applyUrl")}><input id="applyUrl" name="applyUrl" placeholder="https://…" className={inputClass} /></Field>
            <Field label="Or apply by email" name="applyEmail" error={err("applyEmail")}><input id="applyEmail" name="applyEmail" type="email" className={inputClass} /></Field>
          </div>
          {official && <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="fromAssociation" className="size-4 accent-tea" /> Post on behalf of the association</label>}
          <p className="text-xs text-muted-foreground">Seen by members only. Never ask applicants for money.</p>
        </>
      )}
    </PostForm>
  );
}

export function BusinessForm({ counties }: { counties: string[] }) {
  return (
    <PostForm label="List your business" action={postBusiness}>
      {(err) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" name="name" error={err("name")}><input id="name" name="name" maxLength={100} className={inputClass} /></Field>
            <Field label="Sector" name="sector" error={err("sector")}>
              <select id="sector" name="sector" className={inputClass}>{sectors.map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
          </div>
          <Field label="What the business does" name="description" error={err("description")}><textarea id="description" name="description" rows={3} maxLength={800} className={inputClass} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="County" name="county">
              <select id="county" name="county" className={inputClass}><option value="">Choose</option>{counties.map((c) => <option key={c}>{c}</option>)}<option>Outside Kenya</option></select>
            </Field>
            <Field label="Town or area" name="area"><input id="area" name="area" maxLength={100} className={inputClass} /></Field>
            <Field label="Business phone" name="phone"><input id="phone" name="phone" maxLength={30} className={inputClass} /></Field>
            <Field label="Business email" name="email" error={err("email")}><input id="email" name="email" type="email" className={inputClass} /></Field>
            <Field label="Website (optional)" name="website" error={err("website")}><input id="website" name="website" placeholder="https://…" className={inputClass} /></Field>
            <Field label="Offer for members (optional)" name="memberOffer" hint="e.g. 10% off for alumni"><input id="memberOffer" name="memberOffer" maxLength={200} className={inputClass} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="whatsapp" className="size-4 accent-tea" /> The phone number is on WhatsApp</label>
          <label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" name="publicListing" className="mt-0.5 size-4 accent-tea" />
            <span>Also show it on the public &ldquo;Buy from alumni&rdquo; page<span className="block font-normal text-muted-foreground">Anyone visiting the website will see the business name, description and the contacts above.</span></span>
          </label>
        </>
      )}
    </PostForm>
  );
}

export function BusinessOpportunityForm() {
  return (
    <PostForm label="Post a business opportunity" action={postBusinessOpportunity}>
      {(err) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What kind" name="kind">
              <select id="kind" name="kind" className={inputClass}>{Object.entries(businessKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </Field>
            <Field label="Title" name="title" error={err("title")}><input id="title" name="title" maxLength={120} className={inputClass} /></Field>
          </div>
          <Field label="Details" name="details" error={err("details")}><textarea id="details" name="details" rows={4} maxLength={2000} className={inputClass} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sector" name="sector"><select id="sector" name="sector" className={inputClass}><option value="">Any</option>{sectors.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Where (optional)" name="location"><input id="location" name="location" maxLength={100} className={inputClass} /></Field>
            <Field label="How to respond" name="contact" error={err("contact")} hint="Phone, email or link"><input id="contact" name="contact" maxLength={200} className={inputClass} /></Field>
            <Field label="Closes on (optional)" name="closesOn"><input id="closesOn" name="closesOn" type="date" className={inputClass} /></Field>
          </div>
        </>
      )}
    </PostForm>
  );
}

export function VolunteerRoleForm() {
  return (
    <PostForm label="Post a way to help" action={postVolunteerRole}>
      {(err) => (
        <>
          <Field label="What help is needed" name="title" error={err("title")}><input id="title" name="title" maxLength={120} placeholder="e.g. Speakers for the school's career day" className={inputClass} /></Field>
          <Field label="Details" name="details"><textarea id="details" name="details" rows={3} maxLength={2000} className={inputClass} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Where" name="place"><input id="place" name="place" maxLength={100} className={inputClass} /></Field>
            <Field label="Date (optional)" name="happensOn"><input id="happensOn" name="happensOn" type="date" className={inputClass} /></Field>
            <Field label="Time (optional)" name="timeNote"><input id="timeNote" name="timeNote" maxLength={60} placeholder="e.g. 9 am to 1 pm" className={inputClass} /></Field>
            <Field label="People needed (optional)" name="peopleNeeded" error={err("peopleNeeded")}><input id="peopleNeeded" name="peopleNeeded" inputMode="numeric" maxLength={3} className={inputClass} /></Field>
          </div>
          <Field label="Skills wanted (optional)" name="skills" hint="Separated by commas. Members with these skills see it on their dashboard."><input id="skills" name="skills" maxLength={300} placeholder="Medicine, Teaching" className={inputClass} /></Field>
        </>
      )}
    </PostForm>
  );
}
