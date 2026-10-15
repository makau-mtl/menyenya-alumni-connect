import type { Metadata } from "next";
import { membershipLevels } from "@/content/site";
import { ImageSlot } from "@/components/media";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Join the association",
  description: "Register as a member of the Menyenya SDA High School Alumni Association.",
};

export default function JoinPage() {
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
            <a href="#register" className="mt-8 inline-flex rounded-md bg-tea px-6 py-3 text-lg font-semibold text-white hover:bg-tea-dark">
              Register now
            </a>
            <p className="mt-3 text-sm text-ink-soft">Takes about two minutes. You can add more about yourself later.</p>
          </div>
          <ImageSlot caption="classmates reunited at a homecoming" ratio="landscape" />
        </div>
      </section>

      <section className="section grid gap-8 pt-16 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Find your people", d: "Your class group and regional cluster, set up for you when you register." },
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
        <h2 className="text-3xl font-bold sm:text-4xl">Membership levels</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">
          Choose the level that fits where you are in life. You can change it at any time. Fees, if any, will be set
          by members.
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

      <section id="register" className="section scroll-mt-24 pt-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-surface p-6 sm:p-10">
          <h2 className="text-3xl font-bold">Register</h2>
          <p className="mt-2 text-ink-soft">Fields marked with an asterisk (*) are required.</p>
          <RegisterForm levels={membershipLevels} />
        </div>
      </section>
    </>
  );
}
