import Link from "next/link";
import { asAt, type ImpactFigure } from "@/lib/impact";
import type { StoryCardData } from "@/lib/stories";
import { StoryCard } from "@/components/stories/story-card";

/** Impact figures (typed by officials, with an "as at" date) and impact stories for one initiative or all. */
export function ImpactSection({ figures, stories, title = "Our impact", intro, showCause = false, moreHref }: {
  figures: ImpactFigure[]; stories: StoryCardData[]; title?: string; intro?: string; showCause?: boolean; moreHref?: string;
}) {
  if (figures.length === 0 && stories.length === 0) return null;
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
          {intro && <p className="mt-2 max-w-2xl text-ink-soft">{intro}</p>}
        </div>
        {moreHref && <Link href={moreHref} className="font-semibold text-tea underline underline-offset-4">More stories of impact</Link>}
      </div>
      {figures.length > 0 && (
        <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {figures.map((f) => (
            <div key={f.id} className="rounded-2xl bg-tea-tint p-5">
              <dd className="whitespace-nowrap font-display text-3xl font-bold text-ink">{f.value}</dd>
              <dt className="mt-1 font-semibold">{f.label}</dt>
              <dd className="mt-2 text-xs text-ink-soft">
                {showCause && <Link href={`/causes/${f.cause_slug}`} className="underline">{f.cause_title}</Link>}
                {showCause && " · "}as at {asAt.format(new Date(f.as_of))}{f.note ? ` · ${f.note}` : ""}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {stories.length > 0 && (
        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => <StoryCard key={s.slug} s={s} />)}
        </div>
      )}
    </section>
  );
}
