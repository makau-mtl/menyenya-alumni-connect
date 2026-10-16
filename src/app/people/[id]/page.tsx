import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import { memberPhotoUrl } from "@/lib/members/photos";
import { ProfileCard, type CardMember } from "@/components/member/profile-card";

// Public profiles: only for members who switched them on. Refreshed every 5 minutes, so switching
// a profile off takes effect shortly.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!isSupabaseConfigured || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("public_profile", { p_person: id });
  const m = (data as (CardMember & { photo_path: string | null })[] | null)?.[0];
  if (!m) return null;
  return { m, photo: await memberPhotoUrl(supabase, m.photo_path, "large") };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).id);
  if (!p) return { title: "Profile not available", robots: { index: false } };
  const who = p.m.category === "friend" ? "Friend of the alumni" : `Class of ${p.m.year_left}`;
  return { title: p.m.full_name, description: `${p.m.full_name}, ${who}, Menyenya SDA High School Alumni Association.${p.m.headline ? ` ${p.m.headline}` : ""}` };
}

export default async function PublicProfilePage({ params }: Props) {
  const p = await load((await params).id);
  if (!p) notFound();
  return (
    <div className="section pb-16 pt-12 lg:pt-16">
      <ProfileCard m={p.m} photo={p.photo} publicView />
      <p className="mt-12 text-sm text-ink-soft">
        A member of the Menyenya SDA High School Alumni Association, shown here with their permission.
      </p>
    </div>
  );
}
