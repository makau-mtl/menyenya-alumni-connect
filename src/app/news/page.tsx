import type { Metadata } from "next";
import { listNews } from "@/lib/data";
import { NewsCard } from "@/components/news-card";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "News and events" };

// Updates from the admin area show straight away; this is a fallback refresh.
export const revalidate = 300;

export default async function NewsPage() {
  const news = await listNews();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  const upcoming = news.filter((n) => n.kind === "event" && n.date >= today).reverse();
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
        {rest.length === 0 ? (
          <p className="mt-6 text-ink-soft">News will appear here.</p>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {rest.map((n) => (
              <NewsCard key={n.slug} item={n} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
