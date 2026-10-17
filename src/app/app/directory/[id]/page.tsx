import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { memberPhotoUrl } from "@/lib/members/photos";
import { ProfileCard, type CardMember } from "@/components/member/profile-card";

export const metadata: Metadata = { title: "Member" };

type Props = { params: Promise<{ id: string }> };

export default async function MemberCardPage({ params }: Props) {
  const { id } = await params;
  const member = await getMember();
  if (!member) redirect(`/login?next=/app/directory/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data } = await member.supabase.rpc("directory_member", { p_person: id });
  const m = (data as (CardMember & { photo_path: string | null })[] | null)?.[0];
  if (!m) notFound();
  const photo = await memberPhotoUrl(member.supabase, m.photo_path, "large");
  return (
    <div>
      <Link href="/app/directory" className="text-sm font-semibold text-tea hover:underline">← Member directory</Link>
      <div className="mt-4">
        <ProfileCard m={m} photo={photo} />
      </div>
    </div>
  );
}
