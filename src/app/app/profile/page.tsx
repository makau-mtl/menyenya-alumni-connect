/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { memberPhotoUrl } from "@/lib/members/photos";
import { applySignInPhoto, removeMemberPhoto, uploadMemberPhoto } from "@/app/app/actions";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { ChoicesForm, SchoolLifeForm, WorkForm } from "@/components/member/profile-forms";
import { PageHeader, Panel } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";

export const metadata: Metadata = { title: "My profile" };

function Section({ id, title, intro, children }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Panel id={id} title={title} description={intro}>
      {children}
    </Panel>
  );
}

export default async function ProfilePage() {
  const member = await getMember();
  if (!member) redirect("/login?next=/app/profile");
  if (!member.registered) redirect("/join");
  if (member.membershipStatus === "terminated") redirect("/app");
  const staff = await getStaff();
  const hasAdmin = Boolean(staff && (staff.isAdmin || staff.isFinance || staff.canEditNews || staff.isVerifier || staff.canManageShop || staff.canEditSchool || staff.canHandleCases || staff.canEditStories || staff.canManageReports || staff.canEditImpact));

  const [{ data: p }, { data: consentRows }, { data: skillRows }, { data: dorms }, { data: streams }] = await Promise.all([
    member.supabase
      .from("member_profiles")
      .select("contact_visibility, gender, headline, occupation_status, profession, employer_or_business, products_services, skills, linkedin_url, profile_link, social_links, willing_to_volunteer, mentoring_offer, photo_path, stream_id, dorm_ids, membership_levels(can_mentor, can_request_mentor)")
      .eq("person_id", member.personId!)
      .single(),
    member.supabase.from("consents").select("purpose, granted, created_at").order("created_at", { ascending: false }),
    member.supabase.from("skills").select("name").eq("active", true).order("name"),
    member.supabase.from("school_dorms").select("id, name").eq("status", "published").order("sort_order").order("name"),
    member.supabase.from("school_streams").select("id, name").eq("status", "published").order("sort_order").order("name"),
  ]);
  const skillOptions = (skillRows ?? []).map((r) => r.name);
  const providerName = member.provider === "google" ? "Google" : member.provider === "linkedin_oidc" ? "LinkedIn" : null;
  const flags = (p?.membership_levels as unknown as { can_mentor: boolean; can_request_mentor: boolean } | null) ?? null;
  const consents: Record<string, boolean> = {};
  for (const r of consentRows ?? []) if (!(r.purpose in consents)) consents[r.purpose] = r.granted;
  const photo = await memberPhotoUrl(member.supabase, p?.photo_path ?? null, "large");

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeader
          eyebrow="My account"
          title="My profile"
          description="Everything here is optional. Save each section on its own."
          actions={
            <div className="flex flex-wrap gap-2">
              {hasAdmin && <Button asChild variant="outline" className="md:hidden"><Link href="/admin">Open the admin area</Link></Button>}
              <Button asChild><Link href="/app">Done</Link></Button>
            </div>
          }
        />
        <nav aria-label="Sections" className="flex flex-wrap gap-2">
          {[["#photo", "Photo"], ["#work", "Work and links"], ["#menyenya", "My Menyenya"], ["#choices", "Privacy choices"], ["#terminate", "Terminate membership"]].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full bg-card px-3 py-1 text-sm font-semibold ring-1 ring-border hover:ring-tea">{label}</a>
          ))}
        </nav>
      </div>

      <Section id="photo" title="Your photo" intro="A passport-style photo helps classmates put a face to the name. Your Google or LinkedIn photo is used until you upload one. Fellow members see it in the member directory; the public sees it only if you switch on a public profile.">
        <div className="flex flex-wrap items-start gap-6">
          {photo ? (
            <div className="flex flex-col items-start gap-2">
              <img src={photo} alt="Your photo" className="size-36 rounded-xl object-cover" />
              <form action={removeMemberPhoto}>
                <Button type="submit" size="sm" variant="ghost">Remove photo</Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <span aria-hidden className="flex size-36 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">No photo yet</span>
              {providerName && member.providerPhoto && (
                <form action={applySignInPhoto}>
                  <Button type="submit" size="sm" variant="outline">Use my {providerName} photo</Button>
                </form>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <PhotoUpload
              action={uploadMemberPhoto}
              fields={{}}
              withCaption={false}
              widths={[800, 400]}
              buttonLabel="Save photo"
              chooseLabel={photo ? "Choose a new photo" : "Choose a photo"}
            />
            <p className="mt-3 text-sm text-ink-soft">Face the camera, plain background, good light. It&rsquo;s shrunk on your phone before upload.</p>
          </div>
        </div>
      </Section>

      <Section id="work" title="Work and links" intro="Shown to signed-in members in the directory, so fellow alumni can find and support each other.">
        <WorkForm
          skillOptions={skillOptions}
          v={{
            headline: p?.headline ?? "",
            occupation_status: p?.occupation_status ?? "",
            gender: p?.gender ?? "",
            profession: p?.profession ?? "",
            employer_or_business: p?.employer_or_business ?? "",
            products_services: p?.products_services ?? "",
            skills: p?.skills ?? [],
            linkedin_url: p?.linkedin_url ?? "",
            profile_link: p?.profile_link ?? "",
            social_links: (p?.social_links as { label: string; url: string }[] | null) ?? [],
            willing_to_volunteer: p?.willing_to_volunteer ?? false,
            mentoring_offer: p?.mentoring_offer ?? "none",
            canMentor: flags?.can_mentor ?? false,
            canRequestMentor: flags?.can_request_mentor ?? false,
          }}
        />
      </Section>

      <Section id="menyenya" title="My Menyenya" intro="Optional. Your stream and the dormitories you slept in help old friends find you, and help the association understand its members. Fellow members see them on your card.">
        {(dorms ?? []).length + (streams ?? []).length === 0 ? (
          <p className="text-muted-foreground">The lists of streams and dormitories are being prepared. Check back soon.</p>
        ) : (
          <SchoolLifeForm streams={streams ?? []} dorms={dorms ?? []} current={{ stream: p?.stream_id ?? null, dorms: p?.dorm_ids ?? [] }} />
        )}
      </Section>

      <Section id="choices" title="Privacy choices" intro={<>Change these whenever you like. See the <Link href="/privacy" className="underline">privacy policy</Link>.</>}>
        <ChoicesForm current={consents} contactVisibility={p?.contact_visibility ?? "hidden"} />
        {consents.public_profile && member.personId && (
          <p className="mt-6">
            <Link href={`/people/${member.personId}`} className="font-semibold text-tea underline underline-offset-4">View my public profile</Link>
          </p>
        )}
        <p className="mt-6 text-sm text-ink-soft">To ask for a copy of your data, contact the secretariat.</p>
      </Section>
      <section id="terminate" className="scroll-mt-24 rounded-xl bg-alert/5 p-5 ring-1 ring-alert/40 sm:p-6">
        <h2 className="text-xl font-bold text-alert">Terminate membership</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          End your membership. You can rejoin within a set number of days. You can also ask for your personal data to be deleted.
        </p>
        <Button asChild variant="destructive" className="mt-4"><Link href="/app/terminate">Terminate membership</Link></Button>
      </section>
      <div className="flex justify-end">
        <Button asChild size="lg"><Link href="/app">Done, back to the dashboard</Link></Button>
      </div>
    </div>
  );
}
