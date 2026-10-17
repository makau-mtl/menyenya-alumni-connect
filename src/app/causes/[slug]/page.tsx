import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCause, getCauseProgress, getChannelForCause, listCausePhotos, listCauses } from "@/lib/data";
import { formatKes } from "@/lib/money";
import { BrickWall } from "@/components/brick-wall";
import { ImageSlot } from "@/components/media";
import { ProgressFigures } from "@/components/progress-figures";
import { ShareButton } from "@/components/share-button";
import { buttonClass } from "@/components/ui";
import { BURSARY_SLUG } from "@/content/bursary";
import { BursaryGiftValue, BursaryHow, BursaryNeed } from "@/components/bursary-sections";
import { ImpactSection } from "@/components/impact-section";
import { getPublicFigures } from "@/lib/figures";
import { loadImpactFigures } from "@/lib/impact";
import { loadPublicStories } from "@/lib/stories";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listCauses()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const cause = await getCause((await params).slug);
  return cause ? { title: cause.title, description: cause.summary } : {};
}

// Progress figures refresh at least once a minute; pledges also refresh them straight away.
export const revalidate = 60;

export default async function CausePage({ params }: Params) {
  const cause = await getCause((await params).slug);
  if (!cause) notFound();
  const db = isSupabaseConfigured ? createPublicClient() : null;
  const bursary = cause.slug === BURSARY_SLUG;
  const [progress, channel, allPhotos, impactFigures, impactStories, figures] = await Promise.all([
    getCauseProgress(cause.slug),
    getChannelForCause(cause),
    listCausePhotos(cause.slug),
    loadImpactFigures(db, cause.slug),
    loadPublicStories(db, 6, false, { kind: "impact", causeSlug: cause.slug }),
    bursary ? getPublicFigures() : Promise.resolve(null),
  ]);
  const photos = allPhotos.filter((p) => p.status === "published");
  const preparing = cause.lifecycle === "preparation";

  return (
    <article>
      <header className="bg-surface">
        <div className="section grid gap-10 pb-12 pt-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div className="max-w-xl">
            {preparing && (
              <p className="mb-4 inline-block rounded-full bg-gold-tint px-3 py-1 text-sm font-semibold">
                Preparing for launch
              </p>
            )}
            <h1 className="text-4xl font-bold sm:text-5xl">{cause.title}</h1>
            <p className="mt-4 text-lg text-ink-soft">{cause.summary}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {cause.pledgesEnabled && (
                <Link href={`/pledge/${cause.slug}`} className={buttonClass("primary", "lg")}>
                  Make a pledge
                </Link>
              )}
              <Link
                href={`/give/${cause.slug}`}
                className={buttonClass(cause.pledgesEnabled ? "secondary" : "primary", "lg")}
              >
                Give once
              </Link>
              <span className="sm:ml-2">
                <ShareButton title={cause.title} />
              </span>
            </div>
          </div>
          {cause.targetAmount && (
            <div className="flex flex-col gap-5">
              <BrickWall pledged={progress.pledged} target={cause.targetAmount} />
              <ProgressFigures progress={progress} target={cause.targetAmount} />
              <p className="text-sm text-ink-soft">
                Each brick is KES 1 million. Payments received will be shown here from the launch; the Board of
                Management&rsquo;s statements are the official record.
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="section grid gap-14 pt-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-14">
          <section>
            <h2 className="text-3xl font-bold">Why this matters</h2>
            <div className="mt-5 flex max-w-prose flex-col gap-4 text-[1.0625rem]">
              {cause.story.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          {bursary && <BursaryNeed f={figures} />}
          {bursary && <BursaryHow />}

          {cause.components.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold">{cause.kind === "campaign" ? "What the block will hold" : "What it includes"}</h2>
              <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {cause.components.map((c, i) => (
                  <div key={i} className="border-t-2 border-ink pt-3">
                    <dt className="font-display text-lg font-bold">{c.name}</dt>
                    <dd className="mt-1 text-ink-soft">{c.purpose}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {photos.length > 0 ? (
            <section>
              <h2 className="text-3xl font-bold">{cause.kind === "campaign" ? "Photos and drawings" : "Photos"}</h2>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2">
                {photos.map((p, i) => (
                  <li key={p.id} className={i === 0 && photos.length % 2 === 1 ? "sm:col-span-2" : ""}>
                    <figure>
                      <ImageSlot
                        caption={p.caption || cause.title}
                        photo={p}
                        ratio="landscape"
                        sizes={i === 0 && photos.length % 2 === 1 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 640px) 30vw, 100vw"}
                      />
                      {p.caption && <figcaption className="mt-2 text-sm text-ink-soft">{p.caption}</figcaption>}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          ) : cause.kind === "campaign" && (
            <section>
              <h2 className="text-3xl font-bold">Photos and drawings</h2>
              <div className="mt-5 rounded-lg border-2 border-dashed border-line p-8 text-ink-soft">
                <p className="max-w-prose">
                  Photos of today&rsquo;s classrooms and the architectural drawings will appear here once the school
                  shares them. Alumni will be able to comment on the design during the consultation in December.
                </p>
              </div>
            </section>
          )}

          {preparing && cause.readiness.length > 0 && (
            <section id="readiness" className="scroll-mt-6">
              <h2 className="text-3xl font-bold">Launch checklist</h2>
              <p className="mt-3 max-w-prose text-ink-soft">
                The three-year campaign starts at an official launch, once these steps are complete. Founding pledges
                made before then are recognised as such.
              </p>
              <ol className="mt-6 flex flex-col gap-3">
                {cause.readiness.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        item.done ? "bg-tea text-white" : "border-2 border-line text-ink-soft"
                      }`}
                    >
                      {item.done ? "✓" : i + 1}
                    </span>
                    <span className={item.done ? "" : "text-ink-soft"}>
                      {item.label}
                      <span className="sr-only">{item.done ? " (done)" : " (to do)"}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <h2 className="text-3xl font-bold">Questions</h2>
            <div className="mt-5 flex max-w-prose flex-col divide-y divide-line border-y border-line">
              <details className="py-4">
                <summary className="cursor-pointer font-semibold">Who controls the money?</summary>
                <p className="mt-3 text-ink-soft">
                  {channel.holder === "school_bom"
                    ? "The money goes directly into a dedicated project account held by the school's Board of Management, never to the association or an individual. An alumni representative on the school's project committee oversees spending and reports back to members."
                    : <>The money goes into the association&rsquo;s own account. Every gift is recorded, and what is paid out is set out in the Treasurer&rsquo;s annual financial statements on <Link href="/reports" className="underline">Reports and accountability</Link>.</>}
                </p>
              </details>
              <details className="py-4">
                <summary className="cursor-pointer font-semibold">I can&rsquo;t give much. Does it still help?</summary>
                <p className="mt-3 text-ink-soft">
                  Yes. KES 500 a month from many alumni adds up faster than a few large gifts. Every amount is
                  recorded and counts towards the total.
                </p>
              </details>
              {cause.kind === "campaign" && (
                <details className="py-4">
                  <summary className="cursor-pointer font-semibold">Can we change the design?</summary>
                  <p className="mt-3 text-ink-soft">
                    Yes, within limits. The school&rsquo;s drawings are the starting point. Suggestions gathered
                    during the consultation will be reviewed with the school and its architect, and we will report
                    back on which were taken up.
                  </p>
                </details>
              )}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-6 lg:self-start">
          {bursary && <BursaryGiftValue f={figures} />}
          {cause.suggestedPledges.length > 0 && (
            <section className="rounded-lg border border-line bg-surface p-6">
              <h2 className="text-2xl font-bold">Choose a pledge</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {cause.suggestedPledges.map((s) => {
                  const total = s.perPeriod * s.periods;
                  const href = `/pledge/${cause.slug}?type=${s.period === "monthly" ? "monthly" : "one_time"}&amount=${s.perPeriod}&periods=${s.periods}`;
                  return (
                    <li key={s.label}>
                      <Link
                        href={href}
                        className={`flex items-center justify-between gap-3 rounded-md border-2 px-4 py-3 hover:border-tea ${
                          s.sweetSpot ? "border-gold bg-gold-tint" : "border-line"
                        }`}
                      >
                        <span>
                          <span className="block font-semibold">{s.label}</span>
                          {s.periods > 1 && <span className="block text-sm text-ink-soft">{formatKes(total)} in total</span>}
                          {s.sweetSpot && <span className="block text-sm font-semibold text-ink">A good place to start</span>}
                        </span>
                        <span className="shrink-0 font-semibold text-tea">Pledge</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link href={`/pledge/${cause.slug}`} className={`${buttonClass("quiet")} mt-4`}>
                Choose your own amount
              </Link>
            </section>
          )}

          <section className="rounded-lg bg-tea-tint p-6">
            <h2 className="text-xl font-bold">Your gift is protected</h2>
            <p className="mt-3 text-[0.95rem]">Gifts to this cause are paid into:</p>
            <p className="mt-1 font-semibold">{channel.accountDisplayName}</p>
            <p className="mt-4 text-[0.95rem]">
              We will never ask you to pay to a personal phone number. If anyone does, do not pay, and tell the
              Chairman.
            </p>
          </section>
        </aside>
      </div>

      {(impactFigures.length > 0 || impactStories.length > 0) && (
        <div className="section pt-20">
          <ImpactSection
            figures={impactFigures}
            stories={impactStories}
            title="The difference it makes"
            intro={bursary ? "Stories are shared only with the agreement of a parent or guardian and the school." : undefined}
          />
        </div>
      )}
    </article>
  );
}
