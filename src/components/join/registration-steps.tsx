"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { finishRegistration } from "@/app/join/actions";
import type { PickLists } from "@/lib/members/pick-lists";
import { phoneCountries, toInternational } from "@/lib/phone";
import { friendRelationships, occupationOptions, suggestLevel, type Occupation } from "@/lib/registration";
import { formatKes } from "@/lib/money";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { InfoTip } from "./info-tip";

type Answers = {
  fullName: string;
  phoneCountry: string;
  phone: string;
  whatsapp: boolean;
  category: "alumnus" | "friend" | "";
  yearLeft: string;
  admissionYear: string;
  classOrStream: string;
  relationship: string;
  relationshipOther: string;
  county: string;
  region: string;
  occupation: Occupation | "";
  level: string;
  consents: { membership_data: boolean; email_updates: boolean; whatsapp_updates: boolean; directory_listing: boolean; public_profile: boolean };
};

type StepKey = "you" | "link" | "place" | "level" | "finish";
const stepTitles: Record<StepKey, string> = {
  you: "About you",
  link: "Your Menyenya link",
  place: "Where you live",
  level: "Membership level",
  finish: "Consents and finish",
};

type Props = {
  lists: PickLists;
  defaultName: string;
  email: string;
  storageKey: string;
  invite: { token: string; label: string; yearLeft: number | null } | null;
  adminTesting: boolean;
};

// Answers are kept in this browser tab only (sessionStorage), so a refresh keeps them and closing
// the tab clears them. Nothing is sent to the association until the last step is submitted.
function load(key: string): Partial<Answers> | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<Answers>) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage full: the steps still work, they just won't survive a refresh */
  }
}

const noSubscribe = () => () => {};

export function RegistrationSteps(props: Props) {
  // Render only in the browser, so saved answers can be restored without a flash of empty fields.
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!inBrowser) return <p className="text-ink-soft">Loading…</p>;
  return <Steps {...props} />;
}

function Steps({ lists, defaultName, email, storageKey, invite, adminTesting }: Props) {
  const [answers, setAnswers] = useState<Answers>(() => {
    const saved = load(storageKey);
    const base: Answers = {
      fullName: defaultName,
      phoneCountry: "KE",
      phone: "",
      whatsapp: true,
      category: invite?.yearLeft ? "alumnus" : "",
      yearLeft: invite?.yearLeft ? String(invite.yearLeft) : "",
      admissionYear: "",
      classOrStream: "",
      relationship: "",
      relationshipOther: "",
      county: "",
      region: "",
      occupation: "",
      level: "",
      consents: { membership_data: false, email_updates: false, whatsapp_updates: false, directory_listing: false, public_profile: false },
    };
    return saved ? { ...base, ...saved, consents: { ...base.consents, ...saved.consents } } : base;
  });
  const [step, setStep] = useState(() => Number(load(`${storageKey}:step`) ?? 0));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const steps: StepKey[] = answers.category === "friend" ? ["you", "link", "place", "finish"] : ["you", "link", "place", "level", "finish"];
  const current = steps[Math.min(step, steps.length - 1)];

  useEffect(() => save(storageKey, answers), [storageKey, answers]);
  useEffect(() => {
    save(`${storageKey}:step`, step);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [storageKey, step]);

  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));
  const yearLeft = answers.yearLeft ? Number(answers.yearLeft) : null;
  const suggested = suggestLevel(yearLeft, answers.occupation || null);
  const phoneE164 = toInternational(answers.phoneCountry, answers.phone);
  const chosenLevel = lists.levels.find((l) => l.name === answers.level);
  const fee = !lists.feesOn
    ? null
    : answers.category === "friend"
      ? lists.friendFee.amount > 0 && lists.friendFee.type !== "none" ? { amount: lists.friendFee.amount, type: lists.friendFee.type } : null
      : chosenLevel && chosenLevel.feeAmount > 0 && chosenLevel.feeType !== "none" ? { amount: chosenLevel.feeAmount, type: chosenLevel.feeType } : null;

  function check(key: StepKey): Record<string, string> {
    const e: Record<string, string> = {};
    const a = answers;
    if (key === "you") {
      if (a.fullName.trim().length < 3 || !/\s/.test(a.fullName.trim())) e.fullName = "Enter your first and last name.";
      if (!phoneE164) e.phone = a.phoneCountry === "KE" ? "Enter a Kenyan number, for example 0712 345 678." : "Enter the number with its country code, for example +44 7700 900123.";
      if (!a.category) e.category = "Choose one.";
    } else if (key === "link") {
      if (a.category === "alumnus") {
        if (!a.yearLeft) e.yearLeft = "Choose the year you left.";
        if (a.admissionYear && yearLeft && (Number(a.admissionYear) > yearLeft || Number(a.admissionYear) < yearLeft - 8)) {
          e.admissionYear = "Check this year: it should be before the year you left.";
        }
      } else {
        if (!a.relationship) e.relationship = "Choose one.";
        if (a.relationship === "Other" && !a.relationshipOther.trim()) e.relationshipOther = "Tell us briefly.";
      }
    } else if (key === "place") {
      if (!a.county) e.county = "Choose your county, or Outside Kenya.";
      if (!a.region) e.region = "Choose your region.";
    } else if (key === "level") {
      if (!a.occupation) e.occupation = "Choose one.";
      if (!a.level) e.level = "Choose a level.";
    } else if (key === "finish") {
      if (!a.consents.membership_data) e.membership_data = "Please agree so we can keep your membership details.";
    }
    return e;
  }

  function next() {
    const e = check(current);
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`field-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    if (current === "finish") return submit();
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    setServerError(null);
    const a = answers;
    startSubmit(async () => {
      const result = await finishRegistration({
        full_name: a.fullName.trim(),
        phone: phoneE164 ?? "",
        phone_country: a.phoneCountry,
        phone_whatsapp: a.whatsapp,
        category: a.category as "alumnus" | "friend",
        year_left: a.category === "alumnus" ? yearLeft : null,
        admission_year: a.category === "alumnus" && a.admissionYear ? Number(a.admissionYear) : null,
        class_or_stream: a.category === "alumnus" ? a.classOrStream : "",
        relationship: a.category === "friend" ? (a.relationship === "Other" ? a.relationshipOther.trim() : a.relationship) : "",
        county: a.county,
        region: a.region,
        occupation_status: a.category === "alumnus" ? (a.occupation || null) : null,
        level: a.category === "alumnus" ? a.level || null : null,
        invite: invite?.token ?? null,
        consents: { ...a.consents, membership_data: true },
      });
      // Success redirects to the welcome page; we only get here if something needs fixing.
      if (result?.error) setServerError(result.error);
      else {
        try {
          sessionStorage.removeItem(storageKey);
          sessionStorage.removeItem(`${storageKey}:step`);
        } catch {}
      }
    });
  }

  const err = (k: string) => errors[k];
  const radioCard = (checked: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 ${checked ? "border-tea bg-tea-tint" : "border-line bg-surface hover:border-ink-soft"}`;

  return (
    <div className="max-w-2xl">
      {adminTesting && (
        <p className="mb-6 rounded-md border border-gold/60 bg-gold-tint px-4 py-2 text-sm">
          Registration is closed to the public. As an administrator you can complete it to test.
        </p>
      )}
      {invite && (
        <p className="mb-6 rounded-md bg-tea-tint px-4 py-2 text-sm">
          You were invited through the <strong>{invite.label}</strong> link.
        </p>
      )}

      {/* Progress */}
      <div aria-hidden className="flex gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-tea" : "bg-line"}`} />
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-ink-soft">
        Step {step + 1} of {steps.length}
      </p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl font-bold outline-none">
        {stepTitles[current]}
      </h2>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        className="mt-8 flex flex-col gap-7"
      >
        {current === "you" && (
          <>
            <Field label="Full name" name="field-fullName" hint="As your classmates would know you." error={err("fullName")}>
              <input id="field-fullName" value={answers.fullName} onChange={(e) => set("fullName", e.target.value)}
                autoComplete="name" className={inputClass} aria-invalid={!!err("fullName")} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="field-phone" className="font-semibold">Phone number</label>
              <p className="text-sm text-ink-soft">For WhatsApp groups and payment confirmations. Never shown publicly.</p>
              <div className="flex gap-2">
                <select aria-label="Country" value={answers.phoneCountry} onChange={(e) => set("phoneCountry", e.target.value)}
                  className={`${inputClass.replace("w-full", "")} w-32 shrink-0 sm:w-56`}>
                  {phoneCountries.map((c) => (
                    <option key={c.iso} value={c.iso}>{c.dial ? `+${c.dial} ${c.name}` : c.name}</option>
                  ))}
                </select>
                <input id="field-phone" type="tel" inputMode="tel" autoComplete="tel" value={answers.phone}
                  onChange={(e) => set("phone", e.target.value)} placeholder={answers.phoneCountry === "KE" ? "0712 345 678" : "Number"}
                  className={`${inputClass} min-w-0`} aria-invalid={!!err("phone")} />
              </div>
              {err("phone") && <p className="text-sm font-semibold text-alert">{err("phone")}</p>}
              <label className="mt-1 flex items-center gap-2">
                <input type="checkbox" checked={answers.whatsapp} onChange={(e) => set("whatsapp", e.target.checked)} className="size-4 accent-tea" />
                This number is on WhatsApp
              </label>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 font-semibold">I am</legend>
              {[
                { v: "alumnus", t: "A former student of Menyenya", d: "Alumnus or alumna" },
                { v: "friend", t: "A friend of the alumni", d: "Parent, teacher, neighbour or supporter of the school" },
              ].map((o) => (
                <label key={o.v} className={radioCard(answers.category === o.v)}>
                  <input id={o.v === "alumnus" ? "field-category" : undefined} type="radio" name="category" checked={answers.category === o.v}
                    onChange={() => set("category", o.v as Answers["category"])} className="mt-1 size-4 accent-tea" />
                  <span><span className="block font-semibold">{o.t}</span><span className="text-sm text-ink-soft">{o.d}</span></span>
                </label>
              ))}
              {err("category") && <p className="text-sm font-semibold text-alert">{err("category")}</p>}
            </fieldset>
            <p className="text-sm text-ink-soft">Signed in as {email}.</p>
          </>
        )}

        {current === "link" && answers.category === "alumnus" && (
          <>
            <Field label="Year you left Menyenya" name="field-yearLeft" hint="This puts you in your class group." error={err("yearLeft")}>
              <select id="field-yearLeft" value={answers.yearLeft} onChange={(e) => set("yearLeft", e.target.value)}
                className={`${inputClass} sm:max-w-xs`} aria-invalid={!!err("yearLeft")}>
                <option value="">Choose a year</option>
                {lists.years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Year you joined (optional)" name="field-admissionYear" error={err("admissionYear")}>
              <select id="field-admissionYear" value={answers.admissionYear} onChange={(e) => set("admissionYear", e.target.value)}
                className={`${inputClass} sm:max-w-xs`}>
                <option value="">Skip</option>
                {lists.years.filter((y) => !yearLeft || (y <= yearLeft && y >= yearLeft - 8)).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Class or stream (optional)" name="field-classOrStream" hint="For example 4 East.">
              <input id="field-classOrStream" value={answers.classOrStream} maxLength={60} onChange={(e) => set("classOrStream", e.target.value)}
                className={`${inputClass} sm:max-w-xs`} />
            </Field>
          </>
        )}

        {current === "link" && answers.category === "friend" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-semibold">How are you connected to the school?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {friendRelationships.map((r, i) => (
                <label key={r} className={radioCard(answers.relationship === r)}>
                  <input id={i === 0 ? "field-relationship" : undefined} type="radio" name="relationship" checked={answers.relationship === r}
                    onChange={() => set("relationship", r)} className="mt-1 size-4 accent-tea" />
                  <span className="font-semibold">{r}</span>
                </label>
              ))}
            </div>
            {err("relationship") && <p className="text-sm font-semibold text-alert">{err("relationship")}</p>}
            {answers.relationship === "Other" && (
              <Field label="Tell us briefly" name="field-relationshipOther" error={err("relationshipOther")}>
                <input id="field-relationshipOther" value={answers.relationshipOther} maxLength={80}
                  onChange={(e) => set("relationshipOther", e.target.value)} className={inputClass} />
              </Field>
            )}
          </fieldset>
        )}

        {current === "place" && (
          <>
            <Field label="Home county" name="field-county" hint="Where you live now. Choose Outside Kenya if you live abroad." error={err("county")}>
              <select id="field-county" value={answers.county}
                onChange={(e) => {
                  const county = e.target.value;
                  const region = lists.counties.find((c) => c.name === county)?.region ?? "";
                  setAnswers((a) => ({ ...a, county, region: region || a.region }));
                }}
                className={`${inputClass} sm:max-w-sm`} aria-invalid={!!err("county")}>
                <option value="">Choose a county</option>
                {[...lists.counties].sort((a, b) => (a.name === "Outside Kenya" ? 1 : b.name === "Outside Kenya" ? -1 : a.name.localeCompare(b.name)))
                  .map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="field-region" className="font-semibold">
                Region
                <InfoTip label="About regions">
                  Regions follow Kenya&rsquo;s former provinces, plus Diaspora for members abroad. They organise meet-ups and
                  networking near you. We fill it in from your county; change it if another region suits you better.
                </InfoTip>
              </label>
              <select id="field-region" value={answers.region} onChange={(e) => set("region", e.target.value)}
                className={`${inputClass} sm:max-w-sm`} aria-invalid={!!err("region")}>
                <option value="">Choose a region</option>
                {lists.regions.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
              {err("region") && <p className="text-sm font-semibold text-alert">{err("region")}</p>}
            </div>
          </>
        )}

        {current === "level" && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-semibold">What do you do now?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {occupationOptions.map((o, i) => (
                  <label key={o.value} className={radioCard(answers.occupation === o.value)}>
                    <input id={i === 0 ? "field-occupation" : undefined} type="radio" name="occupation" checked={answers.occupation === o.value}
                      onChange={() => {
                        const s = suggestLevel(yearLeft, o.value);
                        setAnswers((a) => ({ ...a, occupation: o.value, level: a.level || s || "" }));
                      }}
                      className="mt-1 size-4 accent-tea" />
                    <span className="font-semibold">{o.label}</span>
                  </label>
                ))}
              </div>
              {err("occupation") && <p className="text-sm font-semibold text-alert">{err("occupation")}</p>}
            </fieldset>

            {answers.occupation && (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 font-semibold">Your membership level</legend>
                <p className="text-sm text-ink-soft">
                  Levels follow where you are in life, not age. {suggested ? `We suggest ${suggested}; ` : ""}choose the one that fits.
                  You can change it later.
                </p>
                {lists.levels.map((l, i) => (
                  <label key={l.name} className={radioCard(answers.level === l.name)}>
                    <input id={i === 0 ? "field-level" : undefined} type="radio" name="level" checked={answers.level === l.name}
                      onChange={() => set("level", l.name)} className="mt-1 size-4 accent-tea" />
                    <span className="flex-1">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        {l.name}
                        {suggested === l.name && <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-ink">Suggested</span>}
                      </span>
                      <span className="block text-sm text-ink-soft">{l.description}</span>
                    </span>
                    <InfoTip label={`About ${l.name}`}>
                      <span className="block font-semibold">{l.name}</span>
                      <span className="mt-1 block">{l.description}</span>
                      {l.offers && <span className="mt-2 block">{l.offers}</span>}
                      <span className="mt-2 block">{l.canMentor ? "You can offer to mentor others." : l.canRequestMentor ? "You can ask for a mentor." : ""}</span>
                      <span className="mt-2 block text-ink-soft">
                        {lists.feesOn && l.feeAmount > 0 ? `Fee: ${formatKes(l.feeAmount)}${l.feeType === "annual" ? " a year" : " once"}.` : "No fee for now."}
                      </span>
                    </InfoTip>
                  </label>
                ))}
                {err("level") && <p className="text-sm font-semibold text-alert">{err("level")}</p>}
              </fieldset>
            )}
          </>
        )}

        {current === "finish" && (
          <>
            <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-line bg-surface p-5 text-[0.95rem] sm:grid-cols-[auto_1fr]">
              {[
                ["Name", answers.fullName, 0],
                ["Phone", phoneE164 ?? answers.phone, 0],
                answers.category === "alumnus"
                  ? ["Class", `Class of ${answers.yearLeft}${answers.classOrStream ? `, ${answers.classOrStream}` : ""}`, 1]
                  : ["Connection", answers.relationship === "Other" ? answers.relationshipOther : answers.relationship, 1],
                ["Lives in", `${answers.county} (${answers.region})`, 2],
                ...(answers.category === "alumnus" ? [["Level", answers.level, 3] as const] : []),
              ].map(([k, v, s]) => (
                <div key={String(k)} className="contents">
                  <dt className="font-semibold">{k}</dt>
                  <dd className="flex justify-between gap-3">
                    <span>{v}</span>
                    <button type="button" onClick={() => setStep(Number(s))} className="text-sm font-semibold text-tea underline underline-offset-4">
                      Change
                    </button>
                  </dd>
                </div>
              ))}
            </dl>

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-1 font-semibold">Your choices</legend>
              {[
                { k: "membership_data" as const, t: "Keep my membership details", d: <>Required. The association keeps your details to run your membership, as set out in the <Link href="/privacy" target="_blank" className="underline">privacy policy</Link>.</> },
                { k: "directory_listing" as const, t: "List me in the member directory", d: "Signed-in members can see your name, class, region, photo and work summary. Never your phone or email." },
                { k: "email_updates" as const, t: "Email me news and updates", d: "About once a month." },
                { k: "whatsapp_updates" as const, t: "Send me updates on WhatsApp", d: "Only important notices." },
                { k: "public_profile" as const, t: "Show a short public profile", d: "Anyone can see your name, class, one-line summary and links. You can switch it off anytime." },
              ].map((c) => (
                <label key={c.k} className="flex items-start gap-3">
                  <input id={c.k === "membership_data" ? "field-membership_data" : undefined} type="checkbox" checked={answers.consents[c.k]}
                    onChange={(e) => set("consents", { ...answers.consents, [c.k]: e.target.checked })} className="mt-1.5 size-4 accent-tea" />
                  <span>
                    <span className="font-semibold">{c.t}</span>
                    <span className="block text-sm text-ink-soft">{c.d}</span>
                  </span>
                </label>
              ))}
              {err("membership_data") && <p className="text-sm font-semibold text-alert">{err("membership_data")}</p>}
            </fieldset>

            {fee && (
              <p className="rounded-md bg-gold-tint p-4">
                A membership fee of <strong>{formatKes(fee.amount)}</strong>{fee.type === "annual" ? " a year" : ""} applies. You&rsquo;ll
                see how to pay on the next screen.
              </p>
            )}
          </>
        )}

        {serverError && (
          <p role="alert" className="rounded-md bg-alert/10 p-4 font-semibold text-alert">
            {serverError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          {step > 0 && (
            <button type="button" onClick={back} className={buttonClass("secondary", "lg")}>
              Back
            </button>
          )}
          <button type="submit" disabled={submitting} className={buttonClass("primary", "lg")}>
            {current === "finish" ? (submitting ? "Saving…" : "Finish registration") : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
