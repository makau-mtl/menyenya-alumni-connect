/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { PageHeader, Panel, Pill, StatTiles } from "@/components/portal/page-parts";
import { ConfirmAction } from "@/components/portal/confirm-action";
import { Button } from "@/components/shadcn/button";
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
  "Our people": "/our-people",
  "Corporate sponsorships": "/support/corporate-sponsorships",
  "Strategic partnerships": "/support/strategic-partnerships",
  "Alumni merchandise": "/shop",
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
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Photos and video"
        description="The Chairman's video and the photo spaces around the website. Photos are shrunk before upload so pages load quickly on phones. Only use photos of students with the school's and parents' consent."
      />
      <StatTiles
        items={[
          { label: "Photo spaces filled", value: `${filled} of ${photoSpaces.length}` },
          { label: "Chairman's video", value: videoId ? "Added" : "Not yet" },
        ]}
        className="lg:grid-cols-2 max-w-2xl"
      />
      <Panel title="The Chairman's video" description="Shown on the home page under “A message from our Chairman”." className="max-w-4xl">
        <VideoForm current={videoId} />
      </Panel>

      {pages.map((page) => (
        <Panel
          key={page}
          title={page}
          description={`${photoSpaces.filter((s) => s.page === page && photos.has(s.key)).length} of ${photoSpaces.filter((s) => s.page === page).length} filled`}
          actions={pageLinks[page] ? <Button asChild size="sm" variant="outline"><Link href={pageLinks[page]}>View page</Link></Button> : undefined}
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photoSpaces
              .filter((s) => s.page === page)
              .map((s) => {
                const photo = photos.get(s.key);
                return (
                  <li key={s.key} className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 ring-1 ring-border">
                    <p className="flex items-center justify-between gap-2 font-semibold first-letter:uppercase">
                      {s.label} <Pill tone={photo ? "good" : "warn"}>{photo ? "Done" : "To do"}</Pill>
                    </p>
                    {photo ? (
                      <>
                        <img src={photo.srcSmall} alt={photo.caption || s.label} className="aspect-[4/3] w-full rounded-lg bg-line object-cover" loading="lazy" />
                        {photo.caption && <p className="text-sm text-muted-foreground">{photo.caption}</p>}
                        <ConfirmAction action={removeSitePhoto} fields={{ space: s.key }} label="Remove photo"
                          title="Remove this photo?" description="The space shows its placeholder again. The photo is kept and can be uploaded again." confirmLabel="Remove" />
                      </>
                    ) : (
                      <p className="rounded-lg bg-card px-3 py-6 text-center text-sm text-muted-foreground ring-1 ring-border">No photo yet</p>
                    )}
                    <PhotoUpload action={setSitePhoto} fields={{ space: s.key }} buttonLabel="Save photo" compact={!!photo} />
                  </li>
                );
              })}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
