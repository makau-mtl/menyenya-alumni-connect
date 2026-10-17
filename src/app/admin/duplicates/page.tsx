import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { resolveDuplicate } from "@/app/admin/actions";
import { inputClass } from "@/components/ui";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { ConfirmAction, ConfirmSubmit } from "@/components/portal/confirm-action";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Duplicates" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
const reasons: Record<string, string> = {
  same_phone: "Same phone number",
  same_email: "Same email address",
  same_name_cohort: "Same name in the same class",
  phone_matches_other_person: "Phone matches another record",
};

type Props = { searchParams: Promise<{ error?: string; done?: string }> };

export default async function DuplicatesPage({ searchParams }: Props) {
  const staff = await getStaff();
  if (!staff || !(staff.isAdmin || staff.isVerifier)) return <p>Only administrators and verifiers can resolve duplicates.</p>;
  const q = await searchParams;
  const db = staff.supabase;

  const [{ data: flags }, { data: merges }] = await Promise.all([
    db.from("duplicate_flags").select("id, person_a_id, person_b_id, reason, created_at").eq("status", "open").order("created_at").limit(50),
    db.from("person_merges").select("id, survivor_id, merged_id, note, created_at, undone_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const ids = [...new Set([...(flags ?? []).flatMap((f) => [f.person_a_id, f.person_b_id]), ...(merges ?? []).flatMap((m) => [m.survivor_id, m.merged_id])])];

  const [{ data: people }, { data: contacts }, { data: profiles }, { data: gifts }, { data: pledges }] = await Promise.all([
    db.from("persons").select("id, full_name, user_id, status, created_at").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    db.from("person_contacts").select("person_id, kind, value").in("person_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    db.from("member_profiles").select("person_id, year_left, membership_status, member_categories(name)").in("person_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    db.from("donations").select("donor_person_id").in("donor_person_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    db.from("pledges").select("pledger_person_id").in("pledger_person_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
  ]);
  const person = (id: string) => {
    const p = people?.find((x) => x.id === id);
    const prof = profiles?.find((x) => x.person_id === id) as unknown as { year_left: number | null; membership_status: string; member_categories: { name: string } | null } | undefined;
    return {
      id,
      name: p?.full_name ?? "Unknown",
      hasLogin: Boolean(p?.user_id),
      since: p?.created_at,
      contacts: (contacts ?? []).filter((c) => c.person_id === id).map((c) => c.value),
      member: prof ? `${prof.member_categories?.name ?? "Member"}${prof.year_left ? `, Class of ${prof.year_left}` : ""}` : null,
      gifts: (gifts ?? []).filter((g) => g.donor_person_id === id).length,
      pledges: (pledges ?? []).filter((g) => g.pledger_person_id === id).length,
    };
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Possible duplicates"
        description="Pairs of records that might be the same person. Choose which record to keep: gifts, pledges, payments and the login move to it, contact details are copied, and the other is marked as merged. Nothing is deleted, and an administrator can undo a merge."
      />
      {q.error && <p role="alert" className="rounded-md bg-alert/10 p-4 font-semibold text-alert">{q.error}</p>}
      {q.done && !q.error && <p role="status" className="rounded-md bg-secondary p-4 font-semibold">Done.</p>}
      {(flags ?? []).length === 0 ? (
        <Empty>No possible duplicates right now.</Empty>
      ) : (
        <ul className="flex flex-col gap-6">
          {(flags ?? []).map((f) => {
            const pair = [person(f.person_a_id), person(f.person_b_id)];
            return (
              <li key={f.id}>
                <Panel title={<span className="flex flex-wrap items-center gap-2"><Pill tone="warn">{reasons[f.reason] ?? f.reason}</Pill><span className="text-sm font-normal text-muted-foreground">flagged {dateFormat.format(new Date(f.created_at))}</span></span>}>
                  <div className="grid gap-4 md:grid-cols-2">
                    {pair.map((p, i) => {
                      const other = pair[1 - i];
                      return (
                        <div key={p.id} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-4 ring-1 ring-border">
                          <p className="text-lg font-bold">{p.name}</p>
                          <p className="text-sm">{p.member ?? "Not a registered member (gave or pledged)"}</p>
                          <p className="break-words text-sm text-muted-foreground">{p.contacts.join(" · ")}</p>
                          <p className="flex flex-wrap gap-1.5 text-sm">
                            <Pill>{p.gifts} gift{p.gifts === 1 ? "" : "s"}</Pill>
                            <Pill>{p.pledges} pledge{p.pledges === 1 ? "" : "s"}</Pill>
                            <Pill tone={p.hasLogin ? "good" : "muted"}>{p.hasLogin ? "Has a login" : "No login"}</Pill>
                          </p>
                          <form action={resolveDuplicate} className="mt-auto flex flex-col gap-2 pt-2">
                            <input type="hidden" name="action" value="merge" />
                            <input type="hidden" name="survivor" value={p.id} />
                            <input type="hidden" name="merged" value={other.id} />
                            <input name="note" maxLength={200} placeholder="Note (optional)" aria-label="Note" className={`${inputClass} py-1.5 text-sm`} />
                            <div>
                              <ConfirmSubmit label="Keep this record and merge" title={`Keep ${p.name} and merge ${other.name} into it?`}
                                description="Gifts, pledges, payments and the login move to the kept record. An administrator can undo this later." confirmLabel="Merge" />
                            </div>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                  <form action={resolveDuplicate} className="mt-4">
                    <input type="hidden" name="action" value="dismiss" />
                    <input type="hidden" name="flag" value={f.id} />
                    <Button variant="outline" size="sm">They are different people</Button>
                  </form>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      {(merges ?? []).length > 0 && (
        <Panel title="Recent merges">
          <ul className="flex flex-col divide-y">
            {(merges ?? []).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{person(m.merged_id).name} merged into {person(m.survivor_id).name} {m.undone_at && <Pill>Undone</Pill>}</p>
                  <p className="text-sm text-muted-foreground">
                    {dateFormat.format(new Date(m.created_at))}
                    {m.note ? ` · ${m.note}` : ""}
                    {m.undone_at ? ` · undone ${dateFormat.format(new Date(m.undone_at))}` : ""}
                  </p>
                </div>
                {!m.undone_at && staff.isAdmin && (
                  <ConfirmAction action={resolveDuplicate} fields={{ action: "undo", merge: m.id }} variant="outline" label="Undo"
                    title="Undo this merge?" description="The two records are separated again and the possible duplicate is reopened." confirmLabel="Undo merge" />
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
