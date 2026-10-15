import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCause, getChannelForCause, listCauses } from "@/lib/data";
import { GiveForm } from "./give-form";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listCauses()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const cause = await getCause((await params).slug);
  return cause ? { title: `Give to ${cause.title.toLowerCase()}` } : {};
}

export default async function GivePage({ params }: Params) {
  const cause = await getCause((await params).slug);
  if (!cause) notFound();
  const channel = await getChannelForCause(cause);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10">
      <Link href={`/causes/${cause.slug}`} className="text-[0.95rem] text-tea underline underline-offset-4">
        Back to {cause.title.toLowerCase()}
      </Link>
      <h1 className="mt-4 text-4xl font-bold">Give to {cause.title.toLowerCase()}</h1>
      <p className="mt-3 text-ink-soft">No account needed. It takes about a minute.</p>
      <div className="mt-8">
        <GiveForm
          causeSlug={cause.slug}
          presets={cause.presetAmounts}
          periods={cause.recurringPeriods}
          accountName={channel.accountDisplayName}
        />
      </div>
      {cause.pledgesEnabled && (
        <p className="mt-10 border-t border-line pt-6 text-ink-soft">
          Prefer to commit an amount and pay over time?{" "}
          <Link href={`/pledge/${cause.slug}`} className="font-semibold text-tea underline underline-offset-4">
            Make a pledge instead
          </Link>
        </p>
      )}
    </div>
  );
}
