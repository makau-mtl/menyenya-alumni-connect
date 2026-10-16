"use client";

import { useActionState } from "react";
import { sendSignInLink, signInWithGoogle, signInWithPassword, type LoginState } from "./actions";
import { Field, buttonClass, inputClass } from "@/components/ui";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, passwordAction, signingIn] = useActionState<LoginState, FormData>(signInWithPassword, null);
  const [linkState, linkAction, sendingLink] = useActionState<LoginState, FormData>(sendSignInLink, null);
  const error = state?.error ?? linkState?.error ?? initialError;
  const email = state?.email ?? linkState?.email ?? "";

  return (
    <div className="mt-8 flex flex-col gap-5">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-line bg-surface px-5 py-2.5 font-semibold hover:border-ink"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5">
            <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z" />
            <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14z" />
            <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4z" />
          </svg>
          Continue with Google
        </button>
      </form>
      <div className="flex items-center gap-3 text-sm text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        or with your email
        <span className="h-px flex-1 bg-line" />
      </div>
      <form action={passwordAction} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email">
          <input id="email" name="email" type="email" autoComplete="email" defaultValue={email} className={inputClass} required />
        </Field>
        <Field label="Password" name="password">
          <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={signingIn} className={buttonClass("primary", "lg")}>
            {signingIn ? "Logging in…" : "Log in"}
          </button>
          <button
            type="submit"
            formAction={linkAction}
            formNoValidate
            disabled={sendingLink}
            className="text-[0.95rem] font-semibold text-tea underline underline-offset-4"
          >
            {sendingLink ? "Sending…" : "Email me a sign-in link instead"}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="rounded-md bg-alert/10 p-4 font-semibold text-alert">
          {error}
        </p>
      )}
      {linkState?.notice && (
        <p role="status" className="rounded-md bg-tea-tint p-4">
          {linkState.notice}
        </p>
      )}
    </div>
  );
}
