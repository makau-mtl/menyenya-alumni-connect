import type { Metadata } from "next";
import { getPortalNav } from "@/lib/portal-nav";
import { PortalShell } from "@/components/portal/portal-shell";

export const metadata: Metadata = { title: { default: "My account", template: "%s | My account" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const { groups, user } = await getPortalNav();
  return (
    <PortalShell groups={groups} user={user}>
      {children}
    </PortalShell>
  );
}
