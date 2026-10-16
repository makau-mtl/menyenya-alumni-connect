import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { formatKes } from "@/lib/money";
import { buttonClass } from "@/components/ui";
import { ClearJoinDraft } from "@/components/join/clear-draft";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const member = await getMember();
  if (!member) redirect("/join");
  if (!member.registered) redirect("/join/steps");

  const { data: dues } = await member.supabase
    .from("membership_dues")
    .select("reference, amount, fee_type, status")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const first = member.fullName?.split(" ")[0];

  return (
    <div className="section max-w-2xl pb-16 pt-12 lg:pt-16">
      <ClearJoinDraft storageKey={`mhs-join-${member.userId}`} />
      <p className="inline-block rounded-full bg-tea-tint px-3 py-1 text-sm font-semibold text-tea">Registration complete</p>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Welcome to the association{first ? `, ${first}` : ""}</h1>
      <p className="mt-5 text-lg text-ink-soft">
        You&rsquo;re on the register. Your class rep will confirm your details, and you&rsquo;ll hear about events and news
        in your class and region.
      </p>

      {dues && (
        <div className="mt-8 rounded-xl border-2 border-gold bg-gold-tint p-6">
          <h2 className="text-xl font-bold">Your membership fee</h2>
          <p className="mt-2">
            {formatKes(Number(dues.amount))}
            {dues.fee_type === "annual" ? " for this year" : ""}. Use reference <strong>{dues.reference}</strong> when you pay.
          </p>
          <p className="mt-2 text-sm">
            Payment details for the association&rsquo;s account will be shared here once they are confirmed. Never pay to a
            personal number.
          </p>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-2xl font-bold">Complete your profile</h2>
        <p className="mt-2 text-ink-soft">
          Optional, and a few minutes. Add a passport-style photo so classmates can put a face to the name, your
          LinkedIn, what you do, and whether you&rsquo;d like to mentor or be mentored.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/app/profile" className={buttonClass("primary", "lg")}>Complete my profile</Link>
          <Link href="/app" className={buttonClass("secondary", "lg")}>Later</Link>
        </div>
      </div>
    </div>
  );
}
