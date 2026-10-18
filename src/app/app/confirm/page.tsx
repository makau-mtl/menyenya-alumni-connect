import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { decideConfirmation } from "@/app/app/actions";
import { Check, Flag } from "lucide-react";
import { inputClass } from "@/components/ui";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Confirm members" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

type Row = {
  person_id: string; full_name: string; category: string; year_left: number | null; relationship: string | null;
  region: string | null; class_or_stream: string | null; registered_at: string | null; confirmation_note: string | null; open_duplicates: number;
};

export default async function ConfirmPage() {
  const member = await getMember();
  if (!member) redirect("/login?next=/app/confirm");
  const { data } = await member.supabase.rpc("confirmations_waiting");
  const rows = (data ?? []) as Row[];

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        back={{ href: "/app", label: "Dashboard" }}
        eyebrow="My account"
        title="Confirm members"
        description="People waiting for you to confirm they belong. Confirm those you recognise. If something looks wrong, say what needs checking; they stay waiting and the note is kept."
      />
      {rows.length === 0 ? (
        <Empty>No one is waiting for you right now.</Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.person_id}>
              <Panel
                title={r.full_name}
                description={<>{r.category === "friend" ? `Friend of the alumni: ${r.relationship ?? ""}` : `Class of ${r.year_left}${r.class_or_stream ? `, ${r.class_or_stream}` : ""}`}{r.region && ` · ${r.region}`} · registered {r.registered_at ? dateFormat.format(new Date(r.registered_at)) : ""}</>}
                actions={r.open_duplicates > 0 ? <Pill tone="bad">May match another record</Pill> : undefined}
              >
                {r.confirmation_note && <p className="mb-3 rounded-md bg-gold-tint px-3 py-2 text-sm">Note: {r.confirmation_note}</p>}
                <div className="flex flex-wrap items-end gap-3">
                  <form action={decideConfirmation}>
                    <input type="hidden" name="person" value={r.person_id} />
                    <input type="hidden" name="decision" value="confirm" />
                    <Button type="submit"><Check /> Confirm</Button>
                  </form>
                  <form action={decideConfirmation} className="flex flex-1 flex-wrap items-end gap-2">
                    <input type="hidden" name="person" value={r.person_id} />
                    <input type="hidden" name="decision" value="flag" />
                    <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-semibold">
                      What needs checking?
                      <input name="note" minLength={5} required maxLength={300} className={`${inputClass} py-1.5`} />
                    </label>
                    <Button type="submit" variant="outline"><Flag /> Flag</Button>
                  </form>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
