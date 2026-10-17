import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { BarList } from "@/components/portal/bar-list";
import { PriorityView } from "@/components/member/priority-view";

export const metadata: Metadata = { title: "The school today" };

const whole = new Intl.NumberFormat("en-KE");

export default async function SchoolPage() {
  const member = await getMember();
  if (!member?.registered) redirect("/login?next=/app/school");
  const db = member.supabase;
  const [{ data: stats }, { data: results }, { data: priorities }] = await Promise.all([
    db.from("school_stats").select("as_of, students, needy_students, supported_by_alumni, teachers, note").order("as_of", { ascending: false }).order("created_at", { ascending: false }).limit(1),
    db.from("academic_results").select("year, measure, value, grade, candidates, note").order("year", { ascending: true }),
    db.rpc("priority_summary"),
  ]);
  const s = stats?.[0];
  const res = (results ?? []) as { year: number; measure: string; value: number; grade: string | null; candidates: number | null }[];
  const pri = (priorities ?? []) as { id: string; title: string; description: string; responses: number; average: number | null; my_importance: number | null; my_comment: string | null }[];
  const fmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });

  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">Menyenya SDA High School</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">The school today</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Figures shared by the school, and the priorities the association is working on with it. Tell us how important each one is to you.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Students", s?.students],
          ["Students in need", s?.needy_students],
          ["Supported by alumni", s?.supported_by_alumni],
          ["Teachers", s?.teachers],
        ].map(([label, v]) => (
          <div key={String(label)} className="rounded-xl bg-card p-4 ring-1 ring-border">
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 font-display text-3xl font-bold">{typeof v === "number" ? whole.format(v) : "—"}</p>
          </div>
        ))}
        <p className="col-span-full text-sm text-muted-foreground">
          {s ? `As of ${fmt.format(new Date(s.as_of))}.${s.note ? ` ${s.note}` : ""}` : "The school's figures will be added soon."}
        </p>
      </section>

      <section id="priorities" className="scroll-mt-28">
        <h2 className="text-2xl font-bold sm:text-3xl">The school&rsquo;s priorities</h2>
        <p className="mt-1 text-ink-soft">In order. Your view helps the association decide where to focus.</p>
        {pri.length === 0 ? (
          <p className="mt-6 rounded-xl border-2 border-dashed border-border p-6 text-muted-foreground">The priorities will be published here.</p>
        ) : (
          <ol className="mt-6 flex flex-col gap-4">
            {pri.map((x, i) => (
              <li key={x.id}>
                <Card className="gap-2">
                  <CardHeader className="flex flex-row items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-white">{i + 1}</span>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{x.title}</CardTitle>
                      {x.description && <CardDescription className="mt-1 text-base">{x.description}</CardDescription>}
                      <p className="mt-2 text-sm text-muted-foreground">
                        {Number(x.responses) ? `Members rate it ${x.average}/5 on average (${x.responses} ${Number(x.responses) === 1 ? "view" : "views"}).` : "No views yet. Be the first."}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="pl-[4.5rem]">
                    <PriorityView id={x.id} importance={x.my_importance} comment={x.my_comment} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold sm:text-3xl">Academic performance</h2>
        <Card className="mt-6 max-w-2xl gap-4">
          <CardHeader>
            <CardTitle className="text-lg">{res.at(-1)?.measure ?? "Results"} by year</CardTitle>
          </CardHeader>
          <CardContent>
            {res.length ? (
              <BarList rows={res.map((r) => ({ label: `${r.year}${r.grade ? ` (${r.grade})` : ""}`, value: Number(r.value) }))} />
            ) : (
              <p className="text-muted-foreground">Results will be added here.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
