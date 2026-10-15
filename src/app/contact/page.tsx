import type { Metadata } from "next";
import { org } from "@/content/site";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <>
      <PageHero title="Contact us" intro="Questions about giving, membership, partnerships or the project? We'll find your answer." />
      <section className="section grid gap-8 pt-14 md:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Email</h2>
          <a href={`mailto:${org.email}`} className="mt-2 block font-semibold text-tea underline underline-offset-4">
            {org.email}
          </a>
          <p className="mt-2 text-sm text-ink-soft">Address to be confirmed with the domain.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Your class or region</h2>
          <p className="mt-2 text-ink-soft">Your class champion or regional rep can help with most questions about joining and events.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">The school</h2>
          <p className="mt-2 text-ink-soft">Menyenya SDA High School. Postal address and directions to be confirmed.</p>
        </div>
      </section>
    </>
  );
}
