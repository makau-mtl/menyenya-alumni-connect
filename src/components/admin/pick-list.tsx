import { savePickItem } from "@/app/admin/actions";
import { Button } from "@/components/shadcn/button";
import { Pill } from "@/components/portal/page-parts";
import { inputClass } from "@/components/ui";

/** A short list administrators keep (streams, dormitories): add several at once, rename, hide or show. */
export function PickList({ kind, label, items }: { kind: "stream" | "dorm"; label: string; items: { id: string; name: string; status: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-bold">{label}</h3>
      {items.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
      <ul className="flex flex-col divide-y">
        {items.map((i) => (
          <li key={i.id} className={`flex flex-wrap items-center gap-2 py-2 ${i.status !== "published" ? "opacity-60" : ""}`}>
            <form action={savePickItem} className="flex flex-1 gap-2">
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={i.id} />
              <input name="name" defaultValue={i.name} maxLength={60} aria-label={`Rename ${i.name}`} className={`${inputClass} py-1.5 text-sm`} />
              <Button size="sm" variant="outline">Rename</Button>
            </form>
            {i.status !== "published" && <Pill>Hidden</Pill>}
            <form action={savePickItem}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={i.id} />
              <Button size="sm" variant="ghost" name="status" value={i.status === "published" ? "archived" : "published"}>{i.status === "published" ? "Hide" : "Show"}</Button>
            </form>
          </li>
        ))}
      </ul>
      <form action={savePickItem} className="flex gap-2">
        <input type="hidden" name="kind" value={kind} />
        <input name="name" placeholder="Add names, separated by commas" maxLength={1000} aria-label={`Add ${label.toLowerCase()}`} className={`${inputClass} py-1.5 text-sm`} />
        <Button size="sm">Add</Button>
      </form>
    </div>
  );
}
