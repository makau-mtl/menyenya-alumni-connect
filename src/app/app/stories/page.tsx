import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { storyStatus } from "@/lib/stories";
import { StoryForm } from "@/components/member/story-form";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Share a story" };

const when = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function MemberStoriesPage() {
  const member = await getMember();
  if (!member?.registered) redirect("/login?next=/app/stories");
  const { data } = await member.supabase
    .from("alumni_stories")
    .select("id, slug, kind, subject_name, title, status, created_at")
    .eq("submitted_by", member.personId!)
    .order("created_at", { ascending: false });
  const mine = (data ?? []) as { id: string; slug: string | null; kind: string; subject_name: string; title: string; status: string; created_at: string }[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/app", label: "Dashboard" }}
        eyebrow="Alumni stories"
        title="Share a story"
        description="Your journey since Menyenya, or someone else's: a classmate who made it, a teacher who changed lives. Good stories inspire students and bring alumni home."
        actions={<Button asChild variant="outline"><Link href="/stories">Read the stories</Link></Button>}
      />
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Panel title="Your story">
          <StoryForm myName={member.fullName ?? "you"} />
        </Panel>
        <Panel title="What you've sent" tone="quiet">
          {mine.length === 0 ? (
            <Empty>Nothing yet. Stories you send appear here with where they are in review.</Empty>
          ) : (
            <ul className="flex flex-col divide-y">
              {mine.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{s.title}</span>
                    <Pill tone={storyStatus[s.status].tone}>{storyStatus[s.status].label}</Pill>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {s.kind === "own" ? "Your own story" : `About ${s.subject_name}`} · {when.format(new Date(s.created_at))}
                  </span>
                  {s.status === "published" && s.slug && (
                    <Link href={`/stories/${s.slug}`} className="text-sm font-semibold text-tea hover:underline">See it on the website →</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
