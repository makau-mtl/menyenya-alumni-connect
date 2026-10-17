/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStaff } from "@/lib/admin/staff";
import { addCausePhoto, changeCausePhoto } from "@/app/admin/actions";
import { toPhoto } from "@/lib/photos";
import { CauseForm } from "@/components/admin/cause-form";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { inputClass } from "@/components/ui";
import { CauseVideoForm } from "@/components/admin/cause-video-form";
import { CheckCircle2, Circle } from "lucide-react";

export const metadata: Metadata = { title: "Edit cause" };

type Props = { params: Promise<{ slug: string }> };

const linkButton = "rounded-md border border-line px-2.5 py-1 text-sm font-semibold hover:border-ink";

export default async function EditCausePage({ params }: Props) {
  const { slug } = await params;
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can edit causes.</p>;

  const { data: cause } = await staff.supabase
    .from("causes")
    .select("id, slug, title, summary, story, components, readiness, target_amount, lifecycle, visibility, pledges_enabled, kind, video_url, video_title, video_speaker, launch_kit_required")
    .eq("slug", slug)
    .maybeSingle();
  if (!cause) notFound();

  const { data: photoRows } = await staff.supabase
    .from("cause_photos")
    .select("id, path, caption, status, sort_order, purpose")
    .eq("cause_id", cause.id)
    .order("sort_order")
    .order("created_at");
  const photos = (photoRows ?? []).map((p) => ({ ...p, ...toPhoto(p.path, p.caption) }));
  const firstShown = photos.find((p) => p.status === "published");
  const shown = photos.filter((p) => p.status === "published");
  const { count: impactCount } = await staff.supabase.from("impact_figures").select("id", { count: "exact", head: true }).eq("cause_id", cause.id).eq("status", "published");
  const kit = [
    { label: "A clear summary (a sentence or two)", done: (cause.summary ?? "").length >= 40, required: false },
    { label: "The story: why it matters", done: (cause.story ?? []).length >= 2, required: false },
    { label: "A short video with its caption", done: Boolean(cause.video_url && cause.video_title), required: true },
    { label: "A cover photo", done: shown.length >= 1, required: true },
    { label: "At least three photos", done: shown.length >= 3, required: true },
    ...(cause.kind === "campaign" ? [{ label: "Photos of the design (drawings or 3D views)", done: shown.some((p) => p.purpose === "design"), required: false }] : []),
    { label: "First impact figures (once there are results; Admin → Impact)", done: (impactCount ?? 0) > 0, required: false },
  ];
  const kitDone = kit.filter((k) => k.done).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/admin/causes", label: "All causes" }}
        eyebrow="Cause"
        title={cause.title}
        actions={<Button asChild variant="outline"><Link href={`/causes/${cause.slug}`}>View on the website</Link></Button>}
      />

      <Panel
        title="Ready to market"
        tone={kit.every((k) => k.done || !k.required) ? "default" : "attention"}
        className="max-w-5xl"
        description={cause.launch_kit_required
          ? "A new initiative can't go public (Preparing, Live or Construction) until the items marked Required are done."
          : "A guide: this initiative was already public before the launch kit was introduced."}
      >
        <p className="mb-3 text-sm font-semibold">{kitDone} of {kit.length} done</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {kit.map((k) => (
            <li key={k.label} className="flex items-start gap-2 text-sm">
              {k.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-tea" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              <span className={k.done ? "" : "text-muted-foreground"}>{k.label}{k.required && !k.done && cause.launch_kit_required && <span className="ml-2"><Pill tone="warn">Required</Pill></span>}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <CauseForm
        cause={{
          slug: cause.slug,
          title: cause.title,
          summary: cause.summary,
          story: cause.story ?? [],
          components: cause.components ?? [],
          readiness: cause.readiness ?? [],
          targetAmount: cause.target_amount === null ? null : Number(cause.target_amount),
          lifecycle: cause.lifecycle,
          visibility: cause.visibility,
          pledgesEnabled: cause.pledges_enabled,
        }}
      />

      <Panel
        title="Video"
        className="max-w-5xl"
        description="One short video (1 to 2 minutes is best) shown large at the top of the page and on the Our work list. Add subtitles: most people watch with the sound off."
      >
        <CauseVideoForm slug={cause.slug} initial={cause.video_url ? { url: cause.video_url, title: cause.video_title ?? "", speaker: cause.video_speaker ?? "" } : null} />
      </Panel>

      <Panel
        title="Photos"
        className="max-w-5xl"
        description="The first photo is the cover on cards and listings. Say what each photo shows (the design, today, progress, impact) so the page groups them. Hidden photos stay on file but don't show on the website. Only use photos of students with the school's and parents' consent."
      >

        {photos.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id} className={`rounded-lg bg-muted/40 p-3 ring-1 ring-border ${p.status !== "published" ? "opacity-60" : ""}`}>
                <img src={p.srcSmall} alt={p.caption} className="aspect-[4/3] w-full rounded-lg bg-line object-cover" loading="lazy" />
                <p className="mt-2">
                  <Pill tone={p.id === firstShown?.id ? "info" : p.status === "published" ? "good" : "muted"}>{p.id === firstShown?.id ? "Cover photo" : p.status === "published" ? "Shown" : "Hidden"}</Pill>
                </p>
                <form action={changeCausePhoto} className="mt-2 flex gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="change" value="caption" />
                  <input name="caption" defaultValue={p.caption} aria-label="Caption" placeholder="Caption" maxLength={200} className={`${inputClass} py-1.5 text-sm`} />
                  <button type="submit" className={linkButton}>Save</button>
                </form>
                <form action={changeCausePhoto} className="mt-2 flex gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="change" value="purpose" />
                  <select name="purpose" defaultValue={p.purpose} aria-label="What the photo shows" className={`${inputClass} py-1.5 text-sm`}>
                    <option value="design">The design</option>
                    <option value="today">Today (the need)</option>
                    <option value="progress">Progress</option>
                    <option value="impact">Impact</option>
                    <option value="general">Other</option>
                  </select>
                  <button type="submit" className={linkButton}>Save</button>
                </form>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.status === "published" && p.id !== firstShown?.id && (
                    <form action={changeCausePhoto}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" name="change" value="cover" className={linkButton}>Make cover</button>
                    </form>
                  )}
                  <form action={changeCausePhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" name="change" value={p.status === "published" ? "hide" : "show"} className={linkButton}>
                      {p.status === "published" ? "Hide" : "Show again"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 max-w-md rounded-lg border-2 border-dashed border-border p-5">
          <PhotoUpload action={addCausePhoto} fields={{ slug: cause.slug }} />
        </div>
      </Panel>
    </div>
  );
}
