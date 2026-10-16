import Link from "next/link";
import type { SupportCopy } from "@/content/support";
import { getPackages, getSupporters } from "@/lib/support";
import { SitePhoto } from "@/components/site-photo";
import { DraftNote } from "@/components/page-hero";
import { buttonClass } from "@/components/ui";
import { LogoWall } from "./logo-wall";
import { EnquiryForm } from "./enquiry-form";

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="mt-1 size-4 shrink-0 text-tea" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

const otherWays = [
  { title: "Personal ways to give", text: "Give once, pledge over time, or give in kind.", href: "/ways-to-give" },
  { title: "The tuition block", text: "Our KES 100 million project for the school.", href: "/causes/tuition-block" },
  { title: "Corporate sponsorships", text: "For businesses, SACCOs and foundations.", href: "/support/corporate-sponsorships" },
  { title: "Strategic partnerships", text: "For institutions with shared goals.", href: "/support/strategic-partnerships" },
  { title: "Alumni merchandise", text: "T-shirts, caps, mugs and more.", href: "/shop" },
];

/** The Corporate sponsorships and Strategic partnerships pages share this layout. */
export async function SupportPage({ copy }: { copy: SupportCopy }) {
  const [packages, supporters] = await Promise.all([getPackages(copy.kind), getSupporters({ kind: copy.kind })]);
  const self = copy.kind === "sponsor" ? "/support/corporate-sponsorships" : "/support/strategic-partnerships";

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#17283b_0%,#1f3a52_55%,#2e6b4f_100%)]" />
        <div className="section grid items-center gap-10 py-14 lg:grid-cols-[1fr_1.1fr] lg:py-20">
          <div>
            <p className="font-semibold uppercase tracking-[0.18em] text-gold">{copy.eyebrow}</p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] sm:text-[3.25rem]">{copy.title}</h1>
            <p className="mt-6 max-w-xl text-lg text-white/80 sm:text-xl">{copy.intro}</p>
            <a href="#enquire" className={`${buttonClass("gold", "lg")} mt-8`}>{copy.cta}</a>
          </div>
          <SitePhoto space={copy.heroSpace} sizes="(min-width: 1024px) 55vw, 100vw" className="shadow-2xl" />
        </div>
      </section>

      <div className="section pt-6">
        <DraftNote>the wording on this page is proposed for the officials to approve.</DraftNote>
      </div>

      {/* Why */}
      <section className="section pt-14 lg:pt-20">
        <h2 className="text-4xl font-bold sm:text-5xl">{copy.whyTitle}</h2>
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {copy.why.map((w) => (
            <div key={w.title} className="border-t-4 border-gold pt-5">
              <h3 className="font-display text-2xl font-bold">{w.title}</h3>
              <p className="mt-3 text-lg text-ink-soft">{w.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section className="mt-20 bg-surface py-16 lg:mt-28 lg:py-24">
        <div className="section">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold sm:text-5xl">{copy.packagesTitle}</h2>
            <p className="mt-4 text-lg text-ink-soft sm:text-xl">{copy.packagesIntro}</p>
          </div>
          {packages.length ? (
            <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {packages.map((p) => (
                <li key={p.id} className="flex flex-col rounded-3xl bg-paper p-7 ring-1 ring-line">
                  {p.audience && <p className="text-sm font-semibold uppercase tracking-[0.12em] text-tea">{p.audience}</p>}
                  <h3 className="mt-2 font-display text-2xl font-bold">{p.name}</h3>
                  {p.description && <p className="mt-3 text-ink-soft">{p.description}</p>}
                  {p.benefits.length > 0 && (
                    <ul className="mt-5 flex flex-col gap-2">
                      {p.benefits.map((b) => (
                        <li key={b} className="flex gap-2"><Check />{b}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 [&:not(:first-child)]:mt-7">
                    <p className="font-display text-lg font-bold">{p.amount}</p>
                    <a href="#enquire" className={buttonClass("primary", "sm")}>Enquire</a>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 rounded-2xl border-2 border-dashed border-line p-8 text-lg text-ink-soft">{copy.noPackages}</p>
          )}
        </div>
      </section>

      {/* Logo wall */}
      <section className="section pt-20 lg:pt-28">
        <h2 className="text-4xl font-bold sm:text-5xl">{copy.wallTitle}</h2>
        <div className="mt-10">
          {supporters.length ? (
            <LogoWall supporters={supporters} />
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-lg text-ink-soft">{copy.wallEmpty}</p>
          )}
        </div>
      </section>

      {/* Impact */}
      <section className="section pt-20 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <SitePhoto space={copy.impactSpace} sizes="(min-width: 1024px) 50vw, 100vw" />
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold sm:text-5xl">{copy.impactTitle}</h2>
            <p className="mt-5 text-lg text-ink-soft sm:text-xl">{copy.impactText}</p>
            <Link href="/causes" className={`${buttonClass("secondary")} mt-8`}>See our work</Link>
          </div>
        </div>
      </section>

      {/* Questions and enquiry */}
      <section className="section grid gap-12 pt-20 lg:grid-cols-[1fr_1.2fr] lg:pt-28">
        <div>
          <h2 className="text-4xl font-bold sm:text-5xl">Questions? We&rsquo;ll find your answer.</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {copy.faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {f.q}
                  <span aria-hidden className="text-2xl text-tea transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div id="enquire" className="scroll-mt-28 rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line sm:p-10">
          <h2 className="font-display text-3xl font-bold">{copy.cta}</h2>
          <p className="mt-2 mb-8 text-ink-soft">Leave your details and we will get in touch.</p>
          <EnquiryForm kind={copy.kind} packages={packages} packageLabel={copy.packageLabel} />
        </div>
      </section>

      {/* Other ways */}
      <section className="section pb-20 pt-20 lg:pt-28">
        <h2 className="text-3xl font-bold sm:text-4xl">Other ways to support</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {otherWays.filter((w) => w.href !== self).map((w) => (
            <li key={w.href}>
              <Link href={w.href} className="group flex h-full flex-col rounded-2xl bg-tea-tint p-6 transition hover:bg-tea hover:text-white">
                <span className="font-display text-xl font-bold">{w.title}</span>
                <span className="mt-2 text-ink-soft group-hover:text-white/85">{w.text}</span>
                <span aria-hidden className="mt-4 text-2xl">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
