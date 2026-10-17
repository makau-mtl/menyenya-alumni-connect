import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { getMember } from "@/lib/members/session";
import { setVolunteerRoleStatus, volunteerSignup } from "@/app/app/actions";
import { VolunteerRoleForm } from "@/components/member/opportunity-forms";
import { OpportunityTabs } from "@/components/opportunities/parts";
import { ConfirmAction } from "@/components/portal/confirm-action";
import { Empty, PageHeader, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Volunteer" };

type Role = { id: string; title: string; details: string; place: string; happens_on: string | null; time_note: string; people_needed: number | null; skills: string[]; status: string; signed_up: number; i_signed_up: boolean; my_note: string | null };
type Signup = { person_id: string; full_name: string; year_left: number | null; phone: string | null; note: string };

const day = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function VolunteerPage() {
  const member = await getMember();
  if (!member?.registered || member.membershipStatus === "terminated") redirect("/login?next=/app/opportunities/volunteer");
  const [{ data }, { data: official }, { data: me }] = await Promise.all([
    member.supabase.rpc("volunteer_board"),
    member.supabase.rpc("can_post_volunteer"),
    member.supabase.from("member_profiles").select("skills").eq("person_id", member.personId!).single(),
  ]);
  const roles = (data ?? []) as Role[];
  const mySkills = new Set((me?.skills ?? []).map((s: string) => s.toLowerCase()));
  const lists = official ? await Promise.all(roles.map(async (r) => ((await member.supabase.rpc("volunteer_signup_list", { p_role: r.id })).data ?? []) as Signup[])) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opportunities"
        title="Volunteer"
        description="Give your time and skills: speak at a career day, help at homecoming, serve at a health camp. Every hour counts."
        actions={official ? <VolunteerRoleForm /> : undefined}
      />
      <OpportunityTabs active="/app/opportunities/volunteer" />
      {roles.length === 0 ? <Empty>No volunteer opportunities right now. Tick &ldquo;Willing to volunteer&rdquo; in your profile and we&rsquo;ll know who to ask.</Empty> : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {roles.map((r, i) => {
            const match = r.skills.some((s) => mySkills.has(s.toLowerCase()));
            const full = r.people_needed !== null && r.signed_up >= r.people_needed;
            return (
              <li key={r.id} className={`flex flex-col gap-3 rounded-xl p-5 shadow-sm ring-1 ${r.status === "open" ? "bg-card ring-border" : "bg-muted/50 ring-border"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-bold leading-snug">{r.title}</h2>
                  <div className="flex gap-1">
                    {match && <Pill tone="warn">Your skills</Pill>}
                    {r.status !== "open" && <Pill>{r.status === "closed" ? "Closed" : "Cancelled"}</Pill>}
                  </div>
                </div>
                {r.details && <p className="whitespace-pre-line text-sm">{r.details}</p>}
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {r.place && <span className="flex items-center gap-1"><MapPin className="size-4" /> {r.place}</span>}
                  {r.happens_on && <span className="flex items-center gap-1"><CalendarDays className="size-4" /> {day.format(new Date(r.happens_on))}{r.time_note ? `, ${r.time_note}` : ""}</span>}
                  <span className="flex items-center gap-1"><Users className="size-4" /> {r.signed_up}{r.people_needed ? ` of ${r.people_needed}` : ""} signed up</span>
                </p>
                {r.skills.length > 0 && <ul className="flex flex-wrap gap-1.5">{r.skills.map((s) => <li key={s} className="rounded-full bg-tea-tint px-2.5 py-0.5 text-xs font-semibold">{s}</li>)}</ul>}
                {r.status === "open" && (
                  r.i_signed_up ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary p-3 text-sm">
                      <span className="font-semibold text-tea-dark">You&rsquo;re helping. Asante!</span>
                      <form action={volunteerSignup}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="withdraw" value="yes" /><Button size="sm" variant="ghost">Withdraw</Button></form>
                    </div>
                  ) : (
                    <form action={volunteerSignup} className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="note" maxLength={300} placeholder="A short note (optional)" aria-label="A short note" className={`${inputClass} flex-1 py-2 text-sm`} />
                      <Button size="sm" disabled={full}>{full ? "Enough people" : "I'll help"}</Button>
                    </form>
                  )
                )}
                {official && (
                  <details className="rounded-lg bg-muted/50 p-3 text-sm">
                    <summary className="cursor-pointer font-semibold">Who signed up ({lists[i].length}) and manage</summary>
                    {lists[i].length > 0 && (
                      <ul className="mt-2 flex flex-col divide-y">
                        {lists[i].map((s) => (
                          <li key={s.person_id} className="py-2">
                            <span className="font-semibold">{s.full_name}</span>{s.year_left ? `, Class of ${s.year_left}` : ""}{s.phone && <> · <a href={`tel:${s.phone}`} className="underline">{s.phone}</a></>}
                            {s.note && <span className="block text-muted-foreground">{s.note}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.status === "open" ? (
                        <>
                          <form action={setVolunteerRoleStatus}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="outline" name="status" value="closed">Close sign-ups</Button></form>
                          <ConfirmAction action={setVolunteerRoleStatus} fields={{ id: r.id, status: "cancelled" }} label="Cancel" title={`Cancel "${r.title}"?`} description="Members who signed up will see it as cancelled. Nothing is deleted." confirmLabel="Cancel it" />
                        </>
                      ) : (
                        <form action={setVolunteerRoleStatus}><input type="hidden" name="id" value={r.id} /><Button size="sm" variant="outline" name="status" value="open">Reopen</Button></form>
                      )}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
