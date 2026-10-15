import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCause } from "@/lib/data";
import { PledgeForm } from "./pledge-form";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cause = await getCause((await params).slug);
  return cause ? { title: `Pledge to ${cause.title.toLowerCase()}` } : {};
}

const allowedTypes = ["monthly", "quarterly", "annual", "one_time", "in_kind"];

export default async function PledgePage({ params, searchParams }: Props) {
  const cause = await getCause((await params).slug);
  if (!cause || !cause.pledgesEnabled) notFound();
  const q = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const type = allowedTypes.includes(first(q.type)) ? first(q.type) : "monthly";
  const initial = {
    type,
    amount: /^\d+$/.test(first(q.amount)) ? first(q.amount) : "2500",
    periods: /^\d+$/.test(first(q.periods)) ? first(q.periods) : "36",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10">
      <Link href={`/causes/${cause.slug}`} className="text-[0.95rem] text-tea underline underline-offset-4">
        Back to {cause.title.toLowerCase()}
      </Link>
      <h1 className="mt-4 text-4xl font-bold">Pledge to {cause.title.toLowerCase()}</h1>
      <p className="mt-3 text-ink-soft">
        Commit an amount now and pay over time. No account needed; you can track your pledge with your reference.
      </p>
      <div className="mt-10">
        <PledgeForm causeSlug={cause.slug} initial={initial} founding={cause.lifecycle === "preparation"} />
      </div>
    </div>
  );
}
