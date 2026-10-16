import Link from "next/link";
import type { Metadata } from "next";
import { enabledProviders, safeNext } from "@/lib/auth/providers";
import { SignInOptions } from "@/components/sign-in-options";
import { PasswordForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

const errors: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Request a new one below.",
  provider: "That sign-in option isn't available right now. Try another, or use your email.",
  cancelled: "Sign-in was cancelled. You can try again, or use your email.",
  "not-connected": "Sign-in isn't available on this preview.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const q = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const next = safeNext(first(q.next));
  const error = errors[first(q.error)];
  return (
    <div className="section grid gap-12 pt-12 lg:grid-cols-2 lg:pt-20">
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <h1 className="text-4xl font-bold">Log in</h1>
        <p className="mt-3 text-ink-soft">For members and officials of the association.</p>
        {error && (
          <p role="alert" className="mt-6 rounded-md bg-alert/10 p-4 font-semibold text-alert">
            {error}
          </p>
        )}
        <div className="mt-8">
          <SignInOptions providers={enabledProviders()} next={next} mode="login" />
        </div>
        <details className="mt-8 border-t border-line pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink-soft">Officials: log in with a password</summary>
          <PasswordForm next={next} />
        </details>
        <p className="mt-8 text-ink-soft">
          Not a member yet?{" "}
          <Link href="/join" className="font-semibold text-tea underline underline-offset-4">
            Join the association
          </Link>
        </p>
        <p className="mt-2 text-ink-soft">
          Gave or pledged without an account?{" "}
          <Link href="/track" className="font-semibold text-tea underline underline-offset-4">
            Track your pledge
          </Link>
        </p>
      </div>
      <div className="hidden rounded-2xl bg-ink p-10 text-white lg:block">
        <h2 className="text-3xl font-bold">Your member area</h2>
        <ul className="mt-6 flex flex-col gap-4 text-lg text-white/85">
          <li>Your profile, class and region</li>
          <li>Find classmates in the member directory</li>
          <li>Events near you and homecomings</li>
          <li>Your giving history and receipts</li>
          <li>Mentorship and opportunities</li>
        </ul>
        <p className="mt-8 text-white/70">Some of these open in January 2027.</p>
      </div>
    </div>
  );
}
