import { CheckCircle2, ShieldCheck } from "lucide-react";
import { bursaryEligibility, bursaryMoney, bursaryProcess } from "@/content/bursary";
import { formatKes } from "@/lib/money";
import type { PublicFigures } from "@/lib/figures";

const n = new Intl.NumberFormat("en-KE");
const TBC = <span className="rounded bg-gold-tint px-1.5 py-0.5 text-sm font-semibold text-ink">to be confirmed</span>;

/** The need: live from the school's figures; anything not yet given by the school says "to be confirmed". */
export function BursaryNeed({ f }: { f: PublicFigures | null }) {
  const tiles = [
    { value: f?.needy_admitted_per_year != null ? n.format(f.needy_admitted_per_year) : null, label: "students admitted each year, on average, who need help with fees" },
    { value: f?.needy_students != null && f.students ? `${n.format(f.needy_students)} of ${n.format(f.students)}` : null, label: "students at Menyenya today who need help with fees" },
    { value: f?.annual_fee_kes ? formatKes(f.annual_fee_kes) : null, label: `school fees for a year${f?.fees_year ? ` (${f.fees_year})` : ""}` },
  ];
  return (
    <section>
      <h2 className="text-3xl font-bold">The need</h2>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-ink p-5 text-white">
            <dd className="font-display text-3xl font-bold">{t.value ?? <span className="text-xl text-gold">To be confirmed</span>}</dd>
            <dt className="mt-2 text-sm text-white/80">{t.label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-soft">Figures from the school{f?.school_as_of ? `, updated ${new Date(f.school_as_of).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}` : ""}. Students are never named.</p>
    </section>
  );
}

/** What a gift does, in fees. Shown once the school confirms the fees. */
export function BursaryGiftValue({ f }: { f: PublicFigures | null }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="text-2xl font-bold">What your gift does</h2>
      <ul className="mt-4 flex flex-col gap-3">
        <li><span className="font-semibold">{f?.term_fee_kes ? formatKes(f.term_fee_kes) : TBC}</span> keeps a student in class for a term.</li>
        <li><span className="font-semibold">{f?.annual_fee_kes ? formatKes(f.annual_fee_kes) : TBC}</span> keeps a student in class for a whole year.</li>
        <li>Every smaller gift adds up: many alumni giving a little each month fund bursaries together.</li>
      </ul>
      {f?.fees_year && <p className="mt-3 text-xs text-ink-soft">{f.fees_year} fees, as given by the school.</p>}
    </section>
  );
}

export function BursaryHow() {
  return (
    <>
      <section>
        <h2 className="text-3xl font-bold">Who qualifies</h2>
        <ul className="mt-5 flex max-w-prose flex-col gap-3">
          {bursaryEligibility.map((e) => (
            <li key={e} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-tea" aria-hidden /> {e}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-3xl font-bold">How students are chosen</h2>
        <p className="mt-3 max-w-prose text-ink-soft">A careful, fair process, run with the school. Every case is vetted before a bursary is awarded.</p>
        <ol className="mt-6 grid gap-5 sm:grid-cols-2">
          {bursaryProcess.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-card p-5 ring-1 ring-line">
              <span className="flex size-8 items-center justify-center rounded-full bg-tea font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="text-3xl font-bold">Where the money goes</h2>
        <ul className="mt-5 flex max-w-prose flex-col gap-3">
          {bursaryMoney.map((m) => (
            <li key={m} className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-tea" aria-hidden /> {m}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
