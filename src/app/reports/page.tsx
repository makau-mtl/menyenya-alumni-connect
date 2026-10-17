import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Landmark, ReceiptText, ScrollText } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { getCauseProgress } from "@/lib/data";
import { formatKes } from "@/lib/money";
import { fileSize, reportKinds, type ReportRow } from "@/lib/reports";
import { PageHero } from "@/components/page-hero";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Reports and accountability",
  description: "Where your money goes: how gifts are handled, the association's financial reports and the Chairman's moral report.",
};

export const revalidate = 300;

const principles = [
  { icon: Landmark, title: "Gifts go straight to institutional accounts", text: "Never to a person. Tuition block gifts go to the school Board of Management's project account; other gifts go to the association's account. This website records gifts; it never holds money." },
  { icon: ReceiptText, title: "Every gift is recorded and acknowledged", text: "When an M-Pesa payment through the official Paybill is confirmed, it is recorded against the right fund and the giver gets a receipt. Pledges show what has been paid." },
  { icon: ScrollText, title: "Spending is reported every year", text: "What each fund pays out (to the school, contractors and for bursaries) is set out in the Treasurer's financial statements, alongside the Chairman's moral report on the year's work." },
];

async function loadReports() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("reports")
    .select("id, kind, year, title, summary, file_path, file_size, status, replaces_id, published_at, created_at")
    .in("status", ["published", "replaced"])
    .order("year", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) console.error("Could not read reports", error);
  return (data ?? []) as ReportRow[];
}

export default async function ReportsPage() {
  const [rows, tuition] = await Promise.all([loadReports(), getCauseProgress("tuition-block").catch(() => null)]);
  const published = rows.filter((r) => r.status === "published");
  const earlier = new Map<string, ReportRow>();
  for (const r of rows) if (r.status === "replaced") earlier.set(r.id, r);
  const years = [...new Set(published.map((r) => r.year))];

  return (
    <>
      <PageHero
        title="Reports and accountability"
        intro="Where your money goes. Every gift is recorded, every fund is accounted for, and we report back to members and supporters each year."
      />

      <section className="section pt-14">
        <div className="grid gap-6 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="rounded-2xl bg-card p-6 ring-1 ring-line">
              <p.icon className="size-7 text-tea" aria-hidden />
              <h2 className="mt-4 text-xl font-bold">{p.title}</h2>
              <p className="mt-2 text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {tuition && (tuition.pledged > 0 || tuition.received > 0) && (
        <section className="section pt-14">
          <div className="flex flex-col gap-6 rounded-2xl bg-ink p-8 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold">The tuition block, recorded so far</p>
              <p className="mt-2 max-w-xl text-white/75">Pledges and confirmed gifts, live from the platform. Spending is reported in the financial statements.</p>
            </div>
            <dl className="flex gap-10">
              <div><dt className="text-sm text-white/70">Pledged</dt><dd className="font-display text-3xl font-bold">{formatKes(tuition.pledged)}</dd></div>
              <div><dt className="text-sm text-white/70">Received through the platform</dt><dd className="font-display text-3xl font-bold">{formatKes(tuition.received)}</dd></div>
            </dl>
          </div>
        </section>
      )}

      <section className="section pt-16">
        <h2 className="text-3xl font-bold sm:text-4xl">Annual reports</h2>
        {years.length === 0 ? (
          <div className="mt-8 rounded-2xl border-2 border-dashed border-line p-8">
            <h3 className="text-xl font-bold">Our first reports will be published here</h3>
            <p className="mt-2 max-w-2xl text-ink-soft">
              After the association&rsquo;s first financial year, the Treasurer will publish the financial statements and the
              Chairman the moral report on the year&rsquo;s work. Both will stay here for anyone to read.
            </p>
          </div>
        ) : (
          years.map((year) => (
            <div key={year} className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">{year}</h3>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {published.filter((r) => r.year === year).map((r) => {
                  const prev = r.replaces_id ? earlier.get(r.replaces_id) : undefined;
                  return (
                    <li key={r.id} className="flex flex-col rounded-2xl bg-card p-6 ring-1 ring-line">
                      <p className="flex items-center gap-2 text-sm font-semibold text-tea"><FileText className="size-4" aria-hidden /> {reportKinds[r.kind].label}</p>
                      <h4 className="mt-2 text-xl font-bold">{r.title}</h4>
                      {r.summary && <p className="mt-2 whitespace-pre-line text-ink-soft">{r.summary}</p>}
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <a href={`/reports/${r.id}/file`} target="_blank" rel="noreferrer" className={buttonClass("primary", "sm")}>Read the report</a>
                        <a href={`/reports/${r.id}/file?download=1`} className={buttonClass("quiet")}>Download PDF {r.file_size ? `(${fileSize(r.file_size)})` : ""}</a>
                      </div>
                      {prev && (
                        <p className="mt-4 text-sm text-ink-soft">
                          Replaces an earlier version: <a href={`/reports/${prev.id}/file`} className="underline">{prev.title}</a>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="section pt-16">
        <div className="flex flex-col items-start gap-4 rounded-3xl bg-surface p-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-lg">Questions about a report or a gift? The Treasurer is happy to explain.</p>
          <Link href="/contact" className={buttonClass("secondary")}>Contact us</Link>
        </div>
      </section>
    </>
  );
}
