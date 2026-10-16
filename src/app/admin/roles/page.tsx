import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { endRole } from "@/app/admin/actions";
import { AssignRoleForm } from "@/components/admin/settings-forms";

export const metadata: Metadata = { title: "Roles" };

const dateFormat = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

type Assignment = {
  id: string; scope_type: string; scope_id: string | null; starts_on: string; ends_on: string | null;
  persons: { full_name: string } | null; roles: { name: string; key: string } | null;
};

export default async function AdminRolesPage() {
  const staff = await getStaff();
  if (!staff?.isAdmin) return <p>Only administrators can give roles.</p>;
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: assignments }, { data: people }, { data: roles }, { data: cohorts }, { data: clusters }, { data: committees }] = await Promise.all([
    staff.supabase
      .from("role_assignments")
      .select("id, scope_type, scope_id, starts_on, ends_on, persons!role_assignments_person_id_fkey(full_name), roles(name, key)")
      .or(`ends_on.is.null,ends_on.gte.${today}`)
      .order("starts_on", { ascending: false }),
    staff.supabase.from("persons").select("id, full_name").eq("status", "active").order("full_name").limit(2000),
    staff.supabase.from("roles").select("key, name, allowed_scope_types").order("name"),
    staff.supabase.from("cohorts").select("id, year_left").order("year_left", { ascending: false }),
    staff.supabase.from("clusters").select("id, name, active").order("sort_order"),
    staff.supabase.from("committees").select("id, name").eq("active", true).order("name"),
  ]);
  const scopeName = (a: Assignment) => {
    if (a.scope_type === "cohort") return `Class of ${cohorts?.find((c) => c.id === a.scope_id)?.year_left ?? ""}`;
    if (a.scope_type === "cluster") return `${clusters?.find((c) => c.id === a.scope_id)?.name ?? ""} region`;
    if (a.scope_type === "committee") return committees?.find((c) => c.id === a.scope_id)?.name ?? "Committee";
    return "Whole association";
  };
  const list = (assignments ?? []) as unknown as Assignment[];

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="text-2xl font-bold">Give a role</h2>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Roles decide what people can see and do. Class reps and regional reps are limited to their own class or
          region. You can&rsquo;t give yourself a role; another administrator has to.
        </p>
        <div className="mt-5 max-w-3xl rounded-xl border border-line bg-surface p-6">
          <AssignRoleForm
            people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name }))}
            roles={(roles ?? []).filter((r) => r.key !== "member" && r.key !== "school_liaison").map((r) => ({ key: r.key, name: r.name, scope: (r.allowed_scope_types as string[])[0] ?? "association" }))}
            years={(cohorts ?? []).map((c) => c.year_left).filter((y) => y <= new Date().getFullYear())}
            regions={(clusters ?? []).filter((c) => c.active).map((c) => c.name)}
            committees={committees ?? []}
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Current roles</h2>
        {list.length === 0 ? (
          <p className="mt-4 text-ink-soft">No roles yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-[0.95rem]">
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-semibold">Person</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">For</th>
                  <th className="px-4 py-3 font-semibold">Since</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-semibold">{a.persons?.full_name}</td>
                    <td className="px-4 py-3">{a.roles?.name}</td>
                    <td className="px-4 py-3">{scopeName(a)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{dateFormat.format(new Date(a.starts_on))}</td>
                    <td className="px-4 py-3 text-right">
                      {!a.ends_on && (
                        <form action={endRole}>
                          <input type="hidden" name="id" value={a.id} />
                          <button type="submit" className="text-sm font-semibold text-alert underline underline-offset-4">End role</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm text-ink-soft">Ending a role keeps the record, with today&rsquo;s date as its end.</p>
      </section>
    </div>
  );
}
