import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, CalendarClock, ExternalLink, Mail, MapPin } from "lucide-react";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { profileForMatching } from "@/lib/members/profile-for-matching";
import { matchScore, shortDate, workTypes, type JobRow } from "@/lib/opportunities";
import { JobForm } from "@/components/member/opportunity-forms";
import { OpportunityTabs, PostControls, posterLine } from "@/components/opportunities/parts";
import { Empty, PageHeader, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Jobs" };

type Props = { searchParams: Promise<{ show?: string }> };

export default async function JobsPage({ searchParams }: Props) {
  const member = await getMember();
  if (!member?.registered || member.membershipStatus === "terminated") redirect("/login?next=/app/opportunities/jobs");
  const show = (await searchParams).show;
  const [{ data }, profile, staff, { data: official }] = await Promise.all([
    member.supabase.rpc("open_jobs"),
    profileForMatching(member.supabase, member.personId!),
    getStaff(),
    member.supabase.rpc("can_post_volunteer"),
  ]);
  const isAdmin = Boolean(staff?.isAdmin);
  const all = (data ?? []) as JobRow[];
  const scored = all.map((j) => ({ j, score: matchScore(`${j.title} ${j.field} ${j.description} ${j.organisation}`, j.location, profile) }));
  const forYou = scored.filter((s) => s.score > 0 || s.j.from_association).sort((a, b) => b.score - a.score);
  const showAll = show === "all" || forYou.length === 0;
  const list = showAll ? scored.map((s) => s.j) : forYou.map((s) => s.j);
  const reported = isAdmin ? all.filter((j) => j.reports) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Opportunities"
        title="Jobs"
        description="Jobs, internships and attachments shared by fellow alumni and the association. Help a Menyenya alumnus get hired."
        actions={<JobForm official={official === true} />}
      />
      <OpportunityTabs active="/app/opportunities/jobs" />
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant={showAll ? "outline" : "default"}><Link href="/app/opportunities/jobs">For you</Link></Button>
        <Button asChild size="sm" variant={showAll ? "default" : "outline"}><Link href="/app/opportunities/jobs?show=all">All jobs ({all.length})</Link></Button>
        {!showAll && <p className="text-sm text-muted-foreground">Matched to your profession, skills and county. <Link href="/app/profile#work" className="underline">Update them</Link> for better matches.</p>}
        {show !== "all" && forYou.length === 0 && all.length > 0 && <p className="text-sm text-muted-foreground">Nothing matches your profile yet, so here is everything.</p>}
      </div>
      {isAdmin && reported.length > 0 && <p className="rounded-lg bg-alert/10 p-3 text-sm font-semibold text-alert">{reported.length} reported {reported.length === 1 ? "post needs" : "posts need"} a look (marked below).</p>}

      {list.length === 0 ? (
        <Empty>No open jobs yet. Know of one? Post it: a job shared here can change a fellow alumnus&rsquo;s life.</Empty>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((j) => (
            <li key={j.id} className="flex flex-col gap-3 rounded-xl bg-card p-5 shadow-sm ring-1 ring-border">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold leading-snug">{j.title}</h2>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Building2 className="size-4" /> {j.organisation}</span>
                    <span className="flex items-center gap-1"><MapPin className="size-4" /> {j.location}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {j.from_association && <Pill tone="info">From the association</Pill>}
                  <Pill tone="good">{workTypes[j.work_type]}</Pill>
                </div>
              </div>
              {j.description && <p className="line-clamp-4 whitespace-pre-line text-sm">{j.description}</p>}
              <p className="flex items-center gap-1 text-sm text-muted-foreground"><CalendarClock className="size-4" /> Closes {shortDate.format(new Date(j.closes_on))} · shared by {posterLine(j.poster, j.poster_year)}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <div className="flex flex-wrap gap-2">
                  {j.apply_url && <Button asChild size="sm"><a href={j.apply_url} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink /> Apply</a></Button>}
                  {j.apply_email && <Button asChild size="sm" variant={j.apply_url ? "outline" : "default"}><a href={`mailto:${j.apply_email}?subject=${encodeURIComponent(`Application: ${j.title}`)}`}><Mail /> Apply by email</a></Button>}
                </div>
                <PostControls type="job" id={j.id} mine={j.mine} isAdmin={isAdmin} reports={j.reports} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">Be careful: genuine employers never ask applicants to pay. Report anything suspicious with the flag.</p>
    </div>
  );
}
