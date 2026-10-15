"use client";

import { useActionState, useState } from "react";
import { submitDonation, type FormState } from "@/app/actions";
import { DonorFields } from "@/components/donor-fields";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { formatKes, parseKes } from "@/lib/money";
import type { RecurringPeriod } from "@/lib/types";

const periodLabel: Record<RecurringPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Every 3 months",
  annually: "Yearly",
};

const steps = ["Amount", "Your details", "Payment"] as const;

export function GiveForm({
  causeSlug,
  presets,
  periods,
  accountName,
}: {
  causeSlug: string;
  presets: number[];
  periods: RecurringPeriod[];
  accountName: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitDonation, null);
  const errors = state?.errors ?? {};
  const values = state?.values ?? {};
  const firstErrorStep = errors.amount || errors.frequency ? 0 : Object.keys(errors).length ? 1 : null;

  const [step, setStep] = useState(0);
  const [frequency, setFrequency] = useState(values.frequency ?? "once");
  const [amount, setAmount] = useState(values.amount ?? String(presets[1] ?? presets[0] ?? ""));
  const [amountError, setAmountError] = useState<string | null>(null);
  const current = firstErrorStep !== null && state && step > firstErrorStep ? firstErrorStep : step;
  const parsed = parseKes(amount);

  function next() {
    if (current === 0) {
      if (parsed === null || parsed < 50) {
        setAmountError("Enter an amount of at least KES 50");
        return;
      }
      setAmountError(null);
    }
    setStep(current + 1);
  }

  return (
    <form action={action} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="causeSlug" value={causeSlug} />

      <ol className="flex gap-2 text-sm" aria-label="Steps">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={i === current ? "step" : undefined}
            className={`flex-1 border-t-4 pt-2 ${i <= current ? "border-tea font-semibold text-ink" : "border-line text-ink-soft"}`}
          >
            {s}
          </li>
        ))}
      </ol>

      {errors.form && <p className="rounded-md bg-alert/10 p-3 font-semibold text-alert">{errors.form}</p>}

      <fieldset hidden={current !== 0} className="flex flex-col gap-6">
        <legend className="sr-only">Amount</legend>
        <div role="radiogroup" aria-label="How often" className="flex flex-wrap gap-2">
          {(["once", ...periods] as const).map((f) => (
            <label
              key={f}
              className={`cursor-pointer rounded-md border-2 px-4 py-2 font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold ${
                frequency === f ? "border-tea bg-tea-tint" : "border-line bg-surface"
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={f}
                checked={frequency === f}
                onChange={() => setFrequency(f)}
                className="sr-only"
              />
              {f === "once" ? "Give once" : periodLabel[f]}
            </label>
          ))}
        </div>
        {frequency !== "once" && (
          <p className="text-[0.95rem] text-ink-soft">
            We email you a reminder with a payment link each time. Nothing is taken automatically, and you can stop at
            any time.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAmount(String(p));
                setAmountError(null);
              }}
              aria-pressed={parsed === p}
              className={`rounded-md border-2 px-3 py-3 font-semibold ${
                parsed === p ? "border-tea bg-tea-tint" : "border-line bg-surface hover:border-tea"
              }`}
            >
              {formatKes(p)}
            </button>
          ))}
        </div>
        <Field label="Amount in Kenyan shillings" name="amount" error={amountError ?? errors.amount}>
          <input
            id="amount"
            name="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={Boolean(amountError ?? errors.amount)}
            className={`${inputClass} max-w-xs text-lg`}
          />
        </Field>
        <Field
          label="Dedication (optional)"
          name="dedication"
          hint="For example: in memory of a teacher, or in honour of your class."
        >
          <input id="dedication" name="dedication" defaultValue={values.dedication ?? ""} className={inputClass} />
        </Field>
        <div>
          <button type="button" onClick={next} className={buttonClass("primary", "lg")}>
            Continue
          </button>
        </div>
      </fieldset>

      <fieldset hidden={current !== 1} className="flex flex-col gap-6">
        <legend className="sr-only">Your details</legend>
        <DonorFields errors={errors} values={values} />
        <div className="flex gap-3">
          <button type="button" onClick={() => setStep(0)} className={buttonClass("secondary")}>
            Back
          </button>
          <button type="button" onClick={() => setStep(2)} className={buttonClass("primary", "lg")}>
            Continue
          </button>
        </div>
      </fieldset>

      <fieldset hidden={current !== 2} className="flex flex-col gap-6">
        <legend className="sr-only">Payment</legend>
        <div className="rounded-lg border border-line bg-surface p-6">
          <p className="text-ink-soft">You are giving</p>
          <p className="font-display text-3xl font-bold">
            {parsed ? formatKes(parsed) : "—"}
            {frequency !== "once" && (
              <span className="ml-2 text-lg font-normal text-ink-soft">
                {periodLabel[frequency as RecurringPeriod].toLowerCase()}
              </span>
            )}
          </p>
          <p className="mt-4 text-[0.95rem]">Paid into: {accountName}</p>
        </div>
        <div className="rounded-lg bg-gold-tint p-5 text-[0.95rem]">
          <p className="font-semibold">M-Pesa payments open in February 2027.</p>
          <p className="mt-1">
            For now, we record your gift and give you a reference. You will receive the official Paybill details to
            pay with that reference.
          </p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setStep(1)} className={buttonClass("secondary")}>
            Back
          </button>
          <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
            {pending ? "Recording your gift…" : "Record my gift"}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
