import Link from "next/link";
import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Careers" };

export default function CareersPage() {
  return (
    <>
      <PageHero
        title="Work with the association"
        intro="We open internships and roles to Menyenya alumni first, so that the association grows its own people as it grows."
        image="the association's team at work"
      />

      <section className="section pt-14">
        <h2 className="text-3xl font-bold">Current openings</h2>
        <div className="mt-6 max-w-2xl rounded-xl border border-line bg-surface p-8">
          <p className="text-lg">There are no open roles right now.</p>
          <p className="mt-2 text-ink-soft">
            New openings are posted here and shared with registered members first. Join the association to hear about
            them.
          </p>
          <Link href="/join" className={`${buttonClass("primary")} mt-6`}>
            Join the association
          </Link>
        </div>
      </section>

      <section className="section grid gap-10 pt-20 md:grid-cols-3">
        {[
          { title: "Internships", text: "Paid internships for recent graduates in communication, administration and technology." },
          { title: "Volunteer roles", text: "Class champions, regional coordinators, mentors and project committee members." },
          { title: "Professional services", text: "Alumni professionals who offer legal, finance, design or engineering support." },
        ].map((c) => (
          <div key={c.title} className="border-t-4 border-tea pt-4">
            <h3 className="text-2xl font-bold">{c.title}</h3>
            <p className="mt-2 text-ink-soft">{c.text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
