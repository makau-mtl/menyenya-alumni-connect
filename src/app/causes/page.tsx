import Link from "next/link";
import type { Metadata } from "next";
import { listCauses } from "@/lib/data";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Causes" };

const kindLabel = {
  campaign: "Campaign",
  ongoing_fund: "Ongoing fund",
  general: "General fund",
  appeal: "Appeal",
} as const;

export default async function CausesPage() {
  const causes = await listCauses();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12">
      <h1 className="text-4xl font-bold">Causes</h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        Choose where your gift goes. Each cause has its own fund, and every shilling is recorded and reported.
      </p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {causes.map((c) => (
          <li key={c.slug} className="grid gap-4 py-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="max-w-prose">
              <p className="text-sm text-ink-soft">{kindLabel[c.kind]}</p>
              <h2 className="mt-1 text-2xl font-bold">
                <Link href={`/causes/${c.slug}`} className="hover:text-tea">
                  {c.title}
                </Link>
              </h2>
              <p className="mt-2 text-ink-soft">{c.summary}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/causes/${c.slug}`} className={buttonClass("secondary", "sm")}>
                Read more
              </Link>
              <Link href={`/give/${c.slug}`} className={buttonClass("primary", "sm")}>
                Give
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
