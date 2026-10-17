/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { getStaff } from "@/lib/admin/staff";
import { updateFeedback } from "@/app/admin/actions";
import { Empty, PageHeader, Panel, Pill, StatTiles } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Feedback" };

type Row = { id: string; page: string; what_happened: string; expected: string; severity: string; device: string; screenshot_path: string | null; status: string; admin_note: string; created_at: string; persons: { full_name: string } | null };
const severity: Record<string, { label: string; tone: "bad" | "warn" | "info" }> = {
  blocks: { label: "Stops them", tone: "bad" }, annoying: { label: "Annoying", tone: "warn" }, idea: { label: "Idea", tone: "info" },
};
const statuses: Record<string, string> = { new: "New", agreed: "Agreed", fixed: "Fixed", wont_do: "Won't do" };
const when = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Nairobi" });

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can see feedback.</p>;
  const show = (await searchParams).show ?? "open";
  const { data } = await staff.supabase
    .from("feedback")
    .select("id, page, what_happened, expected, severity, device, screenshot_path, status, admin_note, created_at, persons(full_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  const all = (data ?? []) as unknown as Row[];
  const rows = all.filter((r) => show === "all" || (show === "open" ? r.status === "new" || r.status === "agreed" : r.status === show));
  const paths = rows.map((r) => r.screenshot_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length ? await staff.supabase.storage.from("feedback").createSignedUrls(paths, 3600) : { data: [] };
  const shot = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const count = (s: string) => all.filter((r) => r.status === s).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Administration" title="Feedback" description="What testers and officials report with the Give feedback button. Mark each one Agreed, Fixed or Won't do." />
      <StatTiles items={[
        { label: "New", value: String(count("new")), href: "/admin/feedback?show=new" },
        { label: "Agreed, to fix", value: String(count("agreed")), href: "/admin/feedback?show=agreed" },
        { label: "Fixed", value: String(count("fixed")), href: "/admin/feedback?show=fixed" },
        { label: "Stops someone", value: String(all.filter((r) => r.severity === "blocks" && (r.status === "new" || r.status === "agreed")).length) },
      ]} />
      <div className="flex flex-wrap gap-2">
        {[["open", "Open"], ["new", "New"], ["agreed", "Agreed"], ["fixed", "Fixed"], ["wont_do", "Won't do"], ["all", "All"]].map(([k, l]) => (
          <Button key={k} asChild size="sm" variant={show === k ? "default" : "outline"}><Link href={`/admin/feedback?show=${k}`}>{l}</Link></Button>
        ))}
      </div>
      <Panel>
        {rows.length === 0 ? <Empty>Nothing here.</Empty> : (
          <ul className="flex flex-col divide-y">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-4 py-4 lg:grid-cols-[1fr_18rem]">
                <div className="flex flex-col gap-2">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Pill tone={severity[r.severity].tone}>{severity[r.severity].label}</Pill>
                    <Pill tone={r.status === "fixed" ? "good" : "muted"}>{statuses[r.status]}</Pill>
                    <span className="text-muted-foreground">{r.persons?.full_name} · {when.format(new Date(r.created_at))} · </span>
                    <a href={r.page} target="_blank" rel="noreferrer" className="font-mono text-xs text-tea underline">{r.page}</a>
                  </p>
                  <p className="whitespace-pre-line">{r.what_happened}</p>
                  {r.expected && <p className="whitespace-pre-line text-sm text-muted-foreground"><span className="font-semibold">Expected:</span> {r.expected}</p>}
                  {r.screenshot_path && shot.get(r.screenshot_path) && (
                    <a href={shot.get(r.screenshot_path)!} target="_blank" rel="noreferrer"><img src={shot.get(r.screenshot_path)!} alt="Screenshot" className="max-h-48 rounded-lg ring-1 ring-border" /></a>
                  )}
                  <p className="text-xs text-muted-foreground">{r.device}</p>
                </div>
                <form action={updateFeedback} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} aria-label="Status" className={`${inputClass} py-1.5 text-sm`}>
                    {Object.entries(statuses).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <textarea name="note" defaultValue={r.admin_note} rows={2} placeholder="Note (only administrators see this)" aria-label="Note" className={`${inputClass} text-sm`} />
                  <Button size="sm" variant="outline" className="self-start">Save</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
