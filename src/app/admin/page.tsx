import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { formatKes, formatKesShort } from "@/lib/money";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

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

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section max-w-2xl pt-16">
      <h1 className="text-4xl font-bold">{title}</h1>
      <div className="mt-4 text-lg text-ink-soft">{children}</div>
    </div>
  );
}

export default async function AdminPage() {
  if (!isSupabaseConfigured) {
    return (
      <Notice title="Admin">
        <p>The database is not connected yet, so there is nothing to manage. Once it is, signed-in administrators see pledges, gifts and members here.</p>
      </Notice>
    );
  }

  const supabase = await createSessionClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login?next=/admin");
  const email = (claims.claims.email as string | undefined) ?? "";

  const [{ data: isFinance }, { data: isAdmin }] = await Promise.all([
    supabase.rpc("is_finance"),
    supabase.rpc("is_admin"),
  ]);

  const signOut = (
    <form action="/auth/signout" method="post">
      <button type="submit" className="font-semibold text-tea underline underline-offset-4">Log out</button>
    </form>
  );

  if (!isFinance) {
    return (
      <Notice title="No admin access">
        <p>You are signed in as {email}, but this account has no admin role. An administrator can give you one.</p>
        <div className="mt-6">{signOut}</div>
      </Notice>
    );
  }

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
    <div className="section pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Admin</h1>
          <p className="mt-2 text-ink-soft">Signed in as {email}</p>
        </div>
        {signOut}
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface p-5">
            <dt className="text-sm text-ink-soft">{s.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Latest pledges</h2>
        {pledgeRows.length === 0 ? (
          <p className="mt-4 text-ink-soft">No pledges recorded online yet. The plenary&rsquo;s founding pledges are counted in the totals above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-[0.95rem]">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Cause</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pledgeRows.map((r) => (
                  <tr key={r.reference}>
                    <td className="px-4 py-3 font-semibold">{r.reference}{r.is_founding && <span className="ml-2 rounded bg-gold-tint px-1.5 text-xs">Founding</span>}</td>
                    <td className="px-4 py-3">{r.persons?.full_name}</td>
                    <td className="px-4 py-3">{r.causes?.title}</td>
                    <td className="px-4 py-3">{typeLabel[r.pledge_type] ?? r.pledge_type}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {r.total_amount === null ? r.in_kind_description : formatKes(Number(r.total_amount))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{dateFormat.format(new Date(r.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Latest gifts</h2>
        {giftRows.length === 0 ? (
          <p className="mt-4 text-ink-soft">No gifts recorded online yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-[0.95rem]">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Cause</th>
                  <th className="px-4 py-3 font-semibold">How often</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {giftRows.map((r) => (
                  <tr key={r.reference}>
                    <td className="px-4 py-3 font-semibold">{r.reference}</td>
                    <td className="px-4 py-3">{r.persons?.full_name}</td>
                    <td className="px-4 py-3">{r.causes?.title}</td>
                    <td className="px-4 py-3">{typeLabel[r.frequency] ?? r.frequency}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKes(Number(r.amount))}</td>
                    <td className="px-4 py-3">{r.status === "initiated" ? "Awaiting payment" : r.status}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{dateFormat.format(new Date(r.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-10 text-sm text-ink-soft">
        Payment entry, members and settings come in the next milestones. <Link href="/" className="underline">Back to the website</Link>
      </p>
    </div>
  );
}
