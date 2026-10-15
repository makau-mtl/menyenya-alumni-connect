import type { Metadata } from "next";
import { news } from "@/content/site";
import { NewsCard } from "@/components/news-card";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "News and events" };

export default function NewsPage() {
  const upcoming = news.filter((n) => n.kind === "Event" && new Date(n.date) >= new Date(new Date().toDateString()));
  const rest = news.filter((n) => !upcoming.includes(n));
  return (
    <>
      <PageHero title="News and events" intro="What is happening across the association, at the school and in your region." />
      {upcoming.length > 0 && (
        <section className="section pt-14">
          <h2 className="text-3xl font-bold">Coming up</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {upcoming.map((n) => (
              <NewsCard key={n.slug} item={n} />
            ))}
          </div>
        </section>
      )}
      <section className="section pt-14">
        <h2 className="text-3xl font-bold">Latest</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {rest.map((n) => (
            <NewsCard key={n.slug} item={n} />
          ))}
        </div>
      </section>
    </>
  );
}
