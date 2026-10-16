import type { Metadata } from "next";
import { org } from "@/content/site";
import { DraftNote } from "@/components/page-hero";

export const metadata: Metadata = { title: "Privacy policy", description: "How the association looks after your personal information." };

// Version recorded with every consent (consents.wording_version). Change it when the wording changes,
// together with the "v1" in complete_registration() and saveChoices().
const PRIVACY_VERSION = "v1";

const sections: { h: string; p: React.ReactNode[] }[] = [
  {
    h: "Who we are",
    p: [
      <>The {org.name} (&ldquo;the association&rdquo;) decides how your personal information is used on this website and is responsible for it under Kenya&rsquo;s Data Protection Act, 2019.</>,
      <>Contact us about anything in this policy at {org.email}.</>,
    ],
  },
  {
    h: "What we collect",
    p: [
      <><strong>When you register:</strong> your name, email, phone number and its country, whether you are an alumnus or a friend of the alumni, your class and the years you were at Menyenya (or how you are connected to the school), your county and region, what you do now and your membership level, and your choices about updates and the directory.</>,
      <><strong>If you choose to add them:</strong> a photo, a one-line summary of your work, your profession, employer or business, skills, LinkedIn and other links, and whether you would like to mentor or be mentored.</>,
      <><strong>Welfare and emergency contact:</strong> the name, relationship and phone number of someone we should contact. Ask their permission before you give us their details.</>,
      <><strong>When you give or pledge:</strong> your name, email, phone, the amount and cause, and payment references.</>,
      <><strong>When you sign in with Google or LinkedIn:</strong> we receive your name, email address and, if you have one, your profile picture. We never post anything on your behalf.</>,
    ],
  },
  {
    h: "Why we use it",
    p: [
      "To keep the register of members, organise members by class and region, and confirm membership.",
      "To record gifts and pledges, issue receipts and report to members on how money is used.",
      "To send you updates, but only by the channels you agreed to.",
      "To support members through welfare schemes, where you have joined one.",
      "To keep the website secure, prevent duplicate records, and keep an audit trail of changes.",
    ],
  },
  {
    h: "Who can see it",
    p: [
      "Your phone number and email are never shown publicly or in the member directory.",
      "If you agree to be listed, signed-in members can see your name, class, region, photo and work summary.",
      "If you switch on a public profile, anyone can see your name, class, one-line summary, photo and links. It is off unless you switch it on.",
      "Your class rep and the officials who manage membership see the details they need to confirm and support members.",
      "Your welfare and emergency contact is seen only by you and the Welfare Coordinator. Each time the coordinator looks, it is recorded.",
      "We do not sell your information or share it for advertising.",
    ],
  },
  {
    h: "Services we use",
    p: [
      "Supabase (database and file storage), Vercel (website hosting), Google and LinkedIn (if you sign in with them), and an email service to send messages. Some of these store data outside Kenya; we use providers that protect it and only for the purposes above.",
      "Money is paid into the institutional accounts named on each cause page, not held by this website.",
    ],
  },
  {
    h: "How long we keep it",
    p: [
      "Membership details are kept while you are a member and for a period afterwards to be confirmed by the officials.",
      "Financial records are kept for as long as the law requires, even if you leave, so that the association's accounts stay complete.",
    ],
  },
  {
    h: "Your rights",
    p: [
      "You can see and correct most of your details yourself in My account. You can also ask us for a copy of your information, to correct or delete it, to stop using it for a purpose, or to move it elsewhere.",
      "You can change your choices about updates, the directory and your public profile at any time.",
      "If you ask us to delete your record, we remove your personal details but keep financial records the law requires, without your contact details where we can.",
      "If you are unhappy with how we handle your information, please tell us first. You can also complain to the Office of the Data Protection Commissioner (www.odpc.go.ke).",
    ],
  },
  {
    h: "Students and photos",
    p: [
      "Photos of students are used only with the school's and parents' consent, and students supported by the Keep a Child in School fund are never named publicly.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <article className="section max-w-3xl pb-16 pt-12 lg:pt-16">
      <h1 className="text-4xl font-bold sm:text-5xl">Privacy policy</h1>
      <p className="mt-3 text-ink-soft">Version {PRIVACY_VERSION}. How the association looks after your personal information.</p>
      <div className="mt-6">
        <DraftNote>
          this policy is a draft for the officials and a legal adviser to confirm, including the retention period and
          whether the association must register with the Office of the Data Protection Commissioner.
        </DraftNote>
      </div>
      <div className="mt-10 flex flex-col gap-10">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-2xl font-bold">{s.h}</h2>
            <div className="mt-3 flex flex-col gap-3 text-[1.0625rem] leading-relaxed">
              {s.p.map((x, i) => (
                <p key={i}>{x}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
