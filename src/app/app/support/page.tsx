import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { getMember } from "@/lib/members/session";
import { replyToCase } from "@/app/app/actions";
import { CaseForm } from "@/components/member/case-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Cases for support" };

const status: Record<string, { label: string; tone: string }> = {
  submitted: { label: "Sent", tone: "bg-gold-tint text-ink" },
  under_review: { label: "Being reviewed", tone: "bg-secondary text-tea-dark" },
  responded: { label: "Replied", tone: "bg-tea text-white" },
  closed: { label: "Closed", tone: "bg-muted text-muted-foreground" },
};
const kindLabel: Record<string, string> = { member_in_need: "A member in need", needy_student: "A needy student", project_idea: "A project or idea", other: "Something else" };
const when = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });

export default async function SupportPage() {
  const member = await getMember();
  if (!member?.registered) redirect("/login?next=/app/support");
  const { data } = await member.supabase
    .from("support_cases")
    .select("id, reference, kind, title, details, status, created_at")
    .eq("person_id", member.personId!)
    .order("created_at", { ascending: false });
  const cases = (data ?? []) as { id: string; reference: string; kind: string; title: string; details: string; status: string; created_at: string }[];
  const threads = await Promise.all(cases.map(async (c) => ((await member.supabase.rpc("case_thread", { p_case: c.id })).data ?? []) as { id: string; author_name: string; from_handler: boolean; body: string; created_at: string }[]));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/app" className="mb-2 block text-sm font-semibold text-tea hover:underline">← Dashboard</Link>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tea">We look out for each other</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Raise a case for support</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          A member going through a hard time, a student who needs help, an idea the association should take on, or
          anything else. Every case is reviewed and answered.
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <LockKeyhole className="size-4" /> Private: only you and the people who handle this kind of case see it.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <Card>
          <CardHeader><CardTitle className="text-xl">New case</CardTitle></CardHeader>
          <CardContent><CaseForm /></CardContent>
        </Card>
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Your cases</h2>
          {cases.length === 0 && <p className="text-muted-foreground">You haven&rsquo;t raised any yet.</p>}
          {cases.map((c, i) => (
            <Card key={c.id} className="gap-3">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{c.reference}</span>
                  <Badge className={status[c.status].tone}>{status[c.status].label}</Badge>
                </div>
                <CardTitle className="text-lg">{c.title}</CardTitle>
                <CardDescription>{kindLabel[c.kind]} · {when.format(new Date(c.created_at))}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {threads[i].length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {threads[i].map((u) => (
                      <li key={u.id} className={`rounded-lg p-3 text-sm ${u.from_handler ? "bg-secondary" : "bg-muted"}`}>
                        <span className="block font-semibold">{u.from_handler ? `${u.author_name} (association)` : "You"}</span>
                        {u.body}
                      </li>
                    ))}
                  </ul>
                )}
                {c.status !== "closed" && (
                  <form action={replyToCase} className="flex gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="body" maxLength={4000} placeholder="Add more information" aria-label="Add more information" className={`${inputClass} py-2 text-sm`} />
                    <Button size="sm" variant="secondary">Send</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
