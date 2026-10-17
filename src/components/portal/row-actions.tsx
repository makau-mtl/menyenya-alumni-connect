import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { ConfirmAction } from "./confirm-action";

type FormAction = (formData: FormData) => void | Promise<void>;

/** The buttons on an ordered admin list: move up/down, edit, show/hide, and remove (with a check first). */
export function RowActions({ id, name, status, first, last, editHref, move, setStatus, extra = {} }: {
  id: string; name: string; status: string; first: boolean; last: boolean; editHref: string;
  move: FormAction; setStatus: FormAction; extra?: Record<string, string>;
}) {
  const hidden = (fields: Record<string, string>) => Object.entries({ ...extra, ...fields }).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <form action={move} className="flex">
        {hidden({ id })}
        <Button size="icon" variant="ghost" name="direction" value="up" disabled={first} aria-label={`Move ${name} up`}><ArrowUp /></Button>
        <Button size="icon" variant="ghost" name="direction" value="down" disabled={last} aria-label={`Move ${name} down`}><ArrowDown /></Button>
      </form>
      <Button asChild size="sm" variant="outline"><Link href={editHref}><Pencil /> Edit</Link></Button>
      <form action={setStatus}>
        {hidden({ id })}
        <Button size="sm" variant="ghost" name="status" value={status === "draft" ? "published" : "draft"}>
          {status === "draft" ? <><Eye /> Show</> : <><EyeOff /> Hide</>}
        </Button>
      </form>
      <ConfirmAction action={setStatus} fields={{ ...extra, id, status: "archived" }} label="Remove"
        title={`Remove ${name}?`} description="It disappears from the website and from this list. Nothing is deleted; the record is kept." confirmLabel="Remove" />
    </div>
  );
}
