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

export const metadata: Metadata = { title: "Edit cause" };

type Props = { params: Promise<{ slug: string }> };

const linkButton = "rounded-md border border-line px-2.5 py-1 text-sm font-semibold hover:border-ink";

export default async function EditCausePage({ params }: Props) {
  const { slug } = await params;
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can edit causes.</p>;

  const { data: cause } = await staff.supabase
    .from("causes")
    .select("id, slug, title, summary, story, components, readiness, target_amount, lifecycle, visibility, pledges_enabled")
    .eq("slug", slug)
    .maybeSingle();
  if (!cause) notFound();

  const { data: photoRows } = await staff.supabase
    .from("cause_photos")
    .select("id, path, caption, status, sort_order")
    .eq("cause_id", cause.id)
    .order("sort_order")
    .order("created_at");
  const photos = (photoRows ?? []).map((p) => ({ ...p, ...toPhoto(p.path, p.caption) }));
  const firstShown = photos.find((p) => p.status === "published");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/admin/causes", label: "All causes" }}
        eyebrow="Cause"
        title={cause.title}
        actions={<Button asChild variant="outline"><Link href={`/causes/${cause.slug}`}>View on the website</Link></Button>}
      />

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
        title="Photos"
        className="max-w-5xl"
        description="The first photo is the cover on cards and listings. Hidden photos stay on file but don't show on the website. Only use photos of students with the school's and parents' consent."
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
