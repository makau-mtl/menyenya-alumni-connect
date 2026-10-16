"use client";

import { startTransition, useActionState } from "react";
import { saveChoices, saveWelfareContact, saveWork } from "@/app/app/actions";
import type { ActionState } from "@/lib/admin/staff";
import { phoneCountries } from "@/lib/phone";
import { occupationOptions } from "@/lib/registration";
import { Field, buttonClass, inputClass } from "@/components/ui";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Submits by hand so typed answers stay in the form if something needs fixing. */
function useForm(action: Action) {
  const [state, dispatch, saving] = useActionState(action, null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, saving, onSubmit, err: (k: string) => state?.errors?.[k] };
}

function SaveRow({ saving, state }: { saving: boolean; state: ActionState }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={saving} className={buttonClass("primary")}>
        {saving ? "Saving…" : "Save"}
      </button>
      {state?.message && (
        <p role="status" className={`font-semibold ${state.ok ? "text-tea" : "text-alert"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}

export type WorkValues = {
  headline: string;
  occupation_status: string;
  profession: string;
  employer_or_business: string;
  products_services: string;
  skills: string[];
  linkedin_url: string;
  profile_link: string;
  social_links: { label: string; url: string }[];
  willing_to_volunteer: boolean;
  mentoring_offer: string;
  canMentor: boolean;
  canRequestMentor: boolean;
};

export function WorkForm({ v }: { v: WorkValues }) {
  const { state, saving, onSubmit, err } = useForm(saveWork);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Field label="One-line summary" name="headline" hint="For example: Civil engineer building roads in Western Kenya." error={err("headline")}>
        <input id="headline" name="headline" defaultValue={v.headline} maxLength={160} className={inputClass} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="What you do now" name="occupation_status">
          <select id="occupation_status" name="occupation_status" defaultValue={v.occupation_status} className={inputClass}>
            <option value="">Choose</option>
            {occupationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Profession or field" name="profession" error={err("profession")}>
          <input id="profession" name="profession" defaultValue={v.profession} maxLength={80} className={inputClass} />
        </Field>
      </div>
      <Field label="Employer or business name" name="employer_or_business" error={err("employer_or_business")}>
        <input id="employer_or_business" name="employer_or_business" defaultValue={v.employer_or_business} maxLength={120} className={inputClass} />
      </Field>
      <Field label="Products or services you offer" name="products_services" hint="If you run a business, so fellow alumni can find you." error={err("products_services")}>
        <textarea id="products_services" name="products_services" defaultValue={v.products_services} rows={2} maxLength={300} className={inputClass} />
      </Field>
      <Field label="Skills" name="skills" hint="Separate with commas, for example: accounting, project management, Python." error={err("skills")}>
        <input id="skills" name="skills" defaultValue={v.skills.join(", ")} className={inputClass} />
      </Field>
      <Field label="LinkedIn profile" name="linkedin_url" hint="On LinkedIn, open your profile and copy the address." error={err("linkedin_url")}>
        <input id="linkedin_url" name="linkedin_url" defaultValue={v.linkedin_url} placeholder="https://www.linkedin.com/in/…" className={inputClass} />
      </Field>
      <Field label="Website or portfolio" name="profile_link" error={err("profile_link")}>
        <input id="profile_link" name="profile_link" defaultValue={v.profile_link} placeholder="https://…" className={inputClass} />
      </Field>
      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Other links (optional)</legend>
        <p className="text-sm text-ink-soft">For example X, Instagram, Facebook or a YouTube channel.</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <input aria-label={`Link ${i + 1} name`} name={`social_label_${i}`} defaultValue={v.social_links[i]?.label} placeholder="Name, e.g. X" maxLength={30} className={inputClass} />
            <input aria-label={`Link ${i + 1} address`} name={`social_url_${i}`} defaultValue={v.social_links[i]?.url} placeholder="https://…" className={inputClass} />
          </div>
        ))}
        {err("social_links") && <p className="text-sm font-semibold text-alert">{err("social_links")}</p>}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Mentoring</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="mentoring_offer" value="none" defaultChecked={v.mentoring_offer === "none"} className="size-4 accent-tea" /> Not now
        </label>
        {v.canMentor && (
          <label className="flex items-center gap-2">
            <input type="radio" name="mentoring_offer" value="can_mentor" defaultChecked={v.mentoring_offer === "can_mentor"} className="size-4 accent-tea" /> I can mentor others
          </label>
        )}
        {v.canRequestMentor && (
          <label className="flex items-center gap-2">
            <input type="radio" name="mentoring_offer" value="wants_mentor" defaultChecked={v.mentoring_offer === "wants_mentor"} className="size-4 accent-tea" /> I would like a mentor
          </label>
        )}
      </fieldset>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="willing_to_volunteer" defaultChecked={v.willing_to_volunteer} className="mt-1.5 size-4 accent-tea" />
        <span>I&rsquo;m willing to volunteer my time or skills for the association&rsquo;s projects</span>
      </label>
      <SaveRow saving={saving} state={state} />
    </form>
  );
}

export function WelfareForm({ kin }: { kin: { name: string; relationship: string; phone: string } | null }) {
  const { state, saving, onSubmit, err } = useForm(saveWelfareContact);
  const isKenyan = !kin || kin.phone.startsWith("+254");
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Their full name" name="kin-name" error={err("name")}>
          <input id="kin-name" name="name" defaultValue={kin?.name} maxLength={120} className={inputClass} />
        </Field>
        <Field label="Relationship to you" name="kin-relationship" hint="For example spouse, sister, parent." error={err("relationship")}>
          <input id="kin-relationship" name="relationship" defaultValue={kin?.relationship} maxLength={60} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="kin-phone" className="font-semibold">Their phone number</label>
        <div className="flex gap-2">
          <select aria-label="Country" name="phone_country" defaultValue={isKenyan ? "KE" : "ZZ"} className={`${inputClass.replace("w-full", "")} w-32 shrink-0 sm:w-56`}>
            {phoneCountries.map((c) => <option key={c.iso} value={c.iso}>{c.dial ? `+${c.dial} ${c.name}` : c.name}</option>)}
          </select>
          <input id="kin-phone" name="phone" type="tel" defaultValue={kin ? (isKenyan ? `0${kin.phone.slice(4)}` : kin.phone) : ""} className={`${inputClass} min-w-0`} />
        </div>
        {err("phone") && <p className="text-sm font-semibold text-alert">{err("phone")}</p>}
      </div>
      <SaveRow saving={saving} state={state} />
    </form>
  );
}

export function ChoicesForm({ current }: { current: Record<string, boolean> }) {
  const { state, saving, onSubmit } = useForm(saveChoices);
  const items = [
    { k: "directory_listing", t: "List me in the member directory", d: "Signed-in members see your name, class, region, photo and work summary. Never your phone or email." },
    { k: "public_profile", t: "Show a short public profile", d: "Anyone can see your name, class, one-line summary, photo and links." },
    { k: "email_updates", t: "Email me news and updates", d: "About once a month." },
    { k: "whatsapp_updates", t: "Send me updates on WhatsApp", d: "Only important notices." },
  ];
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {items.map((c) => (
        <label key={c.k} className="flex items-start gap-3">
          <input type="checkbox" name={c.k} defaultChecked={current[c.k]} className="mt-1.5 size-4 accent-tea" />
          <span>
            <span className="font-semibold">{c.t}</span>
            <span className="block text-sm text-ink-soft">{c.d}</span>
          </span>
        </label>
      ))}
      <SaveRow saving={saving} state={state} />
    </form>
  );
}
