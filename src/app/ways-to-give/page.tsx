import Link from "next/link";
import type { Metadata } from "next";
import { org } from "@/content/site";
import { ImageSlot } from "@/components/media";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = {
  title: "Ways to give",
  description: "Give once, pledge over time, give in kind, or give through your class or organisation.",
};

const choices = [
  {
    title: "Give today",
    text: "A one-off gift of any amount, to the tuition block, a student in need, or wherever it is most needed.",
    cta: "Donate",
    href: "/donate",
    image: "a student reading in the library",
  },
  {
    title: "Pledge over time",
    text: "Commit an amount and pay monthly, quarterly or yearly. KES 1,000 a month for three years adds up to KES 36,000.",
    cta: "Make a pledge",
    href: "/pledge/tuition-block",
    image: "a class celebrating their pledge",
  },
  {
    title: "Give another way",
    text: "Give materials or professional time, give in honour or memory of someone, or rally your class behind a shared target.",
    cta: "See other ways",
    href: "#other-ways",
    image: "alumni volunteers at the school",
  },
];

const otherWays = [
  {
    title: "In kind",
    text: "Building materials, books, computers or equipment the project needs. We record each gift against the Bill of Quantities.",
    href: "/pledge/tuition-block?type=in_kind",
    cta: "Pledge in kind",
  },
  {
    title: "Your skills",
    text: "Architects, engineers, quantity surveyors, lawyers, accountants and designers: give your expertise to the project.",
    href: "/join",
    cta: "Register your skills",
  },
  {
    title: "In honour or memory",
    text: "Mark a teacher, a classmate or a family milestone with a gift in their name.",
    href: "/donate",
    cta: "Give a tribute gift",
  },
  {
    title: "As a class",
    text: "Set a target with your classmates and see your class on the tuition block's progress. Your class rep can start one.",
    href: "/join",
    cta: "Find your class",
  },
];

export default function WaysToGivePage() {
  return (
    <>
      <section className="bg-surface">
        <div className="section grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl">What can one alumnus do? Quite a lot.</h1>
            <p className="mt-5 text-lg text-ink-soft sm:text-xl">
              Every gift, large or small, goes to a cause you choose, is recorded, and is reported back to members.
            </p>
            <Link href="/donate" className={`${buttonClass("gold", "lg")} mt-8`}>
              Give now
            </Link>
          </div>
          <div className="grid grid-cols-[1.5fr_1fr] items-end gap-4">
            <ImageSlot caption="students in a crowded classroom today" ratio="landscape" />
            <ImageSlot caption="the site of the tuition block" ratio="portrait" tone="light" />
          </div>
        </div>
      </section>

      <section className="section pt-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Your gift, your choice</h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-soft">No account is needed to give. You get a reference and a receipt every time.</p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {choices.map((c) => (
            <div key={c.title} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
              <ImageSlot caption={c.image} ratio="landscape" className="rounded-none" />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-2xl font-bold">{c.title}</h3>
                <p className="mt-2 flex-1 text-ink-soft">{c.text}</p>
                <Link href={c.href} className={`${buttonClass("primary")} mt-6 self-start`}>
                  {c.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20 bg-ink py-20 text-white">
        <div className="section grid items-center gap-10 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <ImageSlot caption="a student who stayed in school" ratio="portrait" tone="light" />
            <div className="flex flex-col gap-4 pt-10">
              <ImageSlot caption="the computer laboratory today" ratio="square" />
              <ImageSlot caption="students at assembly" ratio="square" tone="light" />
            </div>
          </div>
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold sm:text-4xl">When you give, you give to students like you once were</h2>
            <p className="mt-5 text-lg text-white/80">
              The tuition block will give every Menyenya student a library to study in and computer laboratories to
              learn digital skills, and ease crowding in today&rsquo;s classrooms. The Keep a Child in School fund helps
              students whose families cannot meet fees stay in class.
            </p>
            <p className="mt-4 text-sm text-white/60">Student stories will be shared here with the school&rsquo;s and parents&rsquo; consent.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/donate" className={buttonClass("gold", "lg")}>
                Donate today
              </Link>
              <Link href="/causes" className={buttonClass("light", "lg")}>
                See our work
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="other-ways" className="section scroll-mt-24 pt-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Your generosity can take many forms</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {otherWays.map((w) => (
            <Link key={w.title} href={w.href} className="group flex flex-col rounded-xl border border-line bg-surface p-7 hover:border-tea">
              <h3 className="text-2xl font-bold">{w.title}</h3>
              <p className="mt-2 flex-1 text-ink-soft">{w.text}</p>
              <span className="mt-5 font-semibold text-tea group-hover:underline">{w.cta}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="organisations" className="section scroll-mt-24 pt-20">
        <div className="grid gap-10 rounded-2xl bg-tea-tint p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Organisations and partners</h2>
            <p className="mt-4 text-lg text-ink-soft">
              Companies, foundations, churches and SACCOs can sponsor a part of the tuition block, such as a
              laboratory or the library, or partner with us on student support.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <p className="text-lg">Organisations can give through the same forms, or talk to us about a sponsorship.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/donate" className={buttonClass("primary")}>
                Give as an organisation
              </Link>
              <Link href="/contact" className={buttonClass("secondary")}>
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-20">
        <h2 className="text-3xl font-bold">Questions? We&rsquo;ll find your answer.</h2>
        <p className="mt-3 text-lg text-ink-soft">
          Write to <a href={`mailto:${org.email}`} className="font-semibold text-tea underline underline-offset-4">{org.email}</a>{" "}
          and someone from the association will get back to you.
        </p>
        <Link href="/contact" className={`${buttonClass("secondary")} mt-6`}>
          Contact us
        </Link>
      </section>
    </>
  );
}
