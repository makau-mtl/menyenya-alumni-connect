/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { memberPhotoUrl } from "@/lib/members/photos";
import { buttonClass } from "@/components/ui";

const statusLabel: Record<string, string> = {
  registered: "Registered. Your details will be confirmed by the association.",
  verified: "Verified member",
  active: "Active member",
  lapsed: "Membership lapsed",
  exited: "Left the association",
};

export default async function MemberHome() {
  const member = await getMember();
  if (!member) redirect("/login?next=/app");
  const staff = await getStaff();
  const staffLink =
    staff && (staff.isAdmin || staff.isFinance || staff.canEditNews) ? (
      <Link href="/admin" className={buttonClass("secondary")}>Open the admin area</Link>
    ) : null;

  if (!member.registered) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold">My account</h1>
        <p className="mt-4 text-lg text-ink-soft">Signed in as {member.email}. You haven&rsquo;t finished registering yet.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/join" className={buttonClass("primary", "lg")}>Finish registering</Link>
          {staffLink}
        </div>
      </div>
    );
  }

  const { data: p } = await member.supabase
    .from("member_profiles")
    .select("year_left, membership_status, photo_path, headline, linkedin_url, profession, skills, clusters(name), membership_levels(name), member_categories(key, name)")
    .eq("person_id", member.personId!)
    .single();
  const photo = await memberPhotoUrl(member.supabase, p?.photo_path ?? null, "small");
  const checks = [
    { done: !!p?.photo_path, label: "A passport-style photo" },
    { done: !!p?.headline, label: "A one-line summary of what you do" },
    { done: !!p?.linkedin_url, label: "Your LinkedIn link" },
    { done: (p?.skills?.length ?? 0) > 0, label: "Your skills" },
  ];
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  const cat = p?.member_categories as unknown as { key: string; name: string } | null;
  const region = (p?.clusters as unknown as { name: string } | null)?.name;
  const level = (p?.membership_levels as unknown as { name: string } | null)?.name;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-5">
        {photo ? (
          <img src={photo} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <span aria-hidden className="flex size-20 items-center justify-center rounded-full bg-tea-tint font-display text-2xl font-bold text-tea">
            {(member.fullName ?? "").split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
          </span>
        )}
        <div>
          <h1 className="text-4xl font-bold">{member.fullName}</h1>
          <dl className="mt-3 flex flex-wrap gap-y-2 text-[0.95rem]">
            {[
              { k: cat?.key === "alumnus" ? "Class" : "Membership", v: cat?.key === "alumnus" ? `Class of ${p?.year_left}` : cat?.name },
              { k: "Regional cluster", v: region },
              { k: "Membership level", v: level },
            ]
              .filter((x) => x.v)
              .map((x) => (
                <div key={x.k} className="mr-6">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{x.k}</dt>
                  <dd className="font-semibold">{x.v}</dd>
                </div>
              ))}
          </dl>
        </div>
      </div>

      <p className="max-w-2xl rounded-md bg-tea-tint px-4 py-3">{statusLabel[p?.membership_status ?? "registered"]}</p>

      <section className="max-w-2xl rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold">Your profile</h2>
          <p className="font-semibold text-tea">{pct}% complete</p>
        </div>
        <div aria-hidden className="mt-3 h-2 rounded-full bg-line">
          <div className="h-2 rounded-full bg-tea" style={{ width: `${pct}%` }} />
        </div>
        <ul className="mt-5 flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3">
              <span aria-hidden className={`flex size-6 items-center justify-center rounded-full text-sm font-bold ${c.done ? "bg-tea text-white" : "border-2 border-line"}`}>
                {c.done ? "✓" : ""}
              </span>
              <span className={c.done ? "" : "text-ink-soft"}>{c.label}<span className="sr-only">{c.done ? " (done)" : " (to do)"}</span></span>
            </li>
          ))}
        </ul>
        <Link href="/app/profile" className={`${buttonClass("primary")} mt-6`}>
          {pct < 100 ? "Continue building my profile" : "Edit my profile"}
        </Link>
      </section>

      <section className="max-w-2xl">
        <h2 className="text-2xl font-bold">Coming in January</h2>
        <p className="mt-2 text-ink-soft">
          The member directory with photos and filters, your giving history, and events in your class and region.
        </p>
        {staffLink && <div className="mt-6">{staffLink}</div>}
      </section>
    </div>
  );
}
