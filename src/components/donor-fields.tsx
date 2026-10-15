"use client";

import { useState } from "react";
import { Checkbox, Field, inputClass } from "./ui";

type Props = { errors: Record<string, string>; values: Record<string, string> };

export function DonorFields({ errors, values }: Props) {
  const [asOrg, setAsOrg] = useState(values.asOrganisation === "on");

  const text = (name: string, label: string, type = "text", autoComplete?: string, hint?: string) => (
    <Field label={label} name={name} error={errors[name]} hint={hint}>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={values[name] ?? ""}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={inputClass}
        required
      />
    </Field>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {text("firstName", "First name", "text", "given-name")}
        {text("lastName", "Last name", "text", "family-name")}
      </div>
      {text("email", "Email", "email", "email", "We send your confirmation and reference here.")}
      {text("phone", "Phone number", "tel", "tel", "For M-Pesa, once online payments open.")}

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="asOrganisation"
          checked={asOrg}
          onChange={(e) => setAsOrg(e.target.checked)}
          className="mt-1.5 size-4 accent-tea"
        />
        <span>Give on behalf of an organisation</span>
      </label>
      {asOrg && (
        <Field label="Organisation name" name="organisationName" error={errors.organisationName}>
          <input
            id="organisationName"
            name="organisationName"
            defaultValue={values.organisationName ?? ""}
            className={inputClass}
            required
          />
        </Field>
      )}

      <Checkbox
        name="anonymous"
        label="Keep my name off public lists"
        hint="Leaders still see your name so they can thank you and keep records."
        defaultChecked={values.anonymous === "on"}
      />
      <Checkbox
        name="impactUpdates"
        label="Send me updates on how my gift is used"
        defaultChecked={values.impactUpdates !== undefined ? values.impactUpdates === "on" : true}
      />
    </div>
  );
}
