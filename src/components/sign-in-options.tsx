"use client";

import { useActionState } from "react";
import { sendSignInLink, signInWithProvider, type LoginState } from "@/app/login/actions";
import { providerLabels, type Provider } from "@/lib/auth/providers";
import { Field, buttonClass, inputClass } from "@/components/ui";

function ProviderIcon({ provider }: { provider: Provider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="size-5">
        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z" />
        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14z" />
        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4z" />
      </svg>
    );
  }
  if (provider === "linkedin_oidc") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="size-5">
        <rect width="24" height="24" rx="4" fill="#0A66C2" />
        <path fill="#fff" d="M7.1 9.4h-2.6v8.4h2.6zM5.8 5.3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm12.7 7.4c0-2.3-1.2-3.4-2.9-3.4-1.3 0-2 .7-2.3 1.3V9.4h-2.6v8.4h2.6v-4.2c0-1.1.2-2.1 1.5-2.1s1.3 1.2 1.3 2.2v4.1h2.6z" />
      </svg>
    );
  }
  return <span aria-hidden className="size-5 rounded-full bg-line" />;
}

/**
 * Continue with Google / LinkedIn first, then an emailed one-time link. No passwords for members.
 * Used on the log-in page and as the first step of joining.
 */
export function SignInOptions({
  providers,
  next,
  mode,
}: {
  providers: Provider[];
  next: string;
  mode: "join" | "login";
}) {
  const [state, action, sending] = useActionState<LoginState, FormData>(sendSignInLink, null);

  return (
    <div className="flex flex-col gap-5">
      {providers.length > 0 && (
        <div className="flex flex-col gap-3">
          {providers.map((p) => (
            <form key={p} action={signInWithProvider}>
              <input type="hidden" name="provider" value={p} />
              <input type="hidden" name="next" value={next} />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-md border-2 border-line bg-surface px-5 py-3 text-lg font-semibold hover:border-ink"
              >
                <ProviderIcon provider={p} />
                Continue with {providerLabels[p]}
              </button>
            </form>
          ))}
          <p className="text-sm text-ink-soft">
            Recommended: no password to remember, and your name and email come with it. We never post anything for you.
          </p>
        </div>
      )}

      {providers.length > 0 && (
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="h-px flex-1 bg-line" />
          or with your email
          <span className="h-px flex-1 bg-line" />
        </div>
      )}

      {state?.notice ? (
        <p role="status" className="rounded-md bg-tea-tint p-4">
          {state.notice}
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={mode} />
          <Field label="Email" name="email" hint="We'll email you a one-time link. No password needed.">
            <input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.email} required className={inputClass} />
          </Field>
          <button type="submit" disabled={sending} className={`${buttonClass("secondary")} self-start`}>
            {sending ? "Sending…" : "Email me a link"}
          </button>
        </form>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-alert/10 p-4 font-semibold text-alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
