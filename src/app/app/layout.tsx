import type { Metadata } from "next";
import { getMember } from "@/lib/members/session";
import { getStaff } from "@/lib/admin/staff";
import { MemberNav, type MemberTab } from "@/components/member/member-nav";
import { Toaster } from "@/components/shadcn/sonner";

export const metadata: Metadata = { title: { default: "My account", template: "%s | My account" }, robots: { index: false } };
export const dynamic = "force-dynamic";

// Members use the platform inside the website: the site header and footer stay, with these tabs underneath.
export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  let tabs: MemberTab[] = [];
  if (member?.registered && member.membershipStatus !== "terminated") {
    const [{ data: waiting }, staff] = await Promise.all([member.supabase.rpc("confirmations_waiting"), getStaff()]);
    const confirm = (waiting as unknown[] | null)?.length ?? 0;
    tabs = [
      { href: "/app", label: "Dashboard", short: "Home", icon: "dashboard" },
      { href: "/app/profile", label: "My profile", short: "Profile", icon: "profile" },
      { href: "/app/directory", label: "Member directory", short: "Directory", icon: "directory" },
      ...(confirm ? [{ href: "/app/confirm", label: "Confirm members", short: "Confirm", icon: "confirm" as const, badge: confirm }] : []),
      ...(staff && (staff.isAdmin || staff.isFinance || staff.canEditNews || staff.isVerifier || staff.canManageShop)
        ? [{ href: "/admin", label: "Admin area", short: "Admin", icon: "admin" as const }]
        : []),
    ];
  }
  return (
    <>
      {tabs.length > 0 && <MemberNav tabs={tabs} />}
      <div className={`section pt-6 md:pb-16 md:pt-10 ${tabs.length ? "pb-28" : "pb-16"}`}>{children}</div>
      <Toaster position="top-center" richColors />
    </>
  );
}
