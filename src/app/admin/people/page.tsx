import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { movePosition, setPositionStatus } from "@/app/admin/actions";
import { toPhoto } from "@/lib/photos";
import { emptyPosition, PositionForm, type PositionValues } from "@/components/admin/position-form";
import { buttonClass } from "@/components/ui";

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
    <div className="flex flex-col gap-12">
      {due.length > 0 && (
        <div role="status" className="rounded-xl border-2 border-gold bg-gold/10 p-5">
          <h2 className="text-xl font-bold">Terms ending</h2>
          <ul className="mt-2 flex flex-col gap-1">
            {due.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong> ({a.name}): {a.ended ? "ended" : "ends"} {dateFormat.format(new Date(a.term_ends))}.{" "}
                <Link href={`/admin/people?edit=${a.id}#form`} className="font-semibold text-tea underline">Update</Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-ink-soft">After an election, change the holder and the term dates. The page keeps showing the current holder until you do.</p>
        </div>
      )}
      {q.saved && <p role="status" className="rounded-md bg-tea-tint p-4 font-semibold">Saved. The Our people page is updated.</p>}

      {(["leadership", "secretariat"] as const).map((section) => {
        const rows = list.filter((p) => p.section === section);
        return (
          <section key={section}>
            <h2 className="text-2xl font-bold">{section === "leadership" ? "Leadership (the board)" : "Secretariat"}</h2>
            {rows.length === 0 ? (
              <p className="mt-3 text-ink-soft">No positions yet.</p>
            ) : (
              <ol className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
                {rows.map((p, i) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="min-w-48 flex-1">
                      <p className="font-semibold">{p.title}{p.status === "draft" && <span className="ml-2 rounded bg-paper px-2 py-0.5 text-xs font-semibold text-ink-soft">Hidden</span>}</p>
                      <p className="text-sm text-ink-soft">
                        {p.person_id ? nameOf.get(p.person_id) ?? "Member no longer active" : `${p.display_name} (not a member)`}
                        {" · "}
                        {p.has_tenure
                          ? `Term ${p.term_starts ? dateFormat.format(new Date(p.term_starts)) : "?"} to ${p.term_ends ? dateFormat.format(new Date(p.term_ends)) : "?"}`
                          : "No fixed term"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={movePosition}>
                        <input type="hidden" name="id" value={p.id} />
                        <button name="direction" value="up" disabled={i === 0} aria-label={`Move ${p.title} up`} className={buttonClass("secondary", "sm")}>↑</button>
                        <button name="direction" value="down" disabled={i === rows.length - 1} aria-label={`Move ${p.title} down`} className={`${buttonClass("secondary", "sm")} ml-1`}>↓</button>
                      </form>
                      <Link href={`/admin/people?edit=${p.id}#form`} className={buttonClass("secondary", "sm")}>Edit</Link>
                      <form action={setPositionStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <button name="status" value={p.status === "draft" ? "published" : "draft"} className={buttonClass("secondary", "sm")}>
                          {p.status === "draft" ? "Show" : "Hide"}
                        </button>
                      </form>
                      <form action={setPositionStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <button name="status" value="archived" className={buttonClass("quiet", "sm")}>Remove</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}

      <section id="form" className="scroll-mt-24">
        <h2 className="text-2xl font-bold">{editing ? `Change: ${editing.title}` : "Add a position"}</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Positions appear on the public <Link href="/our-people" className="underline">Our people</Link> page with a photo,
          name and role. Holding a position means being shown publicly. Contact details are never shown, only LinkedIn.
        </p>
        <div className="mt-5 max-w-3xl rounded-xl border border-line bg-surface p-6">
          <PositionForm key={initial.id || "new"} initial={initial} members={members} />
        </div>
      </section>
    </div>
  );
}
