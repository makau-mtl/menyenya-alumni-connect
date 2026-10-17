import type { Metadata } from "next";
import { getStaff } from "@/lib/admin/staff";
import { asAt } from "@/lib/impact";
import { moveImpactFigure, setImpactFigureStatus } from "@/app/admin/actions";
import { ImpactFigureForm } from "@/components/admin/impact-forms";
import { Empty, PageHeader, Panel, Pill } from "@/components/portal/page-parts";
import { RowActions } from "@/components/portal/row-actions";

export const metadata: Metadata = { title: "Impact" };

type Fig = { id: string; cause_id: string; value: string; label: string; as_of: string; note: string; status: string; sort_order: number };

export default async function AdminImpactPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const staff = await getStaff();
  if (!staff?.canEditImpact) return <p>Only the officials can change impact figures.</p>;
  const { edit } = await searchParams;
  const [{ data: causesData }, { data: figData }] = await Promise.all([
    staff.supabase.from("causes").select("id, title, slug").order("sort_order"),
    staff.supabase.from("impact_figures").select("id, cause_id, value, label, as_of, note, status, sort_order").neq("status", "archived").order("sort_order"),
  ]);
  const causes = (causesData ?? []) as { id: string; title: string; slug: string }[];
  const figs = (figData ?? []) as Fig[];
  const editing = edit ? figs.find((f) => f.id === edit) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Administration"
        title="Impact"
        description="Figures that show what each initiative has achieved, with the date they are correct to. They appear on the initiative's page and on Our work. Keep them in line with the annual reports. Impact stories are written under Alumni stories."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="flex flex-col gap-8">
          {causes.map((c) => {
            const list = figs.filter((f) => f.cause_id === c.id);
            return (
              <Panel key={c.id} title={c.title}>
                {list.length === 0 ? <Empty>No figures yet.</Empty> : (
                  <ol className="flex flex-col divide-y">
                    {list.map((f, i) => (
                      <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                        <span className="w-28 shrink-0 font-display text-2xl font-bold">{f.value}</span>
                        <div className="min-w-40 flex-1">
                          <p className="flex items-center gap-2 font-semibold">{f.label}{f.status === "draft" && <Pill>Hidden</Pill>}</p>
                          <p className="text-sm text-muted-foreground">As at {asAt.format(new Date(f.as_of))}{f.note ? ` · ${f.note}` : ""}</p>
                        </div>
                        <RowActions id={f.id} name={f.label} status={f.status} first={i === 0} last={i === list.length - 1}
                          editHref={`/admin/impact?edit=${f.id}`} move={moveImpactFigure} setStatus={setImpactFigureStatus} />
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            );
          })}
        </div>
        <Panel title={editing ? "Edit figure" : "Add a figure"} tone={editing ? "attention" : "default"}>
          <ImpactFigureForm key={editing?.id ?? "new"} causes={causes} initial={editing} />
        </Panel>
      </div>
    </div>
  );
}
