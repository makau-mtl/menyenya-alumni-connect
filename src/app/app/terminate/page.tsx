import { PageHeader } from "@/components/portal/page-parts";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { TerminateForm } from "@/components/member/terminate-form";

export const metadata: Metadata = { title: "Terminate membership" };

export default async function TerminatePage() {
  const member = await getMember();
  if (!member) redirect("/login?next=/app/terminate");
  if (!member.registered || member.membershipStatus === "terminated") redirect("/app");
  const { data } = await member.supabase.from("module_settings").select("config").eq("module_key", "membership_exit").maybeSingle();
  const rejoinDays = Number((data?.config as { rejoin_days?: number } | null)?.rejoin_days ?? 30);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader back={{ href: "/app/profile", label: "Back to my profile" }} eyebrow="My account" title="Terminate membership" />
      <div className="rounded-xl bg-alert/5 p-6 ring-2 ring-alert">
        <h2 className="text-xl font-bold">Please read before you continue</h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5">
          <li>Your membership ends <strong>immediately</strong>. You are removed from the member directory and any public profile, and you will stop receiving updates.</li>
          <li><strong>No refunds.</strong> Any membership fee you have paid is forfeited for the rest of the period.</li>
          <li>Pledges you have made stay on record until they are settled or cancelled with the Treasurer.</li>
          <li>You can <strong>rejoin within {rejoinDays} days</strong> from My account, and everything is restored as it was. After that, you would need to register again.</li>
        </ul>
      </div>
      <div className="rounded-xl bg-card p-6 shadow-sm ring-1 ring-border">
        <TerminateForm rejoinDays={rejoinDays} />
      </div>
    </div>
  );
}
