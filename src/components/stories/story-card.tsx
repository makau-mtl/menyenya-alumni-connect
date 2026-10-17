/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Play, Quote } from "lucide-react";
import type { StoryCardData } from "@/lib/stories";
import { buttonClass } from "@/components/ui";

function Picture({ s, className }: { s: StoryCardData; className: string }) {
  const pic = s.photo ? (
    <img src={s.photo} alt={s.photo_caption ?? s.subject_name} loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span className={`${className} flex items-end bg-gradient-to-br from-ink to-tea p-5 text-white`}>
      <Quote className="size-10 text-gold" aria-hidden />
    </span>
  );
  if (!s.has_video) return pic;
  return (
    <span className="relative block">
      {pic}
      <span className="absolute inset-0 flex items-center justify-center" aria-label="Includes a video">
        <span className="flex size-14 items-center justify-center rounded-full bg-gold text-ink shadow-lg"><Play className="ml-1 size-6 fill-current" aria-hidden /></span>
      </span>
    </span>
  );
}

/** "From our work · Menyenya Alumni Bursary Fund" for impact stories. */
function Tag({ s, light = false }: { s: StoryCardData; light?: boolean }) {
  if (!s.is_impact) return null;
  return (
    <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${light ? "bg-white/15 text-white" : "bg-secondary text-tea-dark"}`}>
      From our work{s.cause_title ? ` · ${s.cause_title}` : ""}
    </span>
  );
}

const byline = (s: StoryCardData) => [s.subject_name, s.subject_year_left ? `Class of ${s.subject_year_left}` : null].filter(Boolean).join(" · ");
const readLabel = (s: StoryCardData) => (s.has_video ? "Watch and read" : "Read the story");

/** A story in a grid. */
export function StoryCard({ s }: { s: StoryCardData }) {
  return (
    <article className="group flex flex-col">
      <Link href={`/stories/${s.slug}`} className="block overflow-hidden rounded-2xl">
        <Picture s={s} className="aspect-[4/3] w-full transition duration-500 group-hover:scale-[1.03]" />
      </Link>
      <div className="mt-4 flex flex-col gap-1.5"><Tag s={s} /><p className="text-sm font-semibold text-tea">{byline(s)}</p></div>
      <h3 className="mt-1 text-xl font-bold leading-snug">
        <Link href={`/stories/${s.slug}`} className="hover:underline">{s.title}</Link>
      </h3>
      {s.summary && <p className="mt-2 line-clamp-3 text-ink-soft">{s.summary}</p>}
      <Link href={`/stories/${s.slug}`} className="mt-3 font-semibold text-tea underline underline-offset-4">{readLabel(s)}</Link>
    </article>
  );
}

/** The lead story: photo on one side, words on the other. */
export function FeaturedStory({ s }: { s: StoryCardData }) {
  return (
    <article className="grid overflow-hidden rounded-3xl bg-ink text-white lg:grid-cols-2">
      <Picture s={s} className="aspect-[4/3] w-full lg:aspect-auto lg:h-full" />
      <div className="flex flex-col justify-center gap-4 p-8 sm:p-12">
        <Tag s={s} light />
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">{byline(s)}</p>
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{s.title}</h2>
        {s.summary && <p className="text-lg text-white/80">{s.summary}</p>}
        <Link href={`/stories/${s.slug}`} className={`${buttonClass("gold", "lg")} mt-2 w-fit`}>
          {readLabel(s)}
        </Link>
      </div>
    </article>
  );
}
