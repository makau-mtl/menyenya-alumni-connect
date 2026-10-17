import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { loadPublicStories } from "@/lib/stories";
import { FeaturedStory, StoryCard } from "@/components/stories/story-card";
import { PageHero } from "@/components/page-hero";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Alumni stories",
  description: "Journeys that began at Menyenya SDA High School: alumni, teachers and friends of the school.",
};

// Changes in the admin area show straight away; this is a fallback refresh.
export const revalidate = 300;

const filters = [
  { key: "all", label: "All stories" },
  { key: "alumni", label: "Alumni journeys" },
  { key: "impact", label: "Impact from our work" },
] as const;

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show;
  const kind = show === "impact" || show === "alumni" ? show : undefined;
  const stories = await loadPublicStories(isSupabaseConfigured ? createPublicClient() : null, 60, false, { kind });
  const [lead, ...rest] = stories;
  return (
    <>
      <PageHero
        title="Alumni stories"
        intro="Journeys that began in Menyenya's classrooms, dormitories and fields, and the people who keep giving back."
      >
        <Link href="/app/stories" className={buttonClass("primary", "lg")}>Share your story</Link>
      </PageHero>
      <section className="section pt-14">
        <nav aria-label="Filter stories" className="mb-8 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = (kind ?? "all") === f.key;
            return (
              <Link key={f.key} href={f.key === "all" ? "/stories" : `/stories?show=${f.key}`} aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${active ? "bg-ink text-white ring-ink" : "bg-card text-ink ring-line hover:ring-tea"}`}>
                {f.label}
              </Link>
            );
          })}
        </nav>
        {!lead ? (
          <div className="rounded-2xl border-2 border-dashed border-line p-10 text-center">
            <h2 className="text-2xl font-bold">{kind === "impact" ? "Stories of impact are on their way" : "The first stories are on their way"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-ink-soft">
              Members are sharing their journeys since Menyenya. Have one, or know someone whose story should be told?
            </p>
            <Link href="/app/stories" className={`${buttonClass("primary")} mt-6`}>Share a story</Link>
          </div>
        ) : (
          <>
            <FeaturedStory s={lead} />
            {rest.length > 0 && (
              <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((s) => <StoryCard key={s.slug} s={s} />)}
              </div>
            )}
          </>
        )}
      </section>
      <section className="section pt-20">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-surface p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold sm:text-3xl">Every journey inspires someone still in class</h2>
            <p className="mt-2 text-ink-soft">Share yours, or tell us about a classmate or teacher whose story deserves telling. We always ask before publishing.</p>
          </div>
          <Link href="/app/stories" className={buttonClass("gold", "lg")}>Share a story</Link>
        </div>
      </section>
    </>
  );
}
