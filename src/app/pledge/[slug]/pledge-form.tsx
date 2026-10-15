"use client";

import { useActionState, useState } from "react";
import { submitPledge, type FormState } from "@/app/actions";
import { DonorFields } from "@/components/donor-fields";
import { Field, buttonClass, inputClass } from "@/components/ui";
import { formatKes, parseKes } from "@/lib/money";

const types = [
  { value: "monthly", label: "Monthly", unit: "month", periodsLabel: "For how many months?" },
  { value: "quarterly", label: "Every 3 months", unit: "quarter", periodsLabel: "For how many quarters?" },
  { value: "annual", label: "Yearly", unit: "year", periodsLabel: "For how many years?" },
  { value: "one_time", label: "One amount", unit: "", periodsLabel: "" },
  { value: "in_kind", label: "In kind", unit: "", periodsLabel: "" },
] as const;

const periodChoices: Record<string, number[]> = {
  monthly: [12, 24, 36],
  quarterly: [4, 8, 12],
  annual: [1, 2, 3],
};

export function PledgeForm({
  causeSlug,
  initial,
  founding,
}: {
  causeSlug: string;
  initial: { type: string; amount: string; periods: string };
  founding: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitPledge, null);
  const errors = state?.errors ?? {};
  const values = state?.values ?? {};

  const [type, setType] = useState(values.pledgeType ?? initial.type);
  const [amount, setAmount] = useState(values.amountPerPeriod ?? initial.amount);
  const [periods, setPeriods] = useState(values.numberOfPeriods ?? initial.periods);
  const meta = types.find((t) => t.value === type) ?? types[0];
  const perPeriod = parseKes(amount);
  const count = type === "one_time" ? 1 : Number(periods);
  const total = perPeriod && count > 0 ? perPeriod * count : null;

  return (
    <form action={action} className="flex flex-col gap-10" noValidate>
      <input type="hidden" name="causeSlug" value={causeSlug} />
      {errors.form && <p className="rounded-md bg-alert/10 p-3 font-semibold text-alert">{errors.form}</p>}

      <fieldset className="flex flex-col gap-6">
        <legend className="font-display text-2xl font-bold">Your pledge</legend>
        <div role="radiogroup" aria-label="How you will give" className="flex flex-wrap gap-2">
          {types.map((t) => (
            <label
              key={t.value}
              className={`cursor-pointer rounded-md border-2 px-4 py-2 font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold ${
                type === t.value ? "border-tea bg-tea-tint" : "border-line bg-surface"
              }`}
            >
              <input
                type="radio"
                name="pledgeType"
                value={t.value}
                checked={type === t.value}
                onChange={() => setType(t.value)}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>

        {type === "in_kind" ? (
          <Field
            label="What will you give?"
            name="inKindDescription"
            error={errors.inKindDescription}
            hint="For example: 50 bags of cement, professional time as a quantity surveyor, or library books."
          >
            <textarea
              id="inKindDescription"
              name="inKindDescription"
              rows={3}
              defaultValue={values.inKindDescription ?? ""}
              aria-invalid={Boolean(errors.inKindDescription)}
              className={inputClass}
            />
          </Field>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={type === "one_time" ? "Amount in shillings" : `Amount each ${meta.unit}`}
              name="amountPerPeriod"
              error={errors.amountPerPeriod}
            >
              <input
                id="amountPerPeriod"
                name="amountPerPeriod"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={Boolean(errors.amountPerPeriod)}
                className={`${inputClass} text-lg`}
              />
            </Field>
            {type !== "one_time" && (
              <Field label={meta.periodsLabel} name="numberOfPeriods" error={errors.numberOfPeriods}>
                <select
                  id="numberOfPeriods"
                  name="numberOfPeriods"
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value)}
                  className={`${inputClass} text-lg`}
                >
                  <option value="">Choose</option>
                  {(periodChoices[type] ?? []).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? meta.unit : `${meta.unit}s`}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        )}

        {total && type !== "in_kind" && (
          <p className="rounded-lg bg-surface p-4 text-lg">
            Your pledge: <strong className="font-display">{formatKes(total)}</strong>
            {type !== "one_time" && (
              <span className="text-ink-soft">
                {" "}
                ({formatKes(perPeriod!)} × {count})
              </span>
            )}
          </p>
        )}
        {founding && (
          <p className="text-[0.95rem] text-ink-soft">
            Pledges made before the official launch are recorded as founding pledges.
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <legend className="font-display text-2xl font-bold">Your details</legend>
        <DonorFields errors={errors} values={values} />
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <p className="text-[0.95rem] text-ink-soft">
          You will get a pledge reference. Use it as the account number when you pay, so every payment is matched to
          your pledge. Reminders come by email; nothing is taken automatically.
        </p>
        <div>
          <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
            {pending ? "Recording your pledge…" : "Record my pledge"}
          </button>
        </div>
      </div>
    </form>
  );
}
