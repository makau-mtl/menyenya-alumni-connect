/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { memberPhotoUrl } from "@/lib/members/photos";
import { applySignInPhoto, removeMemberPhoto, uploadMemberPhoto } from "@/app/app/actions";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { ChoicesForm, WorkForm } from "@/components/member/profile-forms";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "My profile" };

function Section({ id, title, intro, children }: { id: string; title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <h2 className="text-2xl font-bold">{title}</h2>
      {intro && <div className="mt-2 text-ink-soft">{intro}</div>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function ProfilePage() {
  const member = await getMember();
  if (!member) redirect("/login?next=/app/profile");
  if (!member.registered) redirect("/join");

  const [{ data: p }, { data: consentRows }, { data: skillRows }] = await Promise.all([
    member.supabase
      .from("member_profiles")
      .select("headline, occupation_status, profession, employer_or_business, products_services, skills, linkedin_url, profile_link, social_links, willing_to_volunteer, mentoring_offer, photo_path, membership_levels(can_mentor, can_request_mentor)")
      .eq("person_id", member.personId!)
      .single(),
    member.supabase.from("consents").select("purpose, granted, created_at").order("created_at", { ascending: false }),
    member.supabase.from("skills").select("name").eq("active", true).order("name"),
  ]);
  const skillOptions = (skillRows ?? []).map((r) => r.name);
  const providerName = member.provider === "google" ? "Google" : member.provider === "linkedin_oidc" ? "LinkedIn" : null;
  const flags = (p?.membership_levels as unknown as { can_mentor: boolean; can_request_mentor: boolean } | null) ?? null;
  const consents: Record<string, boolean> = {};
  for (const r of consentRows ?? []) if (!(r.purpose in consents)) consents[r.purpose] = r.granted;
  const photo = await memberPhotoUrl(member.supabase, p?.photo_path ?? null, "large");

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link href="/app" className="font-semibold text-tea underline underline-offset-4">My account</Link>
        <h1 className="mt-4 text-4xl font-bold">My profile</h1>
        <p className="mt-3 text-lg text-ink-soft">Everything here is optional. Save each section on its own.</p>
        <nav aria-label="Sections" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-semibold text-tea">
          <a href="#photo" className="underline underline-offset-4">Photo</a>
          <a href="#work" className="underline underline-offset-4">Work and links</a>
          <a href="#choices" className="underline underline-offset-4">Privacy choices</a>
        </nav>
      </div>

      <Section id="photo" title="Your photo" intro="A passport-style photo helps classmates put a face to the name. Your Google or LinkedIn photo is used until you upload one. Only signed-in members see it, and only if you agree to be in the directory.">
        <div className="flex flex-wrap items-start gap-6">
          {photo ? (
            <div className="flex flex-col items-start gap-2">
              <img src={photo} alt="Your photo" className="size-36 rounded-xl object-cover" />
              <form action={removeMemberPhoto}>
                <button type="submit" className="text-sm font-semibold text-ink-soft underline underline-offset-4">Remove photo</button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <span aria-hidden className="flex size-36 items-center justify-center rounded-xl bg-paper text-sm text-ink-soft">No photo yet</span>
              {providerName && member.providerPhoto && (
                <form action={applySignInPhoto}>
                  <button type="submit" className={buttonClass("secondary", "sm")}>Use my {providerName} photo</button>
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

      <Section id="choices" title="Privacy choices" intro={<>Change these whenever you like. See the <Link href="/privacy" className="underline">privacy policy</Link>.</>}>
        <ChoicesForm current={consents} />
        <p className="mt-6 text-sm text-ink-soft">To leave the association or ask for a copy of your data, contact the secretariat.</p>
      </Section>
    </div>
  );
}
