import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { PageHeader } from "@/components/portal/page-parts";

export const metadata: Metadata = { title: "Cohorts" };

export default async function CohortsPage() {
  const member = await getMember();
  if (!member?.registered) redirect("/login?next=/app/cohorts");
  const [{ data }, { data: mine }] = await Promise.all([
    member.supabase.rpc("community_breakdown"),
    member.supabase.from("member_profiles").select("year_left").eq("person_id", member.personId!).single(),
  ]);
  const classes = ((data as { classes: { year: number; count: number }[] } | null)?.classes ?? []);
  const decades = [...new Set(classes.map((c) => Math.floor(c.year / 10) * 10))];
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Cohorts" title="Every cohort" description="Each year group has its own page with its members, cohort rep, meet-ups and memories." />
      {decades.map((d) => (
        <section key={d}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">{d}s</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {classes.filter((c) => Math.floor(c.year / 10) * 10 === d).map((c) => (
              <li key={c.year}>
                <Link href={`/app/cohorts/${c.year}`} className={`flex flex-col rounded-xl p-4 ring-1 transition hover:ring-tea ${c.year === mine?.year_left ? "bg-tea text-white ring-tea" : "bg-card ring-border"}`}>
                  <span className="font-display text-2xl font-bold">{c.year}</span>
                  <span className={`text-sm ${c.year === mine?.year_left ? "text-white/85" : "text-muted-foreground"}`}>{c.count} {c.count === 1 ? "member" : "members"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
