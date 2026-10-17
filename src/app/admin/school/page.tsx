import type { Metadata } from "next";
import Link from "next/link";
import { getStaff } from "@/lib/admin/staff";
import { movePriority, setPriorityStatus } from "@/app/admin/actions";
import { PriorityForm, ResultForm, SchoolStatsForm } from "@/components/admin/school-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "The school" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
const whole = new Intl.NumberFormat("en-KE");

type Props = { searchParams: Promise<{ edit?: string; saved?: string }> };

export default async function AdminSchoolPage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff?.canEditSchool) return <p>Only administrators and the school liaison can change the school&rsquo;s figures.</p>;
  const q = await searchParams;
  const db = staff.supabase;
  const [{ data: stats }, { data: results }, { data: priorities }, { data: views }] = await Promise.all([
    db.from("school_stats").select("*").order("as_of", { ascending: false }).order("created_at", { ascending: false }).limit(8),
    db.from("academic_results").select("*").order("year", { ascending: false }),
    db.from("school_priorities").select("*").neq("status", "archived").order("sort_order").order("title"),
    db.from("priority_views").select("priority_id, importance, comment, updated_at").order("updated_at", { ascending: false }).limit(500),
  ]);
  const list = (priorities ?? []) as { id: string; title: string; description: string; status: string }[];
  const allViews = (views ?? []) as { priority_id: string; importance: number; comment: string; updated_at: string }[];
  const summary = (id: string) => {
    const v = allViews.filter((x) => x.priority_id === id);
    return { n: v.length, avg: v.length ? Math.round((v.reduce((s, x) => s + x.importance, 0) / v.length) * 10) / 10 : null, comments: v.filter((x) => x.comment) };
  };
  const editing = q.edit ? list.find((p) => p.id === q.edit) : undefined;
  const last = stats?.[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">The school</h1>
        <p className="text-muted-foreground">Figures, results and priorities that members see on their dashboard and on &ldquo;The school today&rdquo;.</p>
      </div>
      {q.saved && <p role="status" className="rounded-md bg-secondary p-4 font-semibold">Saved. Members see the change straight away.</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">The school&rsquo;s figures</CardTitle>
          <CardDescription>Each update is kept as history; members see the latest. Counts only, never names of students.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SchoolStatsForm last={last ? { students: last.students, needy: last.needy_students, supported: last.supported_by_alumni, teachers: last.teachers } : null} />
          {(stats ?? []).length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>As of</TableHead><TableHead>Students</TableHead><TableHead>In need</TableHead><TableHead>Supported</TableHead><TableHead>Teachers</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
              <TableBody>
                {(stats ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{dateFormat.format(new Date(s.as_of))}</TableCell>
                    <TableCell>{whole.format(s.students)}</TableCell>
                    <TableCell>{s.needy_students ?? "—"}</TableCell>
                    <TableCell>{s.supported_by_alumni ?? "—"}</TableCell>
                    <TableCell>{s.teachers ?? "—"}</TableCell>
                    <TableCell className="max-w-64 truncate">{s.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Academic performance</CardTitle>
          <CardDescription>One line per year. Saving a year that already exists corrects it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ResultForm />
          {(results ?? []).length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Year</TableHead><TableHead>Measure</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead><TableHead>Candidates</TableHead></TableRow></TableHeader>
              <TableBody>
                {(results ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.year}</TableCell><TableCell>{r.measure}</TableCell><TableCell>{r.value}</TableCell>
                    <TableCell>{r.grade ?? "—"}</TableCell><TableCell>{r.candidates ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card id="priorities" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-xl">Priorities</CardTitle>
          <CardDescription>In the order members see them. Members rate each from 1 (not important) to 5 (most urgent) and may comment; comments are shown here without names.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {list.length === 0 ? (
            <p className="text-muted-foreground">No priorities yet.</p>
          ) : (
            <ol className="flex flex-col divide-y rounded-lg border">
              {list.map((p, i) => {
                const s = summary(p.id);
                return (
                  <li key={p.id} className="flex flex-col gap-3 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-ink font-bold text-white">{i + 1}</span>
                      <div className="min-w-40 flex-1">
                        <p className="font-semibold">{p.title} {p.status === "draft" && <Badge variant="outline">Hidden</Badge>}</p>
                        <p className="text-sm text-muted-foreground">{s.n ? `Average ${s.avg}/5 from ${s.n} ${s.n === 1 ? "member" : "members"}` : "No views yet"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={movePriority}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button size="sm" variant="outline" name="direction" value="up" disabled={i === 0} aria-label={`Move ${p.title} up`}>↑</Button>
                          <Button size="sm" variant="outline" name="direction" value="down" disabled={i === list.length - 1} aria-label={`Move ${p.title} down`} className="ml-1">↓</Button>
                        </form>
                        <Button asChild size="sm" variant="outline"><Link href={`/admin/school?edit=${p.id}#priority-form`}>Edit</Link></Button>
                        <form action={setPriorityStatus}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button size="sm" variant="outline" name="status" value={p.status === "draft" ? "published" : "draft"}>{p.status === "draft" ? "Show" : "Hide"}</Button>
                        </form>
                        <form action={setPriorityStatus}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button size="sm" variant="ghost" name="status" value="archived">Remove</Button>
                        </form>
                      </div>
                    </div>
                    {s.comments.length > 0 && (
                      <details className="rounded-md bg-muted/50 p-3 text-sm">
                        <summary className="cursor-pointer font-semibold">{s.comments.length} {s.comments.length === 1 ? "comment" : "comments"}</summary>
                        <ul className="mt-2 flex flex-col gap-2">
                          {s.comments.slice(0, 50).map((c, n) => <li key={n}>&ldquo;{c.comment}&rdquo; <span className="text-muted-foreground">({c.importance}/5)</span></li>)}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          <div id="priority-form" className="scroll-mt-20 rounded-lg border bg-background p-5">
            <h3 className="mb-4 text-lg font-bold">{editing ? `Change: ${editing.title}` : "Add a priority"}</h3>
            <PriorityForm key={editing?.id ?? "new"} initial={editing ? { id: editing.id, title: editing.title, description: editing.description } : { id: "", title: "", description: "" }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
