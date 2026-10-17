import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { cancelMeetup, respondMeetup } from "@/app/app/actions";
import { Button } from "@/components/shadcn/button";

export type Meetup = {
  id: string; title: string; place: string; happens_on: string; time_note: string; note: string; audience: string;
  organiser_name: string; organiser_class: number | null; mine: boolean; going_count: number; i_am_going: boolean; going_names: string[];
};

const weekday = new Intl.DateTimeFormat("en-KE", { weekday: "short", timeZone: "Africa/Nairobi" });
const dayNum = new Intl.DateTimeFormat("en-KE", { day: "numeric", timeZone: "Africa/Nairobi" });
const month = new Intl.DateTimeFormat("en-KE", { month: "short", timeZone: "Africa/Nairobi" });
const audienceLabel: Record<string, string> = { everyone: "All members", class: "Class only", region: "Region only" };

export function MeetupCard({ m, compact = false }: { m: Meetup; compact?: boolean }) {
  const date = new Date(`${m.happens_on}T12:00:00+03:00`);
  return (
    <article className="flex gap-4 rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-ink py-2 text-white">
        <span className="text-xs font-semibold uppercase text-gold">{weekday.format(date)}</span>
        <span className="font-display text-2xl font-bold leading-none">{dayNum.format(date)}</span>
        <span className="text-xs uppercase">{month.format(date)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold leading-snug">{m.title}</p>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {m.place}</span>
          {m.time_note && <span className="flex items-center gap-1"><Clock className="size-3.5" /> {m.time_note}</span>}
          <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {audienceLabel[m.audience]}</span>
        </p>
        <p className="mt-1 text-sm">
          By {m.mine ? "you" : m.organiser_name}{!m.mine && m.organiser_class ? ` (Class of ${m.organiser_class})` : ""}
        </p>
        {!compact && m.note && <p className="mt-2 text-sm">{m.note}</p>}
        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-tea">
          <Users className="size-4" /> {Number(m.going_count)} going{m.going_names.length ? `: ${m.going_names.join(", ")}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {m.mine ? (
            <form action={cancelMeetup}>
              <input type="hidden" name="id" value={m.id} />
              <Button size="sm" variant="outline">Cancel this meet-up</Button>
            </form>
          ) : (
            <form action={respondMeetup}>
              <input type="hidden" name="id" value={m.id} />
              {m.i_am_going ? (
                <Button size="sm" variant="outline" name="going" value="no">I can&rsquo;t make it</Button>
              ) : (
                <Button size="sm" name="going" value="yes">I&rsquo;m in</Button>
              )}
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
