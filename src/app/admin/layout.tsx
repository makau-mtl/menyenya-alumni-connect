import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getStaff } from "@/lib/admin/staff";
import { AdminNav } from "@/components/admin/admin-nav";

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

  const tabs = [
    ...(staff.isFinance ? [{ href: "/admin", label: "Overview" }] : []),
    ...(staff.isAdmin ? [{ href: "/admin/causes", label: "Causes" }] : []),
    ...(staff.canEditNews ? [{ href: "/admin/news", label: "News and events" }] : []),
    ...(staff.isAdmin ? [{ href: "/admin/site", label: "Photos and video" }] : []),
  ];

  return (
    <div className="section pb-10 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Admin</h1>
          <p className="mt-2 text-ink-soft">Signed in as {staff.email}</p>
        </div>
      </div>
      {tabs.length === 0 ? (
        <div className="mt-8 max-w-2xl rounded-xl border border-line bg-surface p-6">
          <h2 className="text-2xl font-bold">No admin access</h2>
          <p className="mt-2 text-ink-soft">
            This account has no admin role. An administrator can give you one.
          </p>
        </div>
      ) : (
        <>
          <AdminNav tabs={tabs} />
          <div className="pt-8">{children}</div>
        </>
      )}
    </div>
  );
}
