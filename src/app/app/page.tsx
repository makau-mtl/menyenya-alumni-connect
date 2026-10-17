import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { memberPhotoUrl } from "@/lib/members/photos";
import { signedPhotoUrls } from "@/lib/members/photo-urls";
import type { Meetup } from "@/components/member/meetup-card";
import { memoryUrls, type MemoryRow } from "@/lib/members/memories";
import { getStaff } from "@/lib/admin/staff";
import { buttonClass } from "@/components/ui";
import { rejoinMembership } from "@/app/app/actions";
import { type Standing } from "@/components/member/standing-card";
import { Dashboard, type ActionItem, type DashboardData } from "@/components/portal/dashboard";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCause, getCauseProgress, listNews } from "@/lib/data";

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

  const db = member.supabase;
  const [{ data: standingRows }, { data: p }, block, news, { data: statsRaw }, { data: schoolRows }, { data: results }, { data: priorities }, { data: confirmer }, { data: waiting }] =
    await Promise.all([
      db.rpc("my_standing"),
      db
        .from("member_profiles")
        .select("year_left, photo_path, registered_at, headline, linkedin_url, skills, clusters(name), membership_levels(name), member_categories(key, name)")
        .eq("person_id", member.personId!)
        .single(),
      getCause("tuition-block").catch(() => null),
      listNews().catch(() => []),
      db.rpc("dashboard_stats"),
      db.from("school_stats").select("as_of, students, needy_students, supported_by_alumni").order("as_of", { ascending: false }).order("created_at", { ascending: false }).limit(1),
      db.from("academic_results").select("year, measure, value, grade").order("year", { ascending: false }).limit(6),
      db.rpc("priority_summary"),
      db.rpc("is_confirmer"),
      db.rpc("confirmations_waiting"),
    ]);
  const [{ data: inviteToken }, { data: joined }, { data: group }, { data: meetups }, { data: memoryRows }, { data: myCases }] = await Promise.all([
    db.rpc("my_invite_link"),
    db.rpc("my_invites_joined"),
    db.rpc("my_class_group"),
    db.rpc("upcoming_meetups", { p_limit: 3 }),
    db.rpc("memory_feed", { p_limit: 6 }),
    db.from("support_cases").select("id, reference, title, status").eq("person_id", member.personId!).neq("status", "closed"),
  ]);
  const mem = (memoryRows ?? []) as MemoryRow[];
  const memUrls = await memoryUrls(db, mem.map((r) => r.photo_path), "small");
  const standing = (standingRows as Standing[] | null)?.[0] ?? null;
  const cat = p?.member_categories as unknown as { key: string; name: string } | null;
  const region = (p?.clusters as unknown as { name: string } | null)?.name;
  const level = (p?.membership_levels as unknown as { name: string } | null)?.name;
  const alumnus = cat?.key === "alumnus" && Boolean(p?.year_left);
  const stats = statsRaw as null | {
    total: number; alumni: number; friends: number; classes_represented: number; my_class_count: number | null; my_class_rank: number | null;
    my_region: string | null; regions: { name: string; count: number | null }[]; top_classes: { year: number; count: number }[];
    female: number | null; male: number | null; gender_answered: number; sponsors: number; partners: number; live_causes: number;
  };
  const progress = block ? await getCauseProgress(block.slug).catch(() => null) : null;
  const pri = (priorities ?? []) as { title: string; average: number | null; responses: number; my_importance: number | null }[];

  const checks = [!!p?.photo_path, !!p?.headline, !!p?.linkedin_url, (p?.skills?.length ?? 0) > 0];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const hour = Number(new Intl.DateTimeFormat("en-KE", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(new Date()));
  const classLabel = alumnus ? `Class of ${p!.year_left}` : null;
  const origin = await siteOrigin();
  const inviteText = `Hi! ${classLabel ? `Our ${classLabel} is` : "Menyenya alumni are"} getting together on mhs.alumni, the Menyenya SDA High School alumni platform. Join us here: ${origin}/join${inviteToken ? `?invite=${inviteToken}` : ""}`;
  const classmates = alumnus ? await classFaces(db, p!.year_left!, member.personId!) : [];
  const grp = ((group ?? []) as { whatsapp_url: string | null; can_edit: boolean }[])[0];

  // The action centre: everything waiting for this member.
  const actions: ActionItem[] = [];
  if (standing?.awaiting_confirmation) actions.push({ icon: "info", label: "Your membership is waiting for confirmation", detail: "A confirmer will check your details soon." });
  else if (standing?.in_grace) actions.push({ icon: "renew", urgent: true, label: `Renew for ${standing.this_year}`, detail: `Pay by 31 March to stay active and keep your vote.` });
  else if (standing?.standing === "inactive" && standing.fees_on) actions.push({ icon: "renew", urgent: true, label: `Become active for ${standing.this_year}`, detail: "Pay this year's membership to vote and take part in decisions." });
  const confirmCount = (waiting as unknown[] | null)?.length ?? 0;
  if (confirmer && confirmCount) actions.push({ icon: "confirm", href: "/app/confirm", label: "Members to confirm", count: confirmCount, urgent: true });
  const unrated = pri.filter((x) => !x.my_importance).length;
  if (unrated) actions.push({ icon: "vote", href: "/app/school#priorities", label: "Give your view on the school's priorities", detail: `${unrated} ${unrated === 1 ? "priority" : "priorities"} to rate` });
  for (const c of (myCases ?? []) as { reference: string; title: string; status: string }[]) {
    actions.push(
      c.status === "responded"
        ? { icon: "info", href: "/app/support", label: `Reply on your case ${c.reference}`, detail: c.title, urgent: true }
        : { icon: "info", href: "/app/support", label: `Your case ${c.reference} is ${c.status === "submitted" ? "sent" : "being reviewed"}`, detail: c.title },
    );
  }
  actions.push(...(await staffActions(staff)));

  const latest = (schoolRows ?? [])[0] as { as_of: string; students: number; needy_students: number | null; supported_by_alumni: number | null } | undefined;
  const res = ((results ?? []) as { year: number; measure: string; value: number; grade: string | null }[]).slice().reverse();

  const data: DashboardData = {
    firstName: (member.fullName ?? "").split(/\s+/)[0] || "there",
    greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening",
    card: {
      name: member.fullName ?? "",
      photo: await memberPhotoUrl(db, p?.photo_path ?? null, "small"),
      lines: [classLabel ?? cat?.name ?? "", region ? `${region} region` : "", level ? `${level} level` : ""].filter(Boolean),
      active: standing?.standing ? standing.standing === "active" : null,
      standingLabel: standing?.awaiting_confirmation ? "Awaiting confirmation" : standing?.standing === "active" ? "Active" : "Inactive",
      since: p?.registered_at ? new Date(p.registered_at).getFullYear() : null,
    },
    profile: {
      pct,
      selfLink: `/app/directory/${member.personId}`,
      checks: [
        { label: "A passport-style photo", done: checks[0], href: "/app/profile#photo" },
        { label: "A one-line summary", done: checks[1], href: "/app/profile#work" },
        { label: "Your LinkedIn link", done: checks[2], href: "/app/profile#work" },
        { label: "Your skills", done: checks[3], href: "/app/profile#work" },
      ],
    },
    actions,
    myClass: alumnus && stats
      ? {
          label: classLabel!,
          count: Math.max(0, (stats.my_class_count ?? 1) - 1),
          rank: stats.my_class_rank,
          of: stats.classes_represented,
          directory: `/app/directory?year=${p!.year_left}`,
          invite: `https://wa.me/?text=${encodeURIComponent(inviteText)}`,
          year: p!.year_left!,
          joined: Number(joined ?? 0),
          faces: classmates,
          whatsapp: { url: grp?.whatsapp_url ?? null, canEdit: Boolean(grp?.can_edit) },
        }
      : null,
    community: stats
      ? {
          total: stats.total, alumni: stats.alumni, friends: stats.friends, classes: stats.classes_represented,
          topClasses: stats.top_classes.map((c) => ({ label: `Class of ${c.year}`, value: c.count, href: `/app/directory?year=${c.year}` })),
          regions: stats.regions.map((r) => ({ label: r.name, value: r.count, href: `/app/directory?region=${encodeURIComponent(r.name)}` })),
          myRegion: stats.my_region,
          gender: { female: stats.female, male: stats.male, answered: stats.gender_answered },
        }
      : null,
    initiatives: {
      tuition: block?.targetAmount && progress ? { pledged: progress.pledged, target: block.targetAmount } : null,
      sponsors: stats?.sponsors ?? 0, partners: stats?.partners ?? 0, liveCauses: stats?.live_causes ?? 0,
    },
    school: {
      asOf: latest ? new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(new Date(latest.as_of)) : null,
      students: latest?.students ?? null, needy: latest?.needy_students ?? null, supported: latest?.supported_by_alumni ?? null,
      results: res.map((r) => ({ label: String(r.year), value: Number(r.value), grade: r.grade })),
      measure: res.at(-1)?.measure ?? null,
      priorities: pri.map((x) => ({ title: x.title, average: x.average === null ? null : Number(x.average), responses: Number(x.responses) })),
    },
    meetups: (meetups ?? []) as Meetup[],
    memories: mem.map((r) => ({ id: r.id, photo: memUrls.get(r.photo_path) ?? null, caption: r.caption, name: r.full_name })),
    news: news.slice(0, 4).map((n) => ({ slug: n.slug, title: n.title, date: n.date, kind: n.kind })),
  };
  return <Dashboard d={data} />;
}

/** Up to 8 classmates for the faces strip (photos only where members may see them). */
async function classFaces(db: SupabaseClient, year: number, me: string) {
  const { data } = await db.rpc("directory_search", { p_year: year, p_limit: 12 });
  const rows = ((data ?? []) as { person_id: string; full_name: string; photo_path: string | null }[]).filter((r) => r.person_id !== me);
  rows.sort((a, b) => Number(Boolean(b.photo_path)) - Number(Boolean(a.photo_path)));
  const top = rows.slice(0, 8);
  const urls = await signedPhotoUrls(db, top.map((r) => r.photo_path), "small");
  return top.map((r) => ({ name: r.full_name, photo: r.photo_path ? urls.get(r.photo_path) ?? null : null }));
}

async function siteOrigin() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

/** Things waiting for this person in the admin area (none for ordinary members). */
async function staffActions(staff: Awaited<ReturnType<typeof getStaff>>): Promise<ActionItem[]> {
  if (!staff) return [];
  const count = async (table: string, column: string, value: string) =>
    (await staff.supabase.from(table).select("id", { count: "exact", head: true }).eq(column, value)).count ?? 0;
  const [enquiries, orders, dupes, reported, cases, stories] = await Promise.all([
    staff.isAdmin ? count("support_enquiries", "status", "new") : 0,
    staff.canManageShop ? count("merch_orders", "status", "new") : 0,
    staff.isAdmin || staff.isVerifier ? count("duplicate_flags", "status", "open") : 0,
    staff.isAdmin ? count("memory_reports", "status", "open") : 0,
    staff.canHandleCases ? count("support_cases", "status", "submitted") : 0,
    staff.canEditStories ? count("alumni_stories", "status", "submitted") : 0,
  ]);
  const out: ActionItem[] = [];
  if (enquiries) out.push({ icon: "admin", href: "/admin/support", label: "New sponsor and partner enquiries", count: enquiries });
  if (orders) out.push({ icon: "admin", href: "/admin/shop", label: "New merchandise orders", count: orders });
  if (cases) out.push({ icon: "admin", href: "/admin/cases", label: "New cases for support", count: cases, urgent: true });
  if (reported) out.push({ icon: "admin", href: "/app/memories?reported=1", label: "Reported memories to review", count: reported, urgent: true });
  if (stories) out.push({ icon: "admin", href: "/admin/stories", label: "Alumni stories to review", count: stories });
  if (dupes) out.push({ icon: "admin", href: "/admin/duplicates", label: "Possible duplicate records", count: dupes });
  return out;
}
