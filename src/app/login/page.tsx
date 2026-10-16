import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

const errors: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Request a new one below.",
  google: "Google sign-in isn't switched on yet. Use your email and password, or email yourself a sign-in link.",
  "not-connected": "Member log-in opens with registration in January 2027.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const q = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const nextParam = first(q.next);
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";
  const error = errors[first(q.error)];
  return (
    <div className="section grid gap-12 pt-12 lg:grid-cols-2 lg:pt-20">
      <div className="mx-auto w-full max-w-md lg:mx-0">
        <h1 className="text-4xl font-bold">Log in</h1>
        <p className="mt-3 text-ink-soft">For registered members of the association.</p>
        <LoginForm next={next} initialError={error} />
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
          <li>Find and message classmates</li>
          <li>Events near you and homecomings</li>
          <li>Your giving history and receipts</li>
          <li>Mentorship and opportunities</li>
        </ul>
        <p className="mt-8 text-white/70">Class and regional reps also see their group&rsquo;s dashboard here.</p>
      </div>
    </div>
  );
}
