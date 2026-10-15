import Link from "next/link";
import type { Metadata } from "next";
import { leadership, school, secretariat, type Person } from "@/content/site";
import { PersonPhoto } from "@/components/media";
import { DraftNote, PageHero } from "@/components/page-hero";

export const metadata: Metadata = { title: "Leadership and secretariat" };

function PersonCard({ person }: { person: Person }) {
  return (
    <li>
      <PersonPhoto name={person.name} role={person.role} />
      <h3 className="mt-4 text-xl font-bold">{person.role}</h3>
      <p className="text-ink-soft">{person.name ?? "Name to be added"}</p>
    </li>
  );
}

export default function TeamPage() {
  return (
    <>
      <PageHero
        title="Leadership and secretariat"
        intro="The officials, committee members and staff who serve the association on behalf of its members."
      />

      <div className="section pt-8">
        <DraftNote>the roles shown are for review. Names, photos and short biographies will be added once each person agrees to be listed.</DraftNote>
      </div>

      <section className="section pt-14">
        <h2 className="text-3xl font-bold">Officials</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">Elected by members to lead the association.</p>
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {leadership.map((p) => (
            <PersonCard key={p.role} person={p} />
          ))}
        </ul>
      </section>

      <section className="section pt-20">
        <h2 className="text-3xl font-bold">Our partner at the school</h2>
        <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {school.map((p) => (
            <PersonCard key={p.role} person={p} />
          ))}
        </ul>
      </section>

      <section className="section pt-20">
        <h2 className="text-3xl font-bold">Secretariat</h2>
        <p className="mt-3 max-w-2xl text-ink-soft">
          A small team that keeps the association running day to day: records, member support and communication.
        </p>
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {secretariat.map((s) => (
            <li key={s.role} className="rounded-xl border-2 border-dashed border-line p-6">
              <h3 className="text-xl font-bold">{s.role}</h3>
              <p className="mt-2 text-ink-soft">{s.status}</p>
              <Link href="/careers" className="mt-4 inline-block font-semibold text-tea underline underline-offset-4">
                Careers with the association
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
