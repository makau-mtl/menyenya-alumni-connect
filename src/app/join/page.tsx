import Link from "next/link";
import type { Metadata } from "next";
import { membershipLevels } from "@/content/site";
import { SitePhoto } from "@/components/site-photo";
import { SignInOptions } from "@/components/sign-in-options";
import { buttonClass } from "@/components/ui";
import { enabledProviders } from "@/lib/auth/providers";
import { getMember } from "@/lib/members/session";
import { getInvite, getPickLists } from "@/lib/members/pick-lists";
import { getStaff } from "@/lib/admin/staff";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Join the association",
  description: "Register as a member of the Menyenya SDA High School Alumni Association.",
};

type Props = { searchParams: Promise<{ invite?: string }> };

async function StartPanel({ invite }: { invite?: string }) {
  if (!isSupabaseConfigured) {
    return <p className="text-ink-soft">Registration opens with the soft launch. This preview isn&rsquo;t connected to the register.</p>;
  }
  const [member, lists, staff, inviteInfo] = await Promise.all([getMember(), getPickLists(), getStaff(), getInvite(invite)]);
  const stepsHref = `/join/steps${inviteInfo ? `?invite=${inviteInfo.token}` : ""}`;

  if (member?.registered) {
    return (
      <>
        <p className="text-lg">You&rsquo;re already a member{member.fullName ? `, ${member.fullName.split(" ")[0]}` : ""}. Welcome back.</p>
        <Link href="/app" className={`${buttonClass("primary", "lg")} mt-6`}>Go to your account</Link>
      </>
    );
  }
  if (!lists.registrationOpen && !staff?.isAdmin && !inviteInfo?.tester) {
    return (
      <>
        <p className="text-lg font-semibold">Registration opens soon.</p>
        <p className="mt-2 text-ink-soft">
          We&rsquo;re opening the register to all alumni and friends in December. Follow the news, or ask your class rep.
        </p>
      </>
    );
  }
  if (member) {
    return (
      <>
        <p className="text-lg">You&rsquo;re signed in as {member.email}. Carry on where you left off.</p>
        <Link href={stepsHref} className={`${buttonClass("primary", "lg")} mt-6`}>Continue registering</Link>
      </>
    );
  }
  return (
    <>
      {inviteInfo && (
        <p className="mb-5 rounded-md bg-tea-tint px-4 py-2">
          You were invited through the <strong>{inviteInfo.label}</strong> link.
        </p>
      )}
      <p className="mb-6 text-ink-soft">Start by signing in. You&rsquo;ll then answer a few short questions, about two minutes in all.</p>
      <SignInOptions providers={enabledProviders()} next={stepsHref} mode="join" />
      <p className="mt-6 text-sm text-ink-soft">
        Signing in doesn&rsquo;t register you. You join when you finish the last step. Read the{" "}
        <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
    </>
  );
}

export default async function JoinPage({ searchParams }: Props) {
  const { invite } = await searchParams;
  return (
    <>
      <section className="bg-surface">
        <div className="section grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl">Join the association</h1>
            <p className="mt-5 text-lg text-ink-soft sm:text-xl">
              Get on the alumni register, find your classmates, and be part of what we build for the school. Open to
              all former students and friends of Menyenya.
            </p>
            <a href="#register" className={`${buttonClass("primary", "lg")} mt-8`}>
              Register now
            </a>
            <p className="mt-3 text-sm text-ink-soft">About two minutes. Add more about yourself later.</p>
          </div>
          <SitePhoto space="join.hero" />
        </div>
      </section>

      <section id="register" className="section scroll-mt-24 pt-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-6 sm:p-10">
          <h2 className="text-3xl font-bold">Register</h2>
          <ol aria-label="How it works" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            <li>1. Sign in</li>
            <li>2. A few short steps</li>
            <li>3. You&rsquo;re in</li>
          </ol>
          <div className="mt-6">
            <StartPanel invite={invite} />
          </div>
        </div>
      </section>

      <section className="section grid gap-8 pt-20 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Find your people", d: "Your class and your region, set up for you when you register." },
          { t: "Events and homecomings", d: "Meet-ups near you and association-wide gatherings at the school." },
          { t: "Mentorship", d: "Guide younger alumni, or find a mentor in your field." },
          { t: "A voice", d: "Take part in consultations and plenaries that set the association's direction." },
        ].map((b) => (
          <div key={b.t} className="border-t-4 border-tea pt-4">
            <h2 className="text-xl font-bold">{b.t}</h2>
            <p className="mt-2 text-ink-soft">{b.d}</p>
          </div>
        ))}
      </section>

      <section className="section pt-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Membership levels for alumni</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Levels follow where you are in life, not age. We suggest one when you register, and you can change it at any
          time. Friends of the alumni join as friends, without a level.
        </p>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {membershipLevels.map((l) => (
            <li key={l.name} className="rounded-xl border border-line bg-surface p-6">
              <h3 className="text-2xl font-bold">{l.name}</h3>
              <p className="mt-2 text-ink-soft">{l.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
