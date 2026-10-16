import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { decideConfirmation } from "@/app/app/actions";
import { buttonClass, inputClass } from "@/components/ui";

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
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold">Confirm members</h1>
      <p className="mt-2 text-ink-soft">
        People waiting for you to confirm they belong. Confirm those you recognise. If something looks wrong, say
        what needs checking; they stay waiting and the note is kept.
      </p>
      {rows.length === 0 ? (
        <p className="mt-8 rounded-md bg-tea-tint p-4">No one is waiting for you right now.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {rows.map((r) => (
            <li key={r.person_id} className="rounded-xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xl font-bold">{r.full_name}</p>
                <p className="text-sm text-ink-soft">Registered {r.registered_at ? dateFormat.format(new Date(r.registered_at)) : ""}</p>
              </div>
              <p className="mt-1 text-ink-soft">
                {r.category === "friend" ? `Friend of the alumni: ${r.relationship ?? ""}` : `Class of ${r.year_left}${r.class_or_stream ? `, ${r.class_or_stream}` : ""}`}
                {r.region && ` · ${r.region}`}
              </p>
              {r.open_duplicates > 0 && <p className="mt-2 text-sm font-semibold text-alert">May match another record; an administrator will check.</p>}
              {r.confirmation_note && <p className="mt-2 rounded bg-gold-tint px-3 py-2 text-sm">Note: {r.confirmation_note}</p>}
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <form action={decideConfirmation}>
                  <input type="hidden" name="person" value={r.person_id} />
                  <input type="hidden" name="decision" value="confirm" />
                  <button type="submit" className={buttonClass("primary", "sm")}>Confirm</button>
                </form>
                <form action={decideConfirmation} className="flex flex-1 flex-wrap items-end gap-2">
                  <input type="hidden" name="person" value={r.person_id} />
                  <input type="hidden" name="decision" value="flag" />
                  <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-semibold">
                    What needs checking?
                    <input name="note" minLength={5} required maxLength={300} className={`${inputClass} py-1.5`} />
                  </label>
                  <button type="submit" className={buttonClass("secondary", "sm")}>Flag</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
