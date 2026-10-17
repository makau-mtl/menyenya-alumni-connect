import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStaff } from "@/lib/admin/staff";
import { storyPhotoUrls, storyStatus, type ReviewStory } from "@/lib/stories";
import { StoryEditor } from "@/components/admin/story-editor";
import { PageHeader, Panel, Pill } from "@/components/portal/page-parts";

export const metadata: Metadata = { title: "Review a story" };

const when = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function ReviewStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff?.canEditStories) return <p>Only administrators, the Secretary and the Chairman can review stories.</p>;
  const { id } = await params;
  const { data } = await staff.supabase.rpc("stories_for_review");
  const s = ((data ?? []) as ReviewStory[]).find((x) => x.id === id);
  if (!s) notFound();
  const { data: causes } = await staff.supabase.from("causes").select("id, title").order("sort_order");
  const photo = s.photo_path ? (await storyPhotoUrls(staff.supabase, [s.photo_path], "small")).get(s.photo_path) ?? null : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/admin/stories", label: "Alumni stories" }}
        title={s.title}
        description={<span className="flex flex-wrap items-center gap-2"><Pill tone={storyStatus[s.status].tone}>{storyStatus[s.status].label}</Pill> Sent {when.format(new Date(s.created_at))}</span>}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
        <Panel>
          <StoryEditor story={s} photo={photo} causes={(causes ?? []) as { id: string; title: string }[]} />
        </Panel>
        <Panel title="About this story" tone="quiet">
          <dl className="flex flex-col gap-3 text-sm">
            <div><dt className="font-semibold">{s.kind === "impact" ? "Written by" : "Sent by"}</dt><dd>{s.submitted_by_name}{s.kind === "own" ? " (their own story)" : s.kind === "impact" ? " (impact story)" : ""}</dd></div>
            {s.kind === "nomination" && (
              <div><dt className="font-semibold">How to reach {s.subject_name}</dt><dd>{s.subject_contact || "Not given. Ask the person who sent it."}</dd></div>
            )}
            <div>
              <dt className="font-semibold">Before publishing</dt>
              <dd className="text-muted-foreground">
                {s.kind === "own"
                  ? "The member agreed when sending it. Check the facts and the wording."
                  : s.kind === "impact"
                    ? "For a current student: get the agreement of a parent or guardian and the school, use a first name only, and show a face only with that agreement. Record how they agreed."
                    : "Contact the person, read the story to them, and record how they agreed."}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
