/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, MapPin, MessageCircle, Trophy, UserPlus, Users } from "lucide-react";
import { getMember } from "@/lib/members/session";
import { signedPhotoUrls } from "@/lib/members/photo-urls";
import { memoryUrls, type MemoryRow } from "@/lib/members/memories";
import { MemberTile, initials, type TileMember } from "@/components/member/member-tile";
import { CohortWelcomeForm } from "@/components/member/cohort-welcome-form";
import { ClassGroupForm } from "@/components/member/connections";
import { Empty, PageHeader, Panel, StatTiles } from "@/components/portal/page-parts";
import { Button } from "@/components/shadcn/button";

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Class of ${(await params).year} cohort` };
}

type Cohort = {
  year: number; mine: boolean; can_edit: boolean; members: number; rank: number | null; cohorts_ranked: number; welcome: string; whatsapp_url: string | null;
  reps: { person_id: string; name: string; photo_path: string | null; starts_on: string; ends_on: string | null }[];
  meetups: { id: string; title: string; place: string; happens_on: string; time_note: string; organiser: string; going: number }[];
};

const day = new Intl.DateTimeFormat("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
const monthYear = new Intl.DateTimeFormat("en-KE", { month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export default async function CohortPage({ params }: Props) {
  const { year: raw } = await params;
  const year = Number(raw);
  if (!Number.isInteger(year)) notFound();
  const member = await getMember();
  if (!member) redirect(`/login?next=/app/cohorts/${year}`);
  if (!member.registered || member.membershipStatus === "terminated") redirect("/app");
  const db = member.supabase;
  const [{ data: page }, { data: people }, { data: feed }, { data: invite }] = await Promise.all([
    db.rpc("cohort_page", { p_year: year }),
    db.rpc("directory_search", { p_year: year, p_limit: 24 }),
    db.rpc("memory_feed", { p_limit: 60 }),
    db.rpc("my_invite_link"),
  ]);
  const c = page as Cohort | null;
  if (!c) notFound();
  const tiles = (people ?? []) as (TileMember & { photo_path: string | null; total: number })[];
  const memories = ((feed ?? []) as MemoryRow[]).filter((m) => m.year_left === year).slice(0, 8);
  const [photos, repPhotos, memoryPhotos] = await Promise.all([
    signedPhotoUrls(db, tiles.map((t) => t.photo_path)),
    signedPhotoUrls(db, c.reps.map((r) => r.photo_path)),
    memoryUrls(db, memories.map((m) => m.photo_path), "small"),
  ]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const token = typeof invite === "string" ? invite : null;
  const inviteHref = `https://wa.me/?text=${encodeURIComponent(`Hi! Our Class of ${year} cohort is getting together on mhs.alumni, the Menyenya SDA High School alumni platform. Join us here: ${origin}/join${token ? `?invite=${token}` : ""}`)}`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/app/cohorts", label: "All cohorts" }}
        eyebrow="Cohort"
        title={`Class of ${year} cohort`}
        description={c.mine ? "Your year group at Menyenya." : "A year group at Menyenya."}
        actions={c.mine ? (
          <>
            <Button asChild className="bg-gold text-ink hover:bg-gold/90"><a href={inviteHref} target="_blank" rel="noopener noreferrer"><UserPlus /> Invite classmates</a></Button>
            {c.whatsapp_url && <Button asChild className="bg-[#25D366] text-ink hover:bg-[#25D366]/90"><a href={c.whatsapp_url} target="_blank" rel="noopener noreferrer"><MessageCircle /> Cohort WhatsApp group</a></Button>}
          </>
        ) : undefined}
      />

      <StatTiles items={[
        { label: "Members here", value: String(c.members), href: `/app/directory?year=${year}` },
        { label: "Cohort ranking", value: c.rank ? `${ordinal(c.rank)} of ${c.cohorts_ranked}` : "—", href: "/app/community#classes" },
        { label: "Upcoming meet-ups", value: String(c.meetups.length) },
        { label: "Memories shared", value: String(memories.length) },
      ]} />

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-8">
          {(c.welcome || c.can_edit) && (
            <Panel title="Welcome" tone="quiet">
              {c.welcome && <p className="whitespace-pre-line text-lg">{c.welcome}</p>}
              {c.can_edit && (
                <div className={c.welcome ? "mt-4 border-t pt-4" : ""}>
                  <CohortWelcomeForm year={year} current={c.welcome} />
                  <div className="mt-4"><ClassGroupForm year={year} current={c.whatsapp_url} /></div>
                </div>
              )}
            </Panel>
          )}

          <Panel title="Who's here" actions={<Button asChild size="sm" variant="outline"><Link href={`/app/directory?year=${year}`}><Users /> See everyone</Link></Button>}>
            {tiles.length === 0 ? <Empty>No one from this cohort has joined yet. {c.mine && "Be the first to invite classmates!"}</Empty> : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {tiles.map((m) => <MemberTile key={m.person_id} m={m} photo={m.photo_path ? photos.get(m.photo_path) : undefined} />)}
              </ul>
            )}
          </Panel>

          <Panel title="Memories from this cohort" actions={<Button asChild size="sm" variant="outline"><Link href="/app/memories">All memories</Link></Button>}>
            {memories.length === 0 ? <Empty>No memories yet. Share an old class photo!</Empty> : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {memories.map((m) => (
                  <li key={m.id}>
                    <Link href="/app/memories" className="block overflow-hidden rounded-lg">
                      {memoryPhotos.get(m.photo_path) ? <img src={memoryPhotos.get(m.photo_path)} alt={m.caption} className="aspect-square w-full object-cover" loading="lazy" /> : <span className="block aspect-square bg-muted" />}
                    </Link>
                    {m.caption && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.caption}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="flex flex-col gap-8">
          <Panel title={c.reps.length > 1 ? "Cohort reps" : "Cohort rep"} description="Elected by the cohort.">
            {c.reps.length === 0 ? <Empty>No cohort rep yet. Reps are elected, then added by an administrator.</Empty> : (
              <ul className="flex flex-col gap-4">
                {c.reps.map((r) => (
                  <li key={r.person_id}>
                    <Link href={`/app/directory/${r.person_id}`} className="flex items-center gap-3 hover:underline">
                      {r.photo_path && repPhotos.get(r.photo_path) ? (
                        <img src={repPhotos.get(r.photo_path)} alt="" className="size-14 rounded-full object-cover" />
                      ) : (
                        <span className="flex size-14 items-center justify-center rounded-full bg-tea-tint font-bold text-tea">{initials(r.name)}</span>
                      )}
                      <span>
                        <span className="block font-semibold">{r.name}</span>
                        <span className="block text-sm text-muted-foreground">
                          Since {monthYear.format(new Date(r.starts_on))}{r.ends_on ? `, term to ${monthYear.format(new Date(r.ends_on))}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {c.mine && (
            <Panel title="Cohort meet-ups" actions={<Button asChild size="sm"><Link href="/app/meetups"><MapPin /> Hapa kuna form?</Link></Button>}>
              {c.meetups.length === 0 ? <Empty>Nothing planned. Drop your pin and choose &ldquo;my class&rdquo;.</Empty> : (
                <ul className="flex flex-col divide-y">
                  {c.meetups.map((m) => (
                    <li key={m.id} className="py-3">
                      <p className="font-semibold">{m.title}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-4" /> {day.format(new Date(m.happens_on))}{m.time_note ? `, ${m.time_note}` : ""} · {m.place}</p>
                      <p className="text-xs text-muted-foreground">By {m.organiser} · {m.going} going</p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {c.rank === 1 && <p className="flex items-center gap-2 font-semibold text-tea"><Trophy className="size-5 text-gold" /> The best-represented cohort on the platform!</p>}
        </aside>
      </div>
    </div>
  );
}
