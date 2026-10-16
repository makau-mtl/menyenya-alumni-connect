import type { Metadata } from "next";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: { default: "My account", template: "%s | My account" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  let tabs: { href: string; label: string }[] = [];
  if (member?.registered && member.membershipStatus !== "terminated") {
    const [{ data: waiting }, staff] = await Promise.all([member.supabase.rpc("confirmations_waiting"), getStaff()]);
    tabs = [
      { href: "/app", label: "My account" },
      { href: "/app/directory", label: "Member directory" },
      ...((waiting as unknown[] | null)?.length ? [{ href: "/app/confirm", label: `Confirm members (${(waiting as unknown[]).length})` }] : []),
      ...(staff && (staff.isAdmin || staff.isFinance || staff.canEditNews || staff.isVerifier) ? [{ href: "/admin", label: "Admin" }] : []),
    ];
  }
  return (
    <div className="section pb-16 pt-6 lg:pt-8">
      {tabs.length > 0 && <AdminNav tabs={tabs} label="Member area" root="/app" />}
      <div className="pt-8 lg:pt-10">{children}</div>
    </div>
  );
}
