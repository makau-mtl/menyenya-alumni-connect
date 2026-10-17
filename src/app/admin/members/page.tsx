import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getStaff } from "@/lib/admin/staff";
import { setInviteActive, setRegistrationOpen } from "@/app/admin/actions";
import { CopyLink, InviteForm } from "@/components/admin/invite-form";
import { Empty, PageHeader, Panel, Pill, StatTiles } from "@/components/portal/page-parts";
import { ConfirmAction } from "@/components/portal/confirm-action";
import { Button } from "@/components/shadcn/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";

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
    staff.supabase.from("invite_links").select("id, token, label, active, created_at, tester").order("created_at", { ascending: false }),
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
      <Link key={`${key}-${label}`} href={`/admin/members${params.size ? `?${params}` : ""}#list`}
        className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 transition ${active ? "bg-ink text-white ring-ink" : "bg-card ring-border hover:ring-ink"}`}>
        {label}
      </Link>
    );
  };

  const activeCount = [...standingOf.values()].filter((v) => v === "active").length;
  const waitingCount = list.filter((m) => m.membership_status === "registered").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Members"
        description="Everyone who has registered, the registration switch and class invite links. Next of kin is never shown here."
      />
      <StatTiles
        items={[
          { label: "Members", value: String(standingOf.size) },
          { label: "Active (can vote)", value: String(activeCount), href: "/admin/members?standing=active#list" },
          { label: "Waiting for confirmation", value: String(waitingCount), href: "/admin/members?status=registered#list" },
          { label: "Possible duplicates", value: String(dupes ?? 0), href: "/admin/duplicates" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Registration"
          description={open ? "Open: anyone can register at /join." : "Closed to the public. Administrators can still complete it to test."}
          actions={<Pill tone={open ? "good" : "muted"}>{open ? "Open" : "Closed"}</Pill>}
        >
          {open ? (
            <ConfirmAction action={setRegistrationOpen} fields={{ open: "false" }} variant="outline" size="default" label="Close registration"
              title="Close registration?" description="New people won't be able to register until you open it again. Existing members are not affected." confirmLabel="Close registration" />
          ) : (
            <form action={setRegistrationOpen}>
              <input type="hidden" name="open" value="true" />
              <Button type="submit">Open registration</Button>
            </form>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Membership fees are {feesOn ? "on" : "off"}. {feesOn ? "Members are Active for each year they pay for (last year’s payers until 31 March)." : "While fees are off, every member is Active and can vote."} Fees are switched on in the database for now.
          </p>
        </Panel>
        <Panel title="Class invite links" description="Share in class WhatsApp groups. The link fills in the class and records who invited them; people still sign in and finish every step.">
          <InviteForm years={years} />
        </Panel>
      </div>

      {(invites ?? []).length > 0 && (
        <Panel title="Invite links">
          <ul className="flex flex-col divide-y">
            {(invites ?? []).map((i) => {
              const url = `${origin}/join?invite=${i.token}`;
              return (
                <li key={i.id} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${i.active ? "" : "opacity-60"}`}>
                  <div className="min-w-0">
                    <p className="font-semibold">{i.label} {i.tester && <Pill tone="warn">Testers</Pill>} {!i.active && <Pill>Switched off</Pill>}</p>
                    <p className="truncate text-sm text-muted-foreground">{url}</p>
                  </div>
                  <div className="flex gap-2">
                    {i.active && <CopyLink url={url} />}
                    {i.active ? (
                      <ConfirmAction action={setInviteActive} fields={{ id: i.id, active: "false" }} variant="outline" label="Switch off"
                        title="Switch off this link?" description="People who open it won't be able to register through it. You can switch it on again." confirmLabel="Switch off" />
                    ) : (
                      <form action={setInviteActive}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="active" value="true" />
                        <Button size="sm" variant="outline">Switch on</Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel id="list" title="Registered members" description={`${list.length} shown${list.length === 300 ? " (the latest 300)" : ""}.`}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {filterLink("category", undefined, "Everyone")}
            {filterLink("category", "alumnus", "Alumni")}
            {filterLink("category", "friend", "Friends")}
            <span className="mx-1 w-px bg-border" />
            {filterLink("status", "registered", "Waiting for confirmation")}
            {filterLink("status", "verified", "Verified")}
            {filterLink("status", "terminated", "Terminated")}
            <span className="mx-1 w-px bg-border" />
            {filterLink("standing", "active", "Active (can vote)")}
            {filterLink("standing", "inactive", "Inactive")}
          </div>
          <div className="flex flex-wrap gap-2">
            {filterLink("region", undefined, "All regions")}
            {(regions ?? []).map((r) => filterLink("region", r.name, r.name))}
          </div>
        </div>
        <div className="mt-4">
          {list.length === 0 ? (
            <Empty>No one matches yet.</Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Class or connection</TableHead><TableHead>Region</TableHead><TableHead>Level</TableHead><TableHead>Standing</TableHead><TableHead>Status</TableHead><TableHead>Registered</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {list.map((m) => {
                  const st = standingOf.get(m.persons?.id ?? "");
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-semibold">{m.persons?.full_name}</TableCell>
                      <TableCell>{m.member_categories?.key === "alumnus" ? `Class of ${m.year_left}` : `Friend: ${m.relationship_to_school ?? ""}`}</TableCell>
                      <TableCell>{m.clusters?.name}</TableCell>
                      <TableCell>{m.membership_levels?.name ?? "—"}</TableCell>
                      <TableCell>{st === "active" ? <Pill tone="good">Active</Pill> : st === "inactive" ? <Pill>Inactive</Pill> : "—"}</TableCell>
                      <TableCell className="whitespace-normal">
                        <Pill tone={m.membership_status === "registered" ? "warn" : m.membership_status === "terminated" ? "bad" : "good"}>{statusLabel[m.membership_status] ?? m.membership_status}</Pill>
                        {m.membership_status === "terminated" && m.rejoin_until && (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            Can rejoin until {dateFormat.format(new Date(m.rejoin_until))}{m.deletion_requested_at ? "; deletion requested" : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{m.registered_at ? dateFormat.format(new Date(m.registered_at)) : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </Panel>
    </div>
  );
}
