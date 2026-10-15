"use client";

import { useState } from "react";
import { Checkbox, Field, buttonClass, inputClass } from "@/components/ui";

const counties = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado",
  "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", "Nakuru", "Nandi",
  "Narok", "Nyamira", "Nyandarua", "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot", "Outside Kenya",
];

// Admin-maintained in the full system.
const clusters = ["Nairobi", "Kisii", "Nyamira", "Nakuru", "Eldoret", "Kisumu", "Mombasa", "Diaspora"];

const friendRelations = ["Parent", "Former parent", "Teacher", "Former teacher", "Local business", "Neighbour", "SDA faithful", "Other"];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1975 + 1 }, (_, i) => currentYear - i);

function Info({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="flex size-5 items-center justify-center rounded-full border border-ink-soft/60 text-xs font-bold text-ink-soft"
      >
        i
      </button>
      <span
        role="tooltip"
        className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-md bg-ink p-3 text-sm font-normal text-white opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function RegisterForm({ levels }: { levels: { name: string; text: string }[] }) {
  const [category, setCategory] = useState<"alumnus" | "friend">("alumnus");
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="mt-8 flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-display text-xl font-bold">About you</legend>
        <Field label="Full name *" name="fullName">
          <input id="fullName" name="fullName" autoComplete="name" className={inputClass} required />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone (WhatsApp) *" name="phone">
            <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} required />
          </Field>
          <Field label="Email *" name="email">
            <input id="email" name="email" type="email" autoComplete="email" className={inputClass} required />
          </Field>
        </div>

        <div role="radiogroup" aria-label="I am" className="flex flex-col gap-2">
          <span className="font-semibold">I am *</span>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["alumnus", "A former student"],
                ["friend", "A friend of the school"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-md border-2 px-4 py-2 font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold ${
                  category === value ? "border-tea bg-tea-tint" : "border-line"
                }`}
              >
                <input type="radio" name="category" value={value} checked={category === value} onChange={() => setCategory(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {category === "alumnus" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Year you left Menyenya *" name="yearLeft">
              <select id="yearLeft" name="yearLeft" className={inputClass} required defaultValue="">
                <option value="" disabled>
                  Choose a year
                </option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </Field>
            <Field label="Class or stream *" name="cohort" hint="As your classmates would know it, for example Form 4 East">
              <input id="cohort" name="cohort" className={inputClass} required />
            </Field>
          </div>
        ) : (
          <Field label="Your connection to the school *" name="relationship">
            <select id="relationship" name="relationship" className={inputClass} required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {friendRelations.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 font-display text-xl font-bold">Where you are</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Home county *" name="county">
            <select id="county" name="county" className={inputClass} required defaultValue="">
              <option value="" disabled>
                Choose a county
              </option>
              {counties.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cluster" className="font-semibold">
              Regional cluster *
              <Info text="Choose where you live now. Clusters organise meet-ups and networking near you." />
            </label>
            <select id="cluster" name="cluster" className={inputClass} required defaultValue="">
              <option value="" disabled>
                Choose a cluster
              </option>
              {clusters.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-display text-xl font-bold">
          Membership level *
          <Info text="Levels are based on where you are in life, not age. Each comes with different ways to take part." />
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {levels.map((l, i) => (
            <label key={l.name} className="flex cursor-pointer gap-3 rounded-md border-2 border-line p-4 has-[:checked]:border-tea has-[:checked]:bg-tea-tint">
              <input type="radio" name="level" value={l.name} defaultChecked={i === 1} className="mt-1 accent-tea" />
              <span>
                <span className="block font-semibold">{l.name}</span>
                <span className="block text-sm text-ink-soft">{l.text}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-2 font-display text-xl font-bold">Next of kin</legend>
        <p className="-mt-2 text-sm text-ink-soft">
          Kept private and only used if we need to reach your family. Never shown in the directory.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Name *" name="nokName">
            <input id="nokName" name="nokName" className={inputClass} required />
          </Field>
          <Field label="Relationship *" name="nokRelation">
            <input id="nokRelation" name="nokRelation" className={inputClass} required />
          </Field>
          <Field label="Phone *" name="nokPhone">
            <input id="nokPhone" name="nokPhone" type="tel" className={inputClass} required />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-display text-xl font-bold">Your consent</legend>
        <Checkbox name="consentData" label="I agree that the association keeps my details for membership purposes. *" />
        <Checkbox name="consentUpdates" label="Send me news and updates by email and WhatsApp" defaultChecked />
        <Checkbox name="consentDirectory" label="List me in the members' directory so classmates can find me" defaultChecked />
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-2 font-display text-xl font-bold">Your log-in</legend>
        <Field label="Create a password *" name="password" hint="At least 8 characters">
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} className={inputClass} />
        </Field>
        <p className="text-sm text-ink-soft">Or skip the password and register with your Google account.</p>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
        <button type="submit" className={buttonClass("primary", "lg")}>
          Register
        </button>
        <button type="button" onClick={() => setSubmitted(true)} className={buttonClass("secondary", "lg")}>
          Register with Google
        </button>
      </div>
      {submitted && (
        <p role="status" className="rounded-md bg-gold-tint p-4">
          Registration opens to all in January 2027, after members are consulted. This preview did not save your
          details.
        </p>
      )}
    </form>
  );
}
