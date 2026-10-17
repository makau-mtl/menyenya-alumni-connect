import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { memberPhotoUrl } from "@/lib/members/photos";
import { getStaff } from "@/lib/admin/staff";
import { buttonClass } from "@/components/ui";
import { rejoinMembership } from "@/app/app/actions";
import { standingText, type Standing } from "@/components/member/standing-card";
import { Dashboard, type DashboardData } from "@/components/portal/dashboard";
import { getCause, getCauseProgress, listNews } from "@/lib/data";
import type { Member } from "@/lib/members/session";

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

  if (member.membershipStatus === "terminated") {
    const { data: t } = await member.supabase
      .from("member_profiles")
      .select("terminated_at, rejoin_until, deletion_requested_at")
      .eq("person_id", member.personId!)
      .single();
    const until = t?.rejoin_until ? new Date(t.rejoin_until) : null;
    const open = until ? until > new Date() : false;
    const fmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Nairobi" });
    return (
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold">{member.fullName}</h1>
        <p className="mt-4 rounded-md border-2 border-alert/40 bg-alert/5 px-4 py-3 font-semibold">
          Membership terminated{t?.terminated_at ? ` on ${fmt.format(new Date(t.terminated_at))}` : ""}.
        </p>
        {t?.deletion_requested_at && (
          <p className="mt-4 text-ink-soft">
            You asked for your personal data to be deleted. It will be carried out{until ? ` after ${fmt.format(until)}` : ""}, and you will be emailed a certificate.
          </p>
        )}
        {open ? (
          <form action={rejoinMembership} className="mt-8">
            <p className="mb-4">You can rejoin until <strong>{until ? fmt.format(until) : ""}</strong>, with everything restored as it was{t?.deletion_requested_at ? ", and the deletion request cancelled" : ""}.</p>
            <button type="submit" className={buttonClass("primary", "lg")}>Rejoin the association</button>
          </form>
        ) : (
          <p className="mt-8 text-ink-soft">The rejoin window has closed. To become a member again, please contact the secretariat.</p>
        )}
      </div>
    );
  }

  const [{ data: standingRows }, { data: p }, block, news] = await Promise.all([
    member.supabase.rpc("my_standing"),
    member.supabase
      .from("member_profiles")
      .select("year_left, photo_path, registered_at, headline, linkedin_url, skills, clusters(name), membership_levels(name), member_categories(key, name)")
      .eq("person_id", member.personId!)
      .single(),
    getCause("tuition-block").catch(() => null),
    listNews().catch(() => []),
  ]);
  const standing = (standingRows as Standing[] | null)?.[0] ?? null;
  const cat = p?.member_categories as unknown as { key: string; name: string } | null;
  const region = (p?.clusters as unknown as { name: string } | null)?.name;
  const level = (p?.membership_levels as unknown as { name: string } | null)?.name;
  const alumnus = cat?.key === "alumnus" && Boolean(p?.year_left);

  const [{ data: mates }, progress, tasks] = await Promise.all([
    member.supabase.rpc("directory_search", alumnus ? { p_year: p!.year_left, p_limit: 1 } : { p_limit: 1 }),
    block ? getCauseProgress(block.slug).catch(() => null) : Promise.resolve(null),
    staffTasks(staff, member.supabase),
  ]);
  const checks = [
    { done: !!p?.photo_path, label: "A passport-style photo" },
    { done: !!p?.headline, label: "A one-line summary of what you do" },
    { done: !!p?.linkedin_url, label: "Your LinkedIn link" },
    { done: (p?.skills?.length ?? 0) > 0, label: "Your skills" },
  ];
  const hour = Number(new Intl.DateTimeFormat("en-KE", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(new Date()));

  const data: DashboardData = {
    firstName: (member.fullName ?? "").split(/\s+/)[0] || "there",
    greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
    card: {
      name: member.fullName ?? "",
      photo: await memberPhotoUrl(member.supabase, p?.photo_path ?? null, "small"),
      lines: [alumnus ? `Class of ${p!.year_left}` : cat?.name ?? "", region ? `${region} region` : "", level ? `${level} level` : ""].filter(Boolean),
      active: standing?.standing ? standing.standing === "active" : null,
      standingLabel: standing?.awaiting_confirmation ? "Awaiting confirmation" : standing?.standing === "active" ? "Active" : "Inactive",
      since: p?.registered_at ? new Date(p.registered_at).getFullYear() : null,
    },
    standing: standing ? standingText(standing) : null,
    profile: { pct: Math.round((checks.filter((c) => c.done).length / checks.length) * 100), checks },
    classmates: {
      label: alumnus ? `Class of ${p!.year_left}` : "Members",
      count: Number((mates as { total: number }[] | null)?.[0]?.total ?? 0),
      href: alumnus ? `/app/directory?year=${p!.year_left}` : "/app/directory",
    },
    tuition: block?.targetAmount && progress ? { pledged: progress.pledged, received: progress.received, target: block.targetAmount } : null,
    news: news.slice(0, 3).map((n) => ({ slug: n.slug, title: n.title, date: n.date, kind: n.kind })),
    tasks,
  };
  return <Dashboard d={data} />;
}

/** Counts of things waiting for this person in the admin area (empty for ordinary members). */
async function staffTasks(staff: Awaited<ReturnType<typeof getStaff>>, db: Member["supabase"]) {
  const tasks: DashboardData["tasks"] = [];
  const { data: waiting } = await db.rpc("confirmations_waiting");
  const confirm = (waiting as unknown[] | null)?.length ?? 0;
  if (confirm) tasks.push({ label: "Members to confirm", count: confirm, href: "/app/confirm" });
  if (!staff) return tasks;
  const count = async (table: string, column: string, value: string) =>
    (await staff.supabase.from(table).select("id", { count: "exact", head: true }).eq(column, value)).count ?? 0;
  const [enquiries, orders, dupes] = await Promise.all([
    staff.isAdmin ? count("support_enquiries", "status", "new") : 0,
    staff.canManageShop ? count("merch_orders", "status", "new") : 0,
    staff.isAdmin || staff.isVerifier ? count("duplicate_flags", "status", "open") : 0,
  ]);
  if (enquiries) tasks.push({ label: "New sponsor and partner enquiries", count: enquiries, href: "/admin/support" });
  if (orders) tasks.push({ label: "New merchandise orders", count: orders, href: "/admin/shop" });
  if (dupes) tasks.push({ label: "Possible duplicate records", count: dupes, href: "/admin/duplicates" });
  return tasks;
}
