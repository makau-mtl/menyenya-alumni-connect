/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { removeSitePhoto, setSitePhoto } from "@/app/admin/actions";
import { toPhoto } from "@/lib/photos";
import { photoSpaces } from "@/content/photo-spaces";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { VideoForm } from "@/components/admin/video-form";

export const metadata: Metadata = { title: "Photos and video" };

const pageLinks: Record<string, string> = {
  Home: "/",
  "Home and Who we are": "/who-we-are",
  "Who we are": "/who-we-are",
  "Ways to give": "/ways-to-give",
  Join: "/join",
  Careers: "/careers",
};

export default async function AdminSitePage() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can change site photos and the video.</p>;

  const [{ data: video }, { data: photoRows }] = await Promise.all([
    staff.supabase.from("site_settings").select("value").eq("key", "chair_video").maybeSingle(),
    staff.supabase.from("site_photos").select("slot, path, caption, status"),
  ]);
  const videoId = (video?.value as { youtubeId?: string | null } | undefined)?.youtubeId ?? null;
  const photos = new Map(
    (photoRows ?? []).filter((r) => r.status === "published").map((r) => [r.slot, toPhoto(r.path, r.caption)]),
  );
  const pages = [...new Set(photoSpaces.map((s) => s.page))];
  const filled = photoSpaces.filter((s) => photos.has(s.key)).length;

  return (
    <div className="flex flex-col gap-14">
      <section>
        <h2 className="text-2xl font-bold">The Chairman&rsquo;s video</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">Shown on the home page under &ldquo;A message from our Chairman&rdquo;.</p>
        <div className="mt-5">
          <VideoForm current={videoId} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Website photos</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          {filled} of {photoSpaces.length} photo spaces filled. Each space says what belongs in it. Photos are shrunk
          before upload so pages load quickly on phones. Cause photos are added on each cause&rsquo;s page, and news
          photos on each post. Only use photos of students with the school&rsquo;s and parents&rsquo; consent.
        </p>

        {pages.map((page) => (
          <div key={page} className="mt-10">
            <h3 className="flex flex-wrap items-baseline gap-3 text-xl font-bold">
              {page}
              {pageLinks[page] && (
                <Link href={pageLinks[page]} className="text-base font-semibold text-tea underline underline-offset-4">
                  View page
                </Link>
              )}
            </h3>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {photoSpaces
                .filter((s) => s.page === page)
                .map((s) => {
                  const photo = photos.get(s.key);
                  return (
                    <li key={s.key} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                      <p className="font-semibold first-letter:uppercase">{s.label}</p>
                      {photo ? (
                        <>
                          <img src={photo.srcSmall} alt={photo.caption || s.label} className="aspect-[4/3] w-full rounded-lg bg-line object-cover" loading="lazy" />
                          {photo.caption && <p className="text-sm text-ink-soft">{photo.caption}</p>}
                          <form action={removeSitePhoto}>
                            <input type="hidden" name="space" value={s.key} />
                            <button type="submit" className="text-sm font-semibold text-ink-soft underline underline-offset-4">
                              Remove photo
                            </button>
                          </form>
                        </>
                      ) : (
                        <p className="rounded-lg bg-paper px-3 py-6 text-center text-sm text-ink-soft">No photo yet</p>
                      )}
                      <PhotoUpload
                        action={setSitePhoto}
                        fields={{ space: s.key }}
                        buttonLabel="Save photo"
                        compact={!!photo}
                      />
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
