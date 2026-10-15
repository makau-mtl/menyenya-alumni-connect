import Link from "next/link";
import { notFound } from "next/navigation";
import { getCause, getCauseProgress, listCauses } from "@/lib/data";
import { BrickWall } from "@/components/brick-wall";
import { ProgressFigures } from "@/components/progress-figures";
import { buttonClass } from "@/components/ui";

export default async function HomePage() {
  const block = await getCause("tuition-block");
  if (!block || !block.targetAmount) notFound();
  const progress = await getCauseProgress(block.slug);
  const others = (await listCauses()).filter((c) => c.slug !== block.slug);
  const ready = block.readiness.filter((r) => r.done).length;

  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl items-end gap-10 px-4 pb-14 pt-10 lg:grid-cols-[1fr_1.15fr] lg:pt-16">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold sm:text-5xl">Menyenya made us. Together, we build it.</h1>
            <p className="mt-5 text-lg text-ink-soft">
              Alumni of Menyenya SDA High School are raising KES 100 million over three years for a new tuition block:
              a library, computer laboratories, classrooms and offices for the students who come after us.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/pledge/tuition-block" className={buttonClass("primary", "lg")}>
                Make a pledge
              </Link>
              <Link href="/give/tuition-block" className={buttonClass("secondary", "lg")}>
                Give once
              </Link>
            </div>
            <p className="mt-4 text-[0.95rem] text-ink-soft">
              Not an alumnus? Friends of the school are welcome to give and to join.
            </p>
          </div>

          <figure className="flex flex-col gap-5">
            <BrickWall pledged={progress.pledged} target={block.targetAmount} />
            <figcaption className="flex flex-col gap-4">
              <ProgressFigures progress={progress} target={block.targetAmount} />
              <p className="text-sm text-ink-soft">
                Each brick is KES 1 million. The first bricks are the founding pledges members made at the plenary on
                20 September 2026.
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-3xl font-bold">What the block will hold</h2>
        <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {block.components.map((c) => (
            <div key={c.name} className="border-t-2 border-ink pt-3">
              <dt className="font-display text-xl font-bold">{c.name}</dt>
              <dd className="mt-1 text-ink-soft">{c.purpose}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 max-w-prose text-ink-soft">
          The design is open for improvement. During the consultation in December, alumni and the school can suggest
          changes to the drawings.
        </p>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-10 rounded-lg bg-tea-tint p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">Where your money goes</h2>
            <p className="mt-4">
              Gifts to the tuition block go straight into a dedicated project account held by the school&rsquo;s Board
              of Management. The money never passes through an individual or the association.
            </p>
            <p className="mt-3">
              An alumni representative sits on the school&rsquo;s project committee, oversees spending and reports
              back to members. Every pledge and payment is recorded here, so you can follow progress.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-bold">Before we launch</h2>
            <p className="mt-4">
              The campaign starts at an official launch once the foundations are in place.{" "}
              <strong>
                {ready} of {block.readiness.length}
              </strong>{" "}
              steps are done.
            </p>
            <Link href="/causes/tuition-block#readiness" className={`${buttonClass("quiet")} mt-3`}>
              See the launch checklist
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <h2 className="text-3xl font-bold">Other ways to give</h2>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {others.map((c) => (
            <li key={c.slug} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-prose">
                <Link href={`/causes/${c.slug}`} className="font-display text-xl font-bold hover:text-tea">
                  {c.title}
                </Link>
                <p className="mt-1 text-ink-soft">{c.summary}</p>
              </div>
              <Link href={`/give/${c.slug}`} className={`${buttonClass("secondary", "sm")} shrink-0`}>
                Give to {c.title.toLowerCase()}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="flex flex-col gap-6 border-l-4 border-gold pl-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-prose">
            <h2 className="text-3xl font-bold">Find your classmates</h2>
            <p className="mt-3 text-ink-soft">
              Join the association&rsquo;s first membership register. Choose your class and region, and connect with
              alumni near you. Registration opens to all in January 2027.
            </p>
          </div>
          <Link href="/join" className={`${buttonClass("primary")} shrink-0`}>
            Join the association
          </Link>
        </div>
      </section>
    </>
  );
}
