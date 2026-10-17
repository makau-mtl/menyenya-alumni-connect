/* eslint-disable @next/next/no-img-element */
import { Flag, Heart, MessageCircle } from "lucide-react";
import { addComment, reportMemory, setMemoryStatus, toggleHeart } from "@/app/app/actions";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";
import type { MemoryRow } from "@/lib/members/memories";

const ago = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function when(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return ago.format(-days, "day");
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function MemoryCard({ m, photo, comments, isAdmin }: {
  m: MemoryRow; photo: string | null; comments: { id: string; full_name: string; body: string }[]; isAdmin: boolean;
}) {
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ${m.status === "hidden" ? "opacity-60 ring-alert" : "ring-border"}`}>
      {photo ? <img src={photo} alt={m.caption || "A memory"} loading="lazy" className="w-full bg-muted object-cover" /> : <div className="aspect-video bg-muted" />}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-sm">
          <span className="font-semibold">{m.mine ? "You" : m.full_name}</span>
          {m.year_left && !m.mine ? <span className="text-muted-foreground"> · Class of {m.year_left}</span> : null}
          <span className="text-muted-foreground"> · {when(m.created_at)}</span>
        </p>
        {m.caption && <p>{m.caption}</p>}
        {(m.place || m.taken_year) && (
          <p className="text-sm text-muted-foreground">{[m.place, m.taken_year].filter(Boolean).join(", ")}</p>
        )}
        {isAdmin && m.reports ? <p className="text-sm font-semibold text-alert">Reported {m.reports} {Number(m.reports) === 1 ? "time" : "times"}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <form action={toggleHeart}>
            <input type="hidden" name="id" value={m.id} />
            <Button size="sm" variant="ghost" name="on" value={m.i_hearted ? "no" : "yes"} aria-pressed={m.i_hearted} aria-label={m.i_hearted ? "Remove your heart" : "Heart this memory"}>
              <Heart className={m.i_hearted ? "fill-alert text-alert" : ""} /> {Number(m.hearts) || ""}
            </Button>
          </form>
          <span className="flex items-center gap-1 px-2 text-sm text-muted-foreground"><MessageCircle className="size-4" /> {Number(m.comments) || ""}</span>
          <div className="ml-auto flex items-center gap-1">
            {m.mine && (
              <form action={setMemoryStatus}>
                <input type="hidden" name="id" value={m.id} />
                <Button size="sm" variant="ghost" name="status" value="removed">Remove</Button>
              </form>
            )}
            {isAdmin && (
              <form action={setMemoryStatus}>
                <input type="hidden" name="id" value={m.id} />
                <Button size="sm" variant="outline" name="status" value={m.status === "hidden" ? "published" : "hidden"}>{m.status === "hidden" ? "Show again" : "Hide"}</Button>
              </form>
            )}
            {!m.mine && (
              <details className="relative">
                <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted" aria-label="Report this memory">
                  <Flag className="size-4" />
                </summary>
                <form action={reportMemory} className="absolute right-0 z-10 mt-1 flex w-64 flex-col gap-2 rounded-lg bg-popover p-3 shadow-lg ring-1 ring-border">
                  <input type="hidden" name="id" value={m.id} />
                  <label className="text-sm font-semibold">What&rsquo;s wrong with it?
                    <input name="reason" maxLength={300} className={`${inputClass} mt-1`} />
                  </label>
                  <Button size="sm" variant="destructive">Report to administrators</Button>
                </form>
              </details>
            )}
          </div>
        </div>
        {comments.length > 0 && (
          <ul className="flex flex-col gap-1.5 border-t pt-2 text-sm">
            {comments.map((c) => <li key={c.id}><span className="font-semibold">{c.full_name}</span> {c.body}</li>)}
          </ul>
        )}
        <form action={addComment} className="mt-auto flex gap-2 pt-1">
          <input type="hidden" name="id" value={m.id} />
          <input name="body" maxLength={500} placeholder="Add a comment" aria-label="Add a comment" className={`${inputClass} py-1.5 text-sm`} />
          <Button size="sm" variant="secondary">Post</Button>
        </form>
      </div>
    </article>
  );
}
