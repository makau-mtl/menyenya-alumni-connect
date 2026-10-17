/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { loadPublicStories, storyPhotoUrls } from "@/lib/stories";
import { StoryCard } from "@/components/stories/story-card";
import { buttonClass } from "@/components/ui";
import { VideoSlot } from "@/components/media";
import { youtubeId } from "@/lib/photos";

export const revalidate = 300;

export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };
type Story = { slug: string; title: string; summary: string; body: string; subject_name: string; subject_year_left: number | null; photo_path: string | null; photo_caption: string | null; published_at: string; is_impact: boolean; video_url: string | null; cause_slug: string | null; cause_title: string | null };

const getStory = cache(async (slug: string) => {
  if (!isSupabaseConfigured) return null;
  const db = createPublicClient();
  const { data } = await db.rpc("public_story", { p_slug: slug });
  const s = ((data ?? []) as Story[])[0];
  if (!s) return null;
  const photo = s.photo_path ? (await storyPhotoUrls(db, [s.photo_path], "large")).get(s.photo_path) ?? null : null;
  return { ...s, photo };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getStory((await params).slug);
  return s ? { title: s.title, description: s.summary || `${s.subject_name}'s story` } : { title: "Alumni stories" };
}

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const s = await getStory(slug);
  if (!s) notFound();
  const more = (await loadPublicStories(createPublicClient(), 4)).filter((x) => x.slug !== s.slug).slice(0, 3);
  const paragraphs = s.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      <article className="section pt-12 lg:pt-16">
        <div className="mx-auto max-w-3xl">
        <Link href="/stories" className="font-semibold text-tea underline underline-offset-4">All alumni stories</Link>
        {s.is_impact && (
          <p className="mt-8">
            <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-tea-dark">
              From our work{s.cause_title ? ": " : ""}{s.cause_slug && <Link href={`/causes/${s.cause_slug}`} className="ml-1 underline">{s.cause_title}</Link>}
            </span>
          </p>
        )}
        <p className={`${s.is_impact ? "mt-4" : "mt-8"} text-sm font-semibold uppercase tracking-[0.16em] text-tea`}>
          {s.subject_name}{s.subject_year_left ? ` · Class of ${s.subject_year_left}` : ""}
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.1] sm:text-5xl">{s.title}</h1>
        {s.summary && <p className="mt-5 text-xl text-ink-soft">{s.summary}</p>}
        {s.video_url && youtubeId(s.video_url) && (
          <div className="mt-10"><VideoSlot youtubeId={youtubeId(s.video_url)} title={s.title} caption={s.title} /></div>
        )}
        {s.photo && (
          <figure className="mt-10">
            <img src={s.photo} alt={s.photo_caption ?? s.subject_name} className="aspect-[3/2] w-full rounded-2xl object-cover" />
            {s.photo_caption && <figcaption className="mt-2 text-sm text-ink-soft">{s.photo_caption}</figcaption>}
          </figure>
        )}
        <div className="mt-10 flex flex-col gap-5 text-lg leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">{p}</p>
          ))}
        </div>
        <p className="mt-10 text-sm text-ink-soft">Published {dateFormat.format(new Date(s.published_at))}</p>
        </div>
      </article>
      <section className="section pt-16">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-surface p-8 sm:flex-row sm:items-center sm:justify-between">
          {s.is_impact && s.cause_slug ? (
            <>
              <p className="max-w-xl text-lg font-semibold">Stories like this happen because alumni and friends give. Be part of the next one.</p>
              <Link href={`/causes/${s.cause_slug}`} className={buttonClass("gold", "lg")}>Support {s.cause_title}</Link>
            </>
          ) : (
            <>
              <p className="max-w-xl text-lg font-semibold">Has Menyenya shaped your journey too? Every story inspires a student still in class.</p>
              <Link href="/app/stories" className={buttonClass("gold", "lg")}>Share your story</Link>
            </>
          )}
        </div>
      </section>
      {more.length > 0 && (
        <section className="section pt-16">
          <h2 className="text-3xl font-bold">More stories</h2>
          <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((x) => <StoryCard key={x.slug} s={x} />)}
          </div>
        </section>
      )}
    </>
  );
}
