import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getStaff } from "@/lib/admin/staff";
import { getPortalNav } from "@/lib/portal-nav";
import { PortalShell } from "@/components/portal/portal-shell";

// Always built for the person viewing it, never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="section max-w-2xl pt-16">
        <h1 className="text-4xl font-bold">Admin</h1>
        <p className="mt-4 text-lg text-ink-soft">
          The database is not connected yet, so there is nothing to manage. Once it is, signed-in officials manage
          causes, news, photos and see pledges here.
        </p>
      </div>
    );
  }

  const staff = await getStaff();
  if (!staff) redirect("/login?next=/admin");

  const { groups, user } = await getPortalNav();
  const hasAdmin = groups.some((g) => g.root === "/admin");

  return (
    <PortalShell groups={groups} user={user}>
      {hasAdmin ? (
        children
      ) : (
        <div className="max-w-2xl rounded-xl border bg-card p-6">
          <h1 className="text-2xl font-bold">No admin access</h1>
          <p className="mt-2 text-muted-foreground">This account has no admin role. An administrator can give you one.</p>
        </div>
      )}
    </PortalShell>
  );
}
