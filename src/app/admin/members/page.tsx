import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getStaff } from "@/lib/admin/staff";
import { setInviteActive, setRegistrationOpen } from "@/app/admin/actions";
import { CopyLink, InviteForm } from "@/components/admin/invite-form";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Members" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
const statusLabel: Record<string, string> = { registered: "Registered", verified: "Verified", active: "Active", lapsed: "Lapsed", terminated: "Terminated" };

type Props = { searchParams: Promise<{ category?: string; status?: string; region?: string; standing?: string }> };

type Row = {
  id: string; year_left: number | null; membership_status: string; registered_at: string | null; photo_path: string | null;
  deletion_requested_at: string | null; rejoin_until: string | null;
  relationship_to_school: string | null; persons: { id: string; full_name: string } | null;
  member_categories: { key: string } | null; clusters: { name: string } | null; membership_levels: { name: string } | null;
};

export default async function AdminMembersPage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can see the members list.</p>;
  const q = await searchParams;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  let members = staff.supabase
    .from("member_profiles")
    .select("id, year_left, membership_status, registered_at, deletion_requested_at, rejoin_until, photo_path, relationship_to_school, persons!member_profiles_person_id_fkey(id, full_name), member_categories!inner(key), clusters!inner(name), membership_levels(name)")
    .order("registered_at", { ascending: false, nullsFirst: false })
    .limit(300);
  if (q.category === "alumnus" || q.category === "friend") members = members.eq("member_categories.key", q.category);
  if (q.status && statusLabel[q.status]) members = members.eq("membership_status", q.status);
  if (q.region) members = members.eq("clusters.name", q.region);

  const [{ data: rows, error: rowsError }, { data: modules }, { data: invites }, { count: dupes }, { data: regions }, { data: cohorts }, { data: standings }] = await Promise.all([
    members,
    staff.supabase.from("module_settings").select("module_key, enabled"),
    staff.supabase.from("invite_links").select("id, token, label, active, created_at").order("created_at", { ascending: false }),
    staff.supabase.from("duplicate_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    staff.supabase.from("clusters").select("name").eq("active", true).order("sort_order"),
    staff.supabase.from("cohorts").select("year_left").order("year_left", { ascending: false }),
    staff.supabase.rpc("member_standings"),
  ]);
  if (rowsError) console.error("Members list failed", rowsError);
  const standingOf = new Map(((standings ?? []) as { person_id: string; standing: string | null }[]).map((s) => [s.person_id, s.standing]));
  const list = ((rows ?? []) as unknown as Row[]).filter(
    (m) => !(q.standing === "active" || q.standing === "inactive") || standingOf.get(m.persons?.id ?? "") === q.standing,
  );
  const open = Boolean(modules?.find((m) => m.module_key === "registration")?.enabled);
  const feesOn = Boolean(modules?.find((m) => m.module_key === "membership_fees")?.enabled);
  const years = (cohorts ?? []).map((c) => c.year_left).filter((y) => y <= new Date().getFullYear());
  const filterLink = (key: "category" | "status" | "region" | "standing", value: string | undefined, label: string) => {
    const merged: Record<string, string | undefined> = { ...q, [key]: value };
    const params = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])));
    const active = q[key] === value;
    return (
      <Link key={`${key}-${label}`} href={`/admin/members${params.size ? `?${params}` : ""}`}
        className={`rounded-full border px-3 py-1 text-sm font-semibold ${active ? "border-tea bg-tea text-white" : "border-line hover:border-ink"}`}>
        {label}
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-12">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Registration</h2>
          <p className="mt-2 text-ink-soft">
            {open ? "Open: anyone can register at /join." : "Closed to the public. Administrators can still complete it to test."}
          </p>
          <form action={setRegistrationOpen} className="mt-4">
            <input type="hidden" name="open" value={open ? "false" : "true"} />
            <button type="submit" className={buttonClass(open ? "secondary" : "primary")}>
              {open ? "Close registration" : "Open registration"}
            </button>
          </form>
          <p className="mt-4 text-sm text-ink-soft">Membership fees are {feesOn ? "on" : "off"}. {feesOn ? "Members are Active for each year they pay for (last year’s payers until 31 March)." : "While fees are off, every member is Active and can vote."} Members decide fees; they are switched on in the database for now.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">Possible duplicates</h2>
          <p className="mt-2 font-display text-3xl font-bold">{dupes ?? 0}</p>
          <p className="mt-2 text-sm text-ink-soft">
            Records sharing a phone, an email, or a name in the same class. Nothing is merged automatically.{" "}
            <Link href="/admin/duplicates" className="font-semibold text-tea underline underline-offset-4">Check them</Link>
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Class invite links</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Share in class WhatsApp groups. The link fills in the class and records who invited them. People still sign in
          and finish every step.
        </p>
        <div className="mt-5 max-w-3xl rounded-xl border border-line bg-surface p-6">
          <InviteForm years={years} />
        </div>
        {(invites ?? []).length > 0 && (
          <ul className="mt-6 max-w-3xl divide-y divide-line rounded-xl border border-line bg-surface">
            {(invites ?? []).map((i) => {
              const url = `${origin}/join?invite=${i.token}`;
              return (
                <li key={i.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${i.active ? "" : "opacity-60"}`}>
                  <div className="min-w-0">
                    <p className="font-semibold">{i.label}{!i.active && " (switched off)"}</p>
                    <p className="truncate text-sm text-ink-soft">{url}</p>
                  </div>
                  <div className="flex gap-2">
                    {i.active && <CopyLink url={url} />}
                    <form action={setInviteActive}>
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="active" value={i.active ? "false" : "true"} />
                      <button type="submit" className="rounded-md border border-line px-2.5 py-1 text-sm font-semibold hover:border-ink">
                        {i.active ? "Switch off" : "Switch on"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold">Registered members</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {filterLink("category", undefined, "Everyone")}
          {filterLink("category", "alumnus", "Alumni")}
          {filterLink("category", "friend", "Friends")}
          <span className="mx-1 w-px bg-line" />
          {filterLink("status", "registered", "Waiting for confirmation")}
          {filterLink("status", "verified", "Verified")}
          {filterLink("status", "terminated", "Terminated")}
          <span className="mx-1 w-px bg-line" />
          {filterLink("standing", "active", "Active (can vote)")}
          {filterLink("standing", "inactive", "Inactive")}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filterLink("region", undefined, "All regions")}
          {(regions ?? []).map((r) => filterLink("region", r.name, r.name))}
        </div>
        <p className="mt-4 text-sm text-ink-soft">{list.length} shown{list.length === 300 ? " (the latest 300)" : ""}. Next of kin is never shown here.</p>
        {list.length === 0 ? (
          <p className="mt-4 text-ink-soft">No one matches yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[44rem] text-left text-[0.95rem]">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Class or connection</th>
                  <th className="px-4 py-3 font-semibold">Region</th>
                  <th className="px-4 py-3 font-semibold">Level</th>
                  <th className="px-4 py-3 font-semibold">Standing</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-semibold">{m.persons?.full_name}</td>
                    <td className="px-4 py-3">{m.member_categories?.key === "alumnus" ? `Class of ${m.year_left}` : `Friend: ${m.relationship_to_school ?? ""}`}</td>
                    <td className="px-4 py-3">{m.clusters?.name}</td>
                    <td className="px-4 py-3">{m.membership_levels?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {standingOf.get(m.persons?.id ?? "") === "active" ? (
                        <span className="rounded-full bg-tea-tint px-2 py-0.5 text-sm font-semibold text-tea-dark">Active</span>
                      ) : standingOf.get(m.persons?.id ?? "") === "inactive" ? (
                        <span className="rounded-full bg-paper px-2 py-0.5 text-sm font-semibold text-ink-soft">Inactive</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {statusLabel[m.membership_status] ?? m.membership_status}
                      {m.membership_status === "terminated" && m.rejoin_until && (
                        <span className="block text-xs text-ink-soft">
                          Can rejoin until {dateFormat.format(new Date(m.rejoin_until))}
                          {m.deletion_requested_at ? "; deletion requested" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.registered_at ? dateFormat.format(new Date(m.registered_at)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
