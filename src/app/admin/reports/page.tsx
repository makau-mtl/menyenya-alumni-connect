import type { Metadata } from "next";
import Link from "next/link";
import { getStaff } from "@/lib/admin/staff";
import { fileSize, reportKinds, type ReportRow } from "@/lib/reports";
import { setReportStatus } from "@/app/admin/actions";
import { ReportDetails, ReportUpload } from "@/components/admin/report-forms";
import { ConfirmAction } from "@/components/portal/confirm-action";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Reports" };

const statusPill: Record<string, { label: string; tone: "good" | "warn" | "muted" }> = {
  draft: { label: "Draft", tone: "warn" },
  published: { label: "Published", tone: "good" },
  replaced: { label: "Earlier version", tone: "muted" },
  archived: { label: "Withdrawn", tone: "muted" },
};

export default async function AdminReportsPage() {
  const staff = await getStaff();
  if (!staff?.canManageReports) return <p>Only the Treasurer, the Chairman and administrators can manage reports.</p>;
  const [{ data }, ...can] = await Promise.all([
    staff.supabase.from("reports").select("id, kind, year, title, summary, file_path, file_size, status, replaces_id, published_at, created_at").order("year", { ascending: false }).order("created_at", { ascending: false }),
    ...["financial", "moral", "other"].map((k) => staff.supabase.rpc("can_publish_report", { p_kind: k })),
  ]);
  const kinds = ["financial", "moral", "other"].filter((_, i) => can[i].data === true);
  const rows = (data ?? []) as ReportRow[];
  const drafts = rows.filter((r) => r.status === "draft");
  const live = rows.filter((r) => r.status === "published");
  const older = rows.filter((r) => r.status === "replaced" || r.status === "archived");

  const Row = ({ r }: { r: ReportRow }) => {
    const mine = kinds.includes(r.kind);
    return (
      <li className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-2 font-semibold">{r.title} <Pill tone={statusPill[r.status].tone}>{statusPill[r.status].label}</Pill></p>
            <p className="text-sm text-muted-foreground">{reportKinds[r.kind].label} · {r.year} · PDF {fileSize(r.file_size)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button asChild size="sm" variant="ghost"><a href={`/reports/${r.id}/file`} target="_blank" rel="noreferrer">Open PDF</a></Button>
            {mine && r.status === "draft" && (
              <ConfirmAction action={setReportStatus} fields={{ id: r.id, status: "published" }} label="Publish" variant="default"
                title={`Publish "${r.title}"?`} description={`It appears on the public Reports and accountability page straight away.${r.replaces_id ? " The earlier version stays available, marked as an earlier version." : ""}`} confirmLabel="Publish" />
            )}
            {mine && (r.status === "published" || r.status === "draft") && (
              <ConfirmAction action={setReportStatus} fields={{ id: r.id, status: "archived" }} label="Withdraw"
                title={`Withdraw "${r.title}"?`} description="It is taken off the website. Nothing is deleted; the record and the PDF are kept." confirmLabel="Withdraw" />
            )}
          </div>
        </div>
        {r.summary && <p className="text-sm text-ink-soft">{r.summary}</p>}
        {mine && (r.status === "draft" || r.status === "published") && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <details className="flex-1 rounded-lg bg-muted/50 p-3 text-sm">
              <summary className="cursor-pointer font-semibold">Correct the title or summary</summary>
              <div className="mt-3"><ReportDetails id={r.id} title={r.title} summary={r.summary} /></div>
            </details>
            {r.status === "published" && <div className="sm:w-80"><ReportUpload kinds={kinds} replaces={r} /></div>}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Reports"
        description="Financial reports (the Treasurer) and the moral report (the Chairman), published on the Reports and accountability page. Money paid out is reported here, not tracked on the platform."
        actions={<Button asChild variant="outline"><Link href="/reports">View the public page</Link></Button>}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="flex flex-col gap-8">
          {drafts.length > 0 && (
            <Panel title="Drafts" tone="attention" description="Only you and the other report publishers can see these.">
              <ul className="flex flex-col divide-y">{drafts.map((r) => <Row key={r.id} r={r} />)}</ul>
            </Panel>
          )}
          <Panel title="Published">
            {live.length ? <ul className="flex flex-col divide-y">{live.map((r) => <Row key={r.id} r={r} />)}</ul> : <Empty>No reports published yet.</Empty>}
          </Panel>
          {older.length > 0 && (
            <Panel title="Earlier versions and withdrawn" tone="quiet">
              <ul className="flex flex-col divide-y">{older.map((r) => <Row key={r.id} r={r} />)}</ul>
            </Panel>
          )}
        </div>
        <Panel title="Upload a report">
          {kinds.length ? <ReportUpload kinds={kinds} /> : <Empty>Your role can&rsquo;t upload reports.</Empty>}
        </Panel>
      </div>
    </div>
  );
}
