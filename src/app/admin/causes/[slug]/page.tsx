/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
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
    <div className="flex flex-col gap-14">
      <div>
        <Link href="/admin/causes" className="font-semibold text-tea underline underline-offset-4">
          All causes
        </Link>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-3xl font-bold">{cause.title}</h2>
          <Link href={`/causes/${cause.slug}`} className="font-semibold text-tea underline underline-offset-4">
            View on the website
          </Link>
        </div>
      </div>

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

      <section className="max-w-4xl">
        <h2 className="text-2xl font-bold">Photos</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          The first photo is the cover on cards and listings. Hidden photos stay on file but don&rsquo;t show on the
          website. Only use photos of students with the school&rsquo;s and parents&rsquo; consent.
        </p>

        {photos.length > 0 && (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <li key={p.id} className={`rounded-xl border border-line bg-surface p-3 ${p.status !== "published" ? "opacity-60" : ""}`}>
                <img src={p.srcSmall} alt={p.caption} className="aspect-[4/3] w-full rounded-lg bg-line object-cover" loading="lazy" />
                <p className="mt-2 text-sm font-semibold">
                  {p.id === firstShown?.id ? "Cover photo" : p.status === "published" ? "Shown" : "Hidden"}
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

        <div className="mt-6 max-w-md rounded-xl border border-dashed border-ink-soft/50 p-5">
          <PhotoUpload action={addCausePhoto} fields={{ slug: cause.slug }} />
        </div>
      </section>
    </div>
  );
}
