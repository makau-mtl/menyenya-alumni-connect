import Link from "next/link";
import type { Metadata } from "next";
import { listCauses } from "@/lib/data";
import { ImageSlot } from "@/components/media";
import { PageHero } from "@/components/page-hero";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Our work" };

const images: Record<string, string> = {
  "tuition-block": "the planned tuition block",
  "keep-a-child-in-school": "a student in class",
  "where-most-needed": "alumni and students together",
};

const comingNext = [
  { title: "Mentorship", text: "Pairing established alumni with recent graduates and students choosing careers." },
  { title: "Welfare", text: "Standing with members and their families at times of need, where classes choose to take part." },
  { title: "Events and homecoming", text: "Regional meet-ups, class reunions and an annual homecoming at the school." },
];

export default async function OurWorkPage() {
  const causes = await listCauses();
  return (
    <>
      <PageHero
        title="Our work"
        intro="Projects and funds that support the school and its students. Each has its own fund, and every shilling is recorded and reported."
      />
      <section className="section flex flex-col gap-14 pt-14">
        {causes.map((c, i) => (
          <article key={c.slug} className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
            <ImageSlot caption={images[c.slug] ?? c.title.toLowerCase()} ratio="landscape" />
            <div className="max-w-lg">
              <h2 className="text-3xl font-bold">{c.title}</h2>
              <p className="mt-3 text-lg text-ink-soft">{c.summary}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/give/${c.slug}`} className={buttonClass("gold")}>
                  Donate
                </Link>
                <Link href={`/causes/${c.slug}`} className={buttonClass("secondary")}>
                  Learn more
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section className="section pt-20">
        <h2 className="text-3xl font-bold">Coming next</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {comingNext.map((c) => (
            <div key={c.title} className="border-t-4 border-tea pt-4">
              <h3 className="text-2xl font-bold">{c.title}</h3>
              <p className="mt-2 text-ink-soft">{c.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
