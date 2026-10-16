import Link from "next/link";
import type { Metadata } from "next";
import { getCauseProgress, getCoverPhotos, listCauses } from "@/lib/data";
import { formatKesShort } from "@/lib/money";
import { ImageSlot } from "@/components/media";

export const metadata: Metadata = { title: "Donate", description: "Choose where your gift goes." };

const images: Record<string, string> = {
  "tuition-block": "the planned tuition block",
  "keep-a-child-in-school": "a student in class",
  "alumni-fund": "alumni and students together",
};

// Progress figures refresh at least once a minute; pledges also refresh them straight away.
export const revalidate = 60;

export default async function DonatePage() {
  const [causes, covers] = await Promise.all([listCauses(), getCoverPhotos()]);
  const progress = await getCauseProgress("tuition-block");

  return (
    <div className="section pt-12 lg:pt-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold sm:text-5xl">Choose where your gift goes</h1>
        <p className="mt-4 text-lg text-ink-soft">
          No account needed. It takes about a minute, and you get a reference and a receipt.
        </p>
      </div>

      <ul className="mt-10 grid gap-6 md:grid-cols-3">
        {causes.map((c) => (
          <li key={c.slug} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
            <ImageSlot caption={images[c.slug] ?? c.title.toLowerCase()} photo={covers[c.slug]} ratio="landscape" className="rounded-none" sizes="(min-width: 768px) 33vw, 100vw" />
            <div className="flex flex-1 flex-col p-6">
              <h2 className="text-2xl font-bold">{c.title}</h2>
              <p className="mt-2 flex-1 text-ink-soft">{c.summary}</p>
              {c.targetAmount && (
                <p className="mt-4 text-sm">
                  <strong>{formatKesShort(progress.pledged)}</strong> pledged of {formatKesShort(c.targetAmount)}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/give/${c.slug}`}
                  className="rounded-md bg-gold px-5 py-2.5 font-bold text-ink hover:bg-[#f0b95f]"
                >
                  Give to this
                </Link>
                {c.pledgesEnabled && (
                  <Link href={`/pledge/${c.slug}`} className="rounded-md border-2 border-ink px-4 py-2 font-semibold">
                    Pledge
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 rounded-lg bg-tea-tint p-5">
        <strong>Your gift is protected.</strong> Tuition block gifts go to the school Board of Management&rsquo;s project
        account. We never ask anyone to send money to a personal phone number.
      </p>
    </div>
  );
}
