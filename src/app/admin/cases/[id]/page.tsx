import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaff } from "@/lib/admin/staff";
import { handlerReply } from "@/app/admin/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";
import { kindInfo, statusInfo } from "@/lib/cases";

export const metadata: Metadata = { title: "Case" };

const when = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const staff = await getStaff();
  if (!staff?.canHandleCases) return <p>Only the people who handle cases can see this.</p>;
  const { data: c } = await staff.supabase
    .from("support_cases")
    .select("id, reference, kind, title, details, help_needed, may_share, status, created_at, person_id")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  await staff.supabase.rpc("log_case_view", { p_case: id });
  const [{ data: thread }, { data: raiser }] = await Promise.all([
    staff.supabase.rpc("case_thread", { p_case: id }),
    staff.supabase.rpc("cases_for_handler", { p_status: null }),
  ]);
  const by = ((raiser ?? []) as { id: string; raised_by: string; year_left: number | null }[]).find((r) => r.id === id);
  const updates = (thread ?? []) as { id: string; author_name: string; from_handler: boolean; body: string; visible_to_raiser: boolean; created_at: string }[];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/admin/cases" className="text-sm font-semibold text-tea hover:underline">← All cases</Link>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{c.reference}</span>
            <Badge className={statusInfo[c.status].tone}>{statusInfo[c.status].label}</Badge>
            <Badge variant="outline">{kindInfo[c.kind]}</Badge>
            {c.may_share ? <Badge variant="outline">May be shared to rally support</Badge> : <Badge variant="outline">Keep private</Badge>}
          </div>
          <CardTitle className="text-2xl">{c.title}</CardTitle>
          <CardDescription>Raised by {by?.raised_by ?? "a member"}{by?.year_left ? `, Class of ${by.year_left}` : ""} · {when.format(new Date(c.created_at))}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="whitespace-pre-line">{c.details}</p>
          {c.help_needed && (
            <div className="rounded-lg bg-muted p-3"><p className="text-sm font-semibold">Help needed</p><p className="whitespace-pre-line">{c.help_needed}</p></div>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Conversation</h2>
        {updates.length === 0 && <p className="text-muted-foreground">No replies yet.</p>}
        {updates.map((u) => (
          <div key={u.id} className={`rounded-lg p-3 ${!u.visible_to_raiser ? "border-2 border-dashed border-gold bg-gold-tint/50" : u.from_handler ? "bg-secondary" : "bg-card ring-1 ring-border"}`}>
            <p className="text-sm font-semibold">
              {u.author_name}{!u.visible_to_raiser ? " · internal note" : u.from_handler ? "" : " (raised the case)"}
              <span className="font-normal text-muted-foreground"> · {when.format(new Date(u.created_at))}</span>
            </p>
            <p className="whitespace-pre-line">{u.body}</p>
          </div>
        ))}
      </section>

      <Card>
        <CardHeader><CardTitle className="text-lg">Reply or update</CardTitle></CardHeader>
        <CardContent>
          <form action={handlerReply} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={c.id} />
            <textarea name="body" rows={4} maxLength={4000} placeholder="Write to the member, or a note for the team" className={inputClass} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="internal" className="size-4 accent-tea" /> Internal note (the member won&rsquo;t see it)
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Status
                <select name="status" defaultValue={c.status === "submitted" ? "under_review" : c.status} className={`${inputClass} w-48`}>
                  <option value="under_review">Being reviewed</option>
                  <option value="responded">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
