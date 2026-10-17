import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/members/session";
import { MeetupForm } from "@/components/member/connections";
import { MeetupCard, type Meetup } from "@/components/member/meetup-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";

export const metadata: Metadata = { title: "Hapa kuna form?" };

export default async function MeetupsPage() {
  const member = await getMember();
  if (!member?.registered) redirect("/login?next=/app/meetups");
  const [{ data }, { data: p }] = await Promise.all([
    member.supabase.rpc("upcoming_meetups", { p_limit: 60 }),
    member.supabase.from("member_profiles").select("cohort_id, clusters(name)").eq("person_id", member.personId!).single(),
  ]);
  const meetups = (data ?? []) as Meetup[];
  const region = (p?.clusters as unknown as { name: string } | null)?.name ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">Who&rsquo;s around?</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Hapa kuna form?</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          Going to be somewhere? Drop your pin and see which alumni can join you, from a nyama choma to coffee after
          church. Share only the town or area here; agree the exact place with those who are in.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <section aria-label="Upcoming meet-ups" className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Forms coming up</h2>
          {meetups.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-border p-6 text-muted-foreground">Hakuna form bado. Be the first to drop your pin.</p>
          ) : (
            meetups.map((m) => <MeetupCard key={m.id} m={m} />)
          )}
        </section>
        <Card className="lg:sticky lg:top-28">
          <CardHeader>
            <CardTitle className="text-xl">Drop your pin</CardTitle>
            <CardDescription>It disappears after the date.</CardDescription>
          </CardHeader>
          <CardContent>
            <MeetupForm hasClass={Boolean(p?.cohort_id)} region={region} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
