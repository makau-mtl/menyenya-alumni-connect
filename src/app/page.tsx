import Link from "next/link";
import { notFound } from "next/navigation";
import { getCause, getCauseProgress } from "@/lib/data";
import { chairMessage, mission, news, pillars } from "@/content/site";
import { BrickWall } from "@/components/brick-wall";
import { ProgressFigures } from "@/components/progress-figures";
import { ImageSlot, VideoSlot } from "@/components/media";
import { NewsCard } from "@/components/news-card";
import { buttonClass } from "@/components/ui";

// Progress figures refresh at least once a minute; pledges also refresh them straight away.
export const revalidate = 60;

export default async function HomePage() {
  const block = await getCause("tuition-block");
  if (!block || !block.targetAmount) notFound();
  const progress = await getCauseProgress(block.slug);

  return (
    <>
      {/* Hero: full-width photo of the school with the association's promise */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#17283b_0%,#1f3a52_55%,#2e6b4f_100%)]" />
        <svg aria-hidden className="absolute inset-0 -z-10 h-full w-full text-white opacity-[0.06]">
          <defs>
            <pattern id="hero-bond" width="64" height="32" patternUnits="userSpaceOnUse">
              <rect x="1" y="1" width="62" height="14" rx="1" fill="currentColor" />
              <rect x="-31" y="17" width="62" height="14" rx="1" fill="currentColor" />
              <rect x="33" y="17" width="62" height="14" rx="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-bond)" />
        </svg>
        <div className="section grid min-h-[34rem] items-center gap-10 py-16 lg:min-h-[38rem] lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-[2.6rem] font-bold leading-[1.08] sm:text-6xl">Menyenya made us. Together, we build it.</h1>
            <p className="mt-6 max-w-xl text-lg text-white/85 sm:text-xl">
              We are the alumni and friends of Menyenya SDA High School, coming together to support the school, its
              students and one another.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/donate" className={buttonClass("gold", "lg")}>
                Donate
              </Link>
              <Link href="/join" className={buttonClass("light", "lg")}>
                Join the association
              </Link>
            </div>
            <a href="#chair-message" className="mt-7 inline-flex items-center gap-3 font-semibold text-white hover:underline">
              <span className="flex size-10 items-center justify-center rounded-full bg-white/15">
                <svg aria-hidden viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor">
                  <path d="M7 4.5v15l13-7.5z" />
                </svg>
              </span>
              Watch the Chairman&rsquo;s message
            </a>
          </div>
          <div className="hidden grid-cols-[1.4fr_1fr] gap-4 lg:grid">
            <ImageSlot caption="students outside the school" ratio="tall" tone="light" className="shadow-2xl" />
            <div className="flex flex-col gap-4 pt-16">
              <ImageSlot caption="alumni at the plenary" ratio="square" tone="light" />
              <ImageSlot caption="the school gate" ratio="square" tone="light" />
            </div>
          </div>
        </div>
      </section>

      {/* Chairman's video message */}
      <section id="chair-message" className="section scroll-mt-24 pt-20 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <VideoSlot
            youtubeId={chairMessage.youtubeId}
            title={`A message from our ${chairMessage.role}`}
            caption="a two-minute welcome from the Chairman"
          />
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">A message from our Chairman</h2>
            <p className="mt-4 text-lg text-ink-soft">{chairMessage.summary}</p>
            {chairMessage.name && <p className="mt-6 font-semibold">{chairMessage.name}</p>}
            <p className={chairMessage.name ? "text-ink-soft" : "mt-6 font-semibold"}>
              {chairMessage.role}, Menyenya SDA High School Alumni Association
            </p>
          </div>
        </div>
      </section>

      {/* Who we are */}
      <section className="section pt-20 lg:pt-28">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold sm:text-4xl">Who we are</h2>
          <p className="mt-5 font-display text-2xl leading-snug text-ink sm:text-[1.75rem]">{mission.mission}</p>
          <Link href="/who-we-are" className={`${buttonClass("quiet")} mt-5 text-lg`}>
            Our mission, vision and story
          </Link>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title}>
              <ImageSlot caption={p.image.toLowerCase()} ratio="landscape" />
              <h3 className="mt-5 text-2xl font-bold">{p.title}</h3>
              <p className="mt-2 text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured project */}
      <section className="mt-20 bg-surface py-20 lg:mt-28 lg:py-24">
        <div className="section grid items-center gap-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <p className="font-semibold text-tea">Our current project</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">A new tuition block for Menyenya</h2>
            <p className="mt-5 text-lg text-ink-soft">
              A library, at least two computer laboratories, classrooms and offices. Members agreed at the plenary to
              raise KES 100 million over three years, and the first pledges came in on the day.
            </p>
            <p className="mt-4 text-ink-soft">
              Gifts go straight to a dedicated project account held by the school&rsquo;s Board of Management, with an
              alumni representative overseeing the spending.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pledge/tuition-block" className={buttonClass("primary", "lg")}>
                Make a pledge
              </Link>
              <Link href="/causes/tuition-block" className={buttonClass("secondary", "lg")}>
                About the project
              </Link>
            </div>
          </div>
          <figure className="flex flex-col gap-5">
            <BrickWall pledged={progress.pledged} target={block.targetAmount} />
            <figcaption className="flex flex-col gap-3">
              <ProgressFigures progress={progress} target={block.targetAmount} />
              <p className="text-sm text-ink-soft">Each brick is KES 1 million pledged.</p>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Ways to get involved */}
      <section className="section pt-20 lg:pt-28">
        <h2 className="text-3xl font-bold sm:text-4xl">Your support, your choice</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">Every way of taking part makes a difference to the school and to fellow alumni.</p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Give today",
              text: "A one-off gift of any amount to the cause you choose. No account needed.",
              cta: "Donate",
              href: "/donate",
              image: "a student in the school library",
            },
            {
              title: "Pledge over time",
              text: "Commit an amount and pay monthly or yearly. You get a reference and reminders by email.",
              cta: "Make a pledge",
              href: "/pledge/tuition-block",
              image: "classmates planning their pledge",
            },
            {
              title: "Join the association",
              text: "Get on the register, connect with your class and region, and mentor or be mentored.",
              cta: "Join",
              href: "/join",
              image: "alumni at a regional meet-up",
            },
          ].map((c) => (
            <div key={c.title} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
              <ImageSlot caption={c.image} ratio="landscape" className="rounded-none" />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-2xl font-bold">{c.title}</h3>
                <p className="mt-2 flex-1 text-ink-soft">{c.text}</p>
                <Link href={c.href} className={`${buttonClass("primary")} mt-6 self-start`}>
                  {c.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-ink-soft">
          Want to give in kind, through your company, or as a class?{" "}
          <Link href="/ways-to-give" className="font-semibold text-tea underline underline-offset-4">
            See all ways to give
          </Link>
        </p>
      </section>

      {/* News and events */}
      <section className="section pt-20 lg:pt-28">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-bold sm:text-4xl">News and events</h2>
          <Link href="/news" className="font-semibold text-tea underline underline-offset-4">
            All news and events
          </Link>
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {news.slice(0, 3).map((n) => (
            <NewsCard key={n.slug} item={n} />
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="section pt-20 lg:pt-28">
        <div className="grid overflow-hidden rounded-2xl bg-tea text-white lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <h2 className="text-3xl font-bold sm:text-4xl">Be part of what Menyenya becomes</h2>
            <p className="mt-4 text-lg text-white/85">
              Whether you left last year or decades ago, there is a place for you. Give, join, or both.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/donate" className={buttonClass("gold", "lg")}>
                Donate
              </Link>
              <Link href="/join" className={buttonClass("light", "lg")}>
                Join the association
              </Link>
            </div>
          </div>
          <ImageSlot caption="today's students, tomorrow's alumni" ratio="landscape" tone="light" className="h-full rounded-none" />
        </div>
      </section>
    </>
  );
}
