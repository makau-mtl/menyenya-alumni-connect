import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { MemberSettingsForm } from "@/components/admin/settings-forms";
import { PageHeader, Panel } from "@/components/portal/page-parts";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can change settings.</p>;
  const { data } = await staff.supabase.from("module_settings").select("module_key, enabled, config");
  const get = (k: string) => data?.find((m) => m.module_key === k);
  const v = get("verification");
  const roles = (v?.config ?? {}) as { alumnus?: string[]; friend?: string[] };
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Administration" title="Settings" description="Membership settings. Changes take effect straight away and are recorded in the audit log." />
      <Panel className="max-w-4xl">
        <MemberSettingsForm
          verification={Boolean(v?.enabled)}
          roles={{ alumnus: roles.alumnus ?? [], friend: roles.friend ?? [] }}
          rejoinDays={Number((get("membership_exit")?.config as { rejoin_days?: number } | null)?.rejoin_days ?? 30)}
        />
      </Panel>
    </div>
  );
}
