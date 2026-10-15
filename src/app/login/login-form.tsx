"use client";

import { useState } from "react";
import { Field, buttonClass, inputClass } from "@/components/ui";

export function LoginForm() {
  const [notice, setNotice] = useState(false);

  return (
    <form
      className="mt-8 flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setNotice(true);
      }}
    >
      <button
        type="button"
        onClick={() => setNotice(true)}
        className="flex items-center justify-center gap-3 rounded-md border-2 border-line bg-surface px-5 py-2.5 font-semibold hover:border-ink"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5">
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.2z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.4-.4-2s.1-1.4.4-2V7.1H2a11 11 0 0 0 0 9.8L5.7 14z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9.1 5.4 12 5.4z" />
        </svg>
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-sm text-ink-soft">
        <span className="h-px flex-1 bg-line" />
        or with your email
        <span className="h-px flex-1 bg-line" />
      </div>
      <Field label="Email" name="email">
        <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Password" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} />
      </Field>
      <div className="flex items-center justify-between">
        <button type="submit" className={buttonClass("primary", "lg")}>
          Log in
        </button>
        <a href="#" onClick={(e) => { e.preventDefault(); setNotice(true); }} className="text-[0.95rem] text-tea underline underline-offset-4">
          Forgot password?
        </a>
      </div>
      {notice && (
        <p role="status" className="rounded-md bg-gold-tint p-4">
          Member log-in opens with registration in January 2027. Nothing was sent.
        </p>
      )}
    </form>
  );
}
