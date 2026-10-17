import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { endRole } from "@/app/admin/actions";
import { AssignRoleForm } from "@/components/admin/settings-forms";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { ConfirmAction } from "@/components/portal/confirm-action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";

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
    if (a.scope_type === "cohort") return `Class of ${cohorts?.find((c) => c.id === a.scope_id)?.year_left ?? ""} cohort`;
    if (a.scope_type === "cluster") return `${clusters?.find((c) => c.id === a.scope_id)?.name ?? ""} region`;
    if (a.scope_type === "committee") return committees?.find((c) => c.id === a.scope_id)?.name ?? "Committee";
    return "Whole association";
  };
  const list = (assignments ?? []) as unknown as Assignment[];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Roles"
        description="Roles decide what people can see and do. Class reps and regional reps are limited to their own class or region. You can't give yourself a role; another administrator has to."
      />
      <Panel title="Give a role" className="max-w-4xl">
        <AssignRoleForm
            people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name }))}
            roles={(roles ?? []).filter((r) => r.key !== "member").map((r) => ({ key: r.key, name: r.name, scope: ((r.allowed_scope_types as string[])[0] ?? "association").replace("school", "association") }))}
            years={(cohorts ?? []).map((c) => c.year_left).filter((y) => y <= new Date().getFullYear())}
            regions={(clusters ?? []).filter((c) => c.active).map((c) => c.name)}
            committees={committees ?? []}
          />
      </Panel>

      <Panel title="Current roles" description="Ending a role keeps the record, with today's date as its end.">
        {list.length === 0 ? (
          <Empty>No roles yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Person</TableHead><TableHead>Role</TableHead><TableHead>For</TableHead><TableHead>Term</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold">{a.persons?.full_name}</TableCell>
                  <TableCell><Pill tone="info">{a.roles?.name}</Pill></TableCell>
                  <TableCell>{scopeName(a)}</TableCell>
                  <TableCell>{dateFormat.format(new Date(a.starts_on))}{a.ends_on ? ` to ${dateFormat.format(new Date(a.ends_on))}` : ""}</TableCell>
                  <TableCell className="text-right">
                    {(!a.ends_on || a.ends_on > today) && (
                      <ConfirmAction action={endRole} fields={{ id: a.id }} variant="ghost" label="End role"
                        title={`End ${a.persons?.full_name}'s role as ${a.roles?.name}?`} description="They lose what this role lets them see and do from their next page. The record is kept." confirmLabel="End role" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
