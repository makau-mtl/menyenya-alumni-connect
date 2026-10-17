import type { Metadata } from "next";
import Link from "next/link";
import { getStaff } from "@/lib/admin/staff";
import { Card, CardContent } from "@/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { kindInfo, statusInfo } from "@/lib/cases";
import { PageHeader } from "@/components/portal/page-parts";

export const metadata: Metadata = { title: "Cases for support" };

const when = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });

type Props = { searchParams: Promise<{ show?: string }> };

export default async function CasesPage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff?.canHandleCases) return <p>Only the people who handle cases can see this.</p>;
  const q = await searchParams;
  const { data } = await staff.supabase.rpc("cases_for_handler", { p_status: q.show === "all" ? null : "open" });
  const rows = (data ?? []) as { id: string; reference: string; kind: string; title: string; status: string; raised_by: string; year_left: number | null; created_at: string; updated_at: string; updates: number }[];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Cases for support"
        description="Cases you handle. Opening a case is recorded. Keep details within the team."
        actions={<Button asChild variant="outline"><Link href={q.show === "all" ? "/admin/cases" : "/admin/cases?show=all"}>{q.show === "all" ? "Open cases only" : "Include closed"}</Link></Button>}
      />
      <Card>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No cases to show.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Case</TableHead><TableHead>Kind</TableHead><TableHead>Raised by</TableHead><TableHead>Status</TableHead><TableHead>Last activity</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.reference}</TableCell>
                    <TableCell><Link href={`/admin/cases/${r.id}`} className="font-semibold text-tea hover:underline">{r.title}</Link></TableCell>
                    <TableCell>{kindInfo[r.kind]}</TableCell>
                    <TableCell>{r.raised_by}{r.year_left ? ` (${r.year_left})` : ""}</TableCell>
                    <TableCell><Badge className={statusInfo[r.status].tone}>{statusInfo[r.status].label}</Badge></TableCell>
                    <TableCell>{when.format(new Date(r.updated_at))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
