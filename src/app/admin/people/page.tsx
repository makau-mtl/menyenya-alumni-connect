import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { movePosition, setPositionStatus } from "@/app/admin/actions";
import { toPhoto } from "@/lib/photos";
import { emptyPosition, PositionForm, type PositionValues } from "@/components/admin/position-form";
import { Plus } from "lucide-react";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { RowActions } from "@/components/portal/row-actions";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Our people" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

type Position = {
  id: string; section: "leadership" | "secretariat"; title: string; sort_order: number; person_id: string | null;
  display_name: string | null; capacity_note: string | null; summary: string | null; linkedin_url: string | null;
  photo_path: string | null; has_tenure: boolean; term_starts: string | null; term_ends: string | null; status: string;
};

type Props = { searchParams: Promise<{ edit?: string; saved?: string }> };

export default async function AdminPeoplePage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can manage the Our people page.</p>;
  const q = await searchParams;

  const [{ data: positions }, { data: profiles }, { data: alerts }] = await Promise.all([
    staff.supabase.from("public_positions").select("*").neq("status", "archived").order("sort_order").order("title"),
    staff.supabase
      .from("member_profiles")
      .select("person_id, persons!member_profiles_person_id_fkey(full_name, status)")
      .neq("membership_status", "terminated")
      .limit(5000),
    staff.supabase.rpc("position_alerts"),
  ]);
  const members = ((profiles ?? []) as unknown as { person_id: string; persons: { full_name: string; status: string } | null }[])
    .filter((p) => p.persons?.status === "active")
    .map((p) => ({ id: p.person_id, name: p.persons!.full_name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const list = (positions ?? []) as Position[];
  const editing = q.edit ? list.find((p) => p.id === q.edit) : undefined;
  const initial: PositionValues = editing
    ? {
        id: editing.id,
        section: editing.section,
        title: editing.title,
        personId: editing.person_id ?? "",
        displayName: editing.display_name ?? "",
        capacityNote: editing.capacity_note ?? "",
        summary: editing.summary ?? "",
        linkedinUrl: editing.linkedin_url ?? "",
        photo: editing.photo_path ? toPhoto(editing.photo_path, "").srcSmall : null,
        hasTenure: editing.has_tenure,
        termStarts: editing.term_starts ?? "",
        termEnds: editing.term_ends ?? "",
        status: editing.status === "draft" ? "draft" : "published",
      }
    : emptyPosition;
  const due = (alerts ?? []) as { id: string; title: string; name: string; term_ends: string; ended: boolean }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Our people"
        description={<>Positions on the public <Link href="/our-people" className="font-semibold text-tea underline">Our people</Link> page. Holding a position means being shown publicly; contact details are never shown, only LinkedIn.</>}
        actions={<Button asChild><Link href="/admin/people#form"><Plus /> Add a position</Link></Button>}
      />
      {due.length > 0 && (
        <Panel tone="attention" title="Terms ending" description="After an election, change the holder and the term dates. The page keeps showing the current holder until you do.">
          <ul className="flex flex-col gap-1">
            {due.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong> ({a.name}): {a.ended ? "ended" : "ends"} {dateFormat.format(new Date(a.term_ends))}.{" "}
                <Link href={`/admin/people?edit=${a.id}#form`} className="font-semibold text-tea underline">Update</Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {q.saved && <p role="status" className="rounded-md bg-secondary p-4 font-semibold">Saved. The Our people page is updated.</p>}

      {(["leadership", "secretariat"] as const).map((section) => {
        const rows = list.filter((p) => p.section === section);
        return (
          <Panel key={section} title={section === "leadership" ? "Leadership (the board)" : "Secretariat"}>
            {rows.length === 0 ? (
              <Empty>No positions yet.</Empty>
            ) : (
              <ol className="flex flex-col divide-y">
                {rows.map((p, i) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="min-w-48 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">{p.title}{p.status === "draft" && <Pill>Hidden</Pill>}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.person_id ? nameOf.get(p.person_id) ?? "Member no longer active" : `${p.display_name} (not a member)`}
                        {" · "}
                        {p.has_tenure
                          ? `Term ${p.term_starts ? dateFormat.format(new Date(p.term_starts)) : "?"} to ${p.term_ends ? dateFormat.format(new Date(p.term_ends)) : "?"}`
                          : "No fixed term"}
                      </p>
                    </div>
                    <RowActions id={p.id} name={p.title} status={p.status} first={i === 0} last={i === rows.length - 1}
                      editHref={`/admin/people?edit=${p.id}#form`} move={movePosition} setStatus={setPositionStatus} />
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        );
      })}

      <Panel id="form" title={editing ? `Change: ${editing.title}` : "Add a position"} className="max-w-4xl">
        <PositionForm key={initial.id || "new"} initial={initial} members={members} />
      </Panel>
    </div>
  );
}
