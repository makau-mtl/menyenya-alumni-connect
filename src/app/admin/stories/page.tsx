import type { Metadata } from "next";
import Link from "next/link";
import { getStaff } from "@/lib/admin/staff";
import { storyStatus, type ReviewStory } from "@/lib/stories";
import { Empty, PageHeader, Panel, Pill, StatTiles } from "@/components/portal/page-parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "Stories" };

const when = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });


function StoryTable({ rows }: { rows: ReviewStory[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow><TableHead>Story</TableHead><TableHead>About</TableHead><TableHead>Sent by</TableHead><TableHead>Agreed</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="max-w-72 whitespace-normal">
              <Link href={`/admin/stories/${s.id}`} className="font-semibold text-tea hover:underline">{s.title}</Link>
              {s.featured && <span className="ml-2"><Pill tone="info">On the home page</Pill></span>}
            </TableCell>
            <TableCell>{s.subject_name}{s.subject_year_left ? ` (${s.subject_year_left})` : ""}</TableCell>
            <TableCell>{s.kind === "own" ? "Themselves" : s.kind === "impact" ? <span className="flex flex-col"><Pill tone="info">Impact story</Pill><span className="text-xs text-muted-foreground">{s.submitted_by_name}</span></span> : s.submitted_by_name}</TableCell>
            <TableCell>{s.consent_given ? <Pill tone="good">Yes</Pill> : <Pill tone="warn">Not yet</Pill>}</TableCell>
            <TableCell><Pill tone={storyStatus[s.status].tone}>{storyStatus[s.status].label}</Pill></TableCell>
            <TableCell>{when.format(new Date(s.created_at))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function AdminStoriesPage() {
  const staff = await getStaff();
  if (!staff?.canEditStories) return <p>Only administrators, the Secretary and the Chairman can review stories.</p>;
  const { data } = await staff.supabase.rpc("stories_for_review");
  const all = (data ?? []) as ReviewStory[];
  const waiting = all.filter((s) => s.status === "submitted");
  const live = all.filter((s) => s.status === "published");
  const other = all.filter((s) => s.status === "declined" || s.status === "archived");
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Alumni stories"
        description="Stories members share or suggest, and impact stories from our work. A story goes on the website only once you approve it and the person it is about has agreed (for a student: a parent or guardian, and the school)."
        actions={<>
          <Button asChild><Link href="/admin/stories/new">Write an impact story</Link></Button>
          <Button asChild variant="outline"><Link href="/stories">View the stories page</Link></Button>
        </>}
      />
      <StatTiles items={[
        { label: "Waiting for review", value: String(waiting.length) },
        { label: "On the website", value: String(live.length) },
        { label: "On the home page", value: String(live.filter((s) => s.featured).length), note: "Up to 3 are shown" },
        { label: "Not published or hidden", value: String(other.length) },
      ]} />
      <Panel title="Waiting for review" tone={waiting.length ? "attention" : "default"} description="Open a story to read it, tidy the wording, record consent and publish.">
        {waiting.length ? <StoryTable rows={waiting} /> : <Empty>Nothing waiting. New stories appear here.</Empty>}
      </Panel>
      <Panel title="On the website">
        {live.length ? <StoryTable rows={live} /> : <Empty>No stories published yet.</Empty>}
      </Panel>
      {other.length > 0 && (
        <Panel title="Not published or hidden" tone="quiet">
          <StoryTable rows={other} />
        </Panel>
      )}
    </div>
  );
}
