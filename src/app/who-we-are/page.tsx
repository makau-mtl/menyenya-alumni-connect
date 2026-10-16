import Link from "next/link";
import type { Metadata } from "next";
import { mission, pillars } from "@/content/site";
import { SitePhoto } from "@/components/site-photo";
import { DraftNote } from "@/components/page-hero";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Who we are",
  description: "The mission, vision, values and story of the Menyenya SDA High School Alumni Association.",
};

export default function WhoWeArePage() {
  return (
    <>
      {/* Mission hero */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#17283b_0%,#1f3a52_60%,#2e6b4f_100%)]" />
        <div className="section py-16 lg:py-24">
          <p className="font-semibold text-gold">Our mission</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-[1.12] sm:text-[3.25rem]">{mission.mission}</h1>
        </div>
      </section>

      <div className="section pt-6">
        {mission.draft && <DraftNote>the mission, vision, values and story are proposed wording for the officials to approve.</DraftNote>}
      </div>

      {/* Story */}
      <section className="section grid items-center gap-12 pt-14 lg:grid-cols-2 lg:pt-20">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold sm:text-4xl">Our story</h2>
          <div className="mt-5 flex flex-col gap-4 text-lg text-ink-soft">
            <p>
              Menyenya SDA High School has shaped generations of students who went on to serve as teachers, doctors,
              engineers, pastors, entrepreneurs and leaders across Kenya and beyond.
            </p>
            <p>
              The alumni association brings those generations together. In 2026 members met in plenary, agreed a
              shared agenda, and began formalising the association so that it can serve the school for decades to come.
            </p>
            <p>As the school approaches its 50th anniversary, we are building the structures to give back well.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SitePhoto space="who.history.main" sizes="(min-width: 1024px) 30vw, 60vw" />
          <div className="flex flex-col gap-4 pt-12">
            <SitePhoto space="who.history.side-1" tone="light" sizes="(min-width: 1024px) 20vw, 40vw" />
            <SitePhoto space="who.history.side-2" sizes="(min-width: 1024px) 20vw, 40vw" />
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="section pt-20 lg:pt-28">
        <h2 className="text-3xl font-bold sm:text-4xl">What we do</h2>
        <div className="mt-10 flex flex-col gap-14">
          {pillars.map((p, i) => (
            <div key={p.title} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <SitePhoto space={p.space} sizes="(min-width: 768px) 50vw, 100vw" />
              <div className="max-w-lg">
                <h3 className="text-3xl font-bold">{p.title}</h3>
                <p className="mt-3 text-lg text-ink-soft">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vision and values */}
      <section className="mt-20 bg-surface py-20 lg:mt-28">
        <div className="section">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold sm:text-4xl">Our vision</h2>
            <p className="mt-5 font-display text-2xl leading-snug sm:text-[1.75rem]">{mission.vision}</p>
          </div>
          <h2 className="mt-16 text-3xl font-bold sm:text-4xl">Our values</h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {mission.values.map((v) => (
              <div key={v.name} className="border-t-4 border-gold pt-4">
                <dt className="font-display text-2xl font-bold">{v.name}</dt>
                <dd className="mt-2 text-ink-soft">{v.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How we are governed */}
      <section className="section grid gap-10 pt-20 lg:grid-cols-[1fr_1fr] lg:pt-28">
        <div className="max-w-xl">
          <h2 className="text-3xl font-bold sm:text-4xl">How we are governed</h2>
          <p className="mt-5 text-lg text-ink-soft">
            Members elect the association&rsquo;s officials, and the plenary sets our direction. Our registration with
            the Registrar of Societies is in progress, and an agreement with the school will set out how we work
            together on projects.
          </p>
          <p className="mt-4 text-lg text-ink-soft">
            Money for school projects goes to accounts held by the school&rsquo;s Board of Management. We publish an
            annual financial report for members.
          </p>
        </div>
        <ul className="flex flex-col divide-y divide-line self-start border-y border-line">
          {[
            { label: "Leadership and secretariat", href: "/who-we-are/team" },
            { label: "Constitution (once adopted)", href: "/who-we-are#governance" },
            { label: "Annual financial reports", href: "/who-we-are#governance" },
            { label: "Careers", href: "/careers" },
          ].map((l) => (
            <li key={l.label}>
              <Link href={l.href} className="flex items-center justify-between py-4 text-lg font-semibold hover:text-tea">
                {l.label}
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="governance" className="section pt-20 lg:pt-28">
        <div className="flex flex-col gap-6 rounded-2xl bg-tea-tint p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold">Join us</h2>
            <p className="mt-3 text-lg text-ink-soft">Every alumnus and friend of the school is welcome.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/join" className={buttonClass("primary", "lg")}>
              Join the association
            </Link>
            <Link href="/donate" className={buttonClass("gold", "lg")}>
              Donate
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
