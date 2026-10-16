"use client";

import { useActionState } from "react";
import { signInWithPassword, type LoginState } from "./actions";
import { Field, buttonClass, inputClass } from "@/components/ui";

/** Password sign-in, kept only for officials' accounts set up by an administrator. */
export function PasswordForm({ next }: { next: string }) {
  const [state, action, signingIn] = useActionState<LoginState, FormData>(signInWithPassword, null);
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email" name="pw-email">
        <input id="pw-email" name="email" type="email" autoComplete="username" defaultValue={state?.email} className={inputClass} />
      </Field>
      <Field label="Password" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} />
      </Field>
      <button type="submit" disabled={signingIn} className={`${buttonClass("primary")} self-start`}>
        {signingIn ? "Logging in…" : "Log in"}
      </button>
      {state?.error && (
        <p role="alert" className="font-semibold text-alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
