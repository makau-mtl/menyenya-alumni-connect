import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/admin/staff";
import { formatKes, formatKesShort } from "@/lib/money";
import { Empty, PageHeader, Panel, Pill, StatTiles } from "@/components/portal/page-parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";

export const metadata: Metadata = { title: "Overview" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
const typeLabel: Record<string, string> = {
  one_time: "One amount", monthly: "Monthly", quarterly: "Every 3 months", annual: "Yearly", in_kind: "In kind",
  once: "Once", annually: "Yearly",
};

type PledgeRow = {
  reference: string; created_at: string; pledge_type: string; total_amount: number | null; is_founding: boolean;
  in_kind_description: string | null; causes: { title: string } | null; persons: { full_name: string } | null;
};
type GiftRow = {
  reference: string; created_at: string; amount: number; frequency: string; status: string;
  causes: { title: string } | null; persons: { full_name: string } | null;
};

export default async function AdminPage() {
  const staff = await getStaff();
  if (!staff) return null; // the layout handles signed-out and unconnected states
  if (!staff.isFinance) redirect(staff.isAdmin ? "/admin/members" : staff.canEditNews ? "/admin/news" : "/admin/duplicates");
  const { supabase, isAdmin } = staff;

  const [progress, pledges, gifts, members, duplicates] = await Promise.all([
    supabase.rpc("cause_progress", { p_slug: "tuition-block" }).single(),
    supabase
      .from("pledges")
      .select("reference, created_at, pledge_type, total_amount, is_founding, in_kind_description, causes(title), persons(full_name)")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("donations")
      .select("reference, created_at, amount, frequency, status, causes(title), persons(full_name)")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase.from("member_profiles").select("id", { count: "exact", head: true }),
    isAdmin
      ? supabase.from("duplicate_flags").select("id", { count: "exact", head: true }).eq("status", "open")
      : Promise.resolve({ count: null }),
  ]);

  const p = progress.data as { pledged: number; received: number; pledge_count: number } | null;
  const pledgeRows = (pledges.data ?? []) as unknown as PledgeRow[];
  const giftRows = (gifts.data ?? []) as unknown as GiftRow[];

  const stats = [
    { label: "Tuition block pledged", value: p ? formatKesShort(Number(p.pledged)) : "—" },
    { label: "Tuition block pledges", value: p ? String(p.pledge_count) : "—" },
    { label: "Payments received", value: p ? formatKesShort(Number(p.received)) : "—" },
    { label: "Registered members", value: String(members.count ?? 0) },
    ...(isAdmin ? [{ label: "Possible duplicates to check", value: String(duplicates.count ?? 0) }] : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Administration" title="Overview" description="Pledges and gifts recorded on the platform, and the latest activity." />
      <StatTiles
        className="lg:grid-cols-5"
        items={stats.map((s) => ({
          ...s,
          href: s.label === "Registered members" ? "/admin/members" : s.label.startsWith("Possible") ? "/admin/duplicates" : undefined,
        }))}
      />

      <Panel title="Latest pledges">
        {pledgeRows.length === 0 ? (
          <Empty>No pledges recorded online yet. The plenary&rsquo;s founding pledges are counted in the totals above.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Reference</TableHead><TableHead>Name</TableHead><TableHead>Cause</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {pledgeRows.map((r) => (
                <TableRow key={r.reference}>
                  <TableCell className="font-semibold">{r.reference}{r.is_founding && <span className="ml-2"><Pill tone="warn">Founding</Pill></span>}</TableCell>
                  <TableCell>{r.persons?.full_name}</TableCell>
                  <TableCell>{r.causes?.title}</TableCell>
                  <TableCell>{typeLabel[r.pledge_type] ?? r.pledge_type}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total_amount === null ? r.in_kind_description : formatKes(Number(r.total_amount))}</TableCell>
                  <TableCell>{dateFormat.format(new Date(r.created_at))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <Panel title="Latest gifts">
        {giftRows.length === 0 ? (
          <Empty>No gifts recorded online yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Reference</TableHead><TableHead>Name</TableHead><TableHead>Cause</TableHead><TableHead>How often</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {giftRows.map((r) => (
                <TableRow key={r.reference}>
                  <TableCell className="font-semibold">{r.reference}</TableCell>
                  <TableCell>{r.persons?.full_name}</TableCell>
                  <TableCell>{r.causes?.title}</TableCell>
                  <TableCell>{typeLabel[r.frequency] ?? r.frequency}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKes(Number(r.amount))}</TableCell>
                  <TableCell>{r.status === "initiated" ? <Pill tone="warn">Awaiting payment</Pill> : <Pill tone="good">{r.status}</Pill>}</TableCell>
                  <TableCell>{dateFormat.format(new Date(r.created_at))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
