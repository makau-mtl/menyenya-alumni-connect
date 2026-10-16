// Wording for the Corporate sponsorships and Strategic partnerships pages.
// Draft for leadership approval (17 Oct 2026). Packages, sponsors and partners are managed in the admin area.

export type SupportCopy = {
  kind: "sponsor" | "partner";
  eyebrow: string;
  title: string;
  intro: string;
  cta: string;
  heroSpace: string;
  whyTitle: string;
  why: { title: string; text: string }[];
  packagesTitle: string;
  packagesIntro: string;
  packageLabel: string;
  noPackages: string;
  wallTitle: string;
  wallEmpty: string;
  impactSpace: string;
  impactTitle: string;
  impactText: string;
  faqs: { q: string; a: string }[];
};

const commonFaqs = [
  {
    q: "Where does the money go?",
    a: "Straight into a named institutional account, never to a person. Gifts for the tuition block go to the school Board of Management's project account; other support goes to the association's account. Every gift is recorded and reported.",
  },
  {
    q: "Will we get a receipt and an acknowledgement?",
    a: "Yes. You receive an official receipt, a certificate of appreciation, and your logo on this website if you wish.",
  },
];

export const sponsorships: SupportCopy = {
  kind: "sponsor",
  eyebrow: "Corporate sponsorships",
  title: "Invest in the next generation from Menyenya",
  intro:
    "Businesses, SACCOs and foundations help us build the school's future and support students who need it. Sponsor a part of a project, a student fund, or our work as a whole.",
  cta: "Become a sponsor",
  heroSpace: "support.sponsors.hero",
  whyTitle: "Why sponsor",
  why: [
    { title: "Visible, lasting impact", text: "Your support becomes classrooms, books and students who finish school, in a community that remembers who helped." },
    { title: "A network of professionals", text: "Reach alumni working across Kenya and abroad: teachers, doctors, engineers, entrepreneurs and leaders." },
    { title: "Money you can trace", text: "Every shilling is recorded and paid into named institutional accounts. You receive regular updates on what it achieved." },
  ],
  packagesTitle: "Sponsorship options",
  packagesIntro: "Choose the option that fits your goals. We are happy to shape a sponsorship around what you want to achieve.",
  packageLabel: "Sponsorship option you are interested in",
  noPackages: "Sponsorship options are being finalised by the leadership. Tell us what you have in mind and we will shape one with you.",
  wallTitle: "The company you'll keep",
  wallEmpty: "Be among the first organisations to sponsor the Menyenya alumni.",
  impactSpace: "support.sponsors.impact",
  impactTitle: "What your sponsorship builds",
  impactText:
    "Our first major project is a KES 100 million tuition block for Menyenya SDA High School: classrooms, laboratories and a library. Sponsors can also support needy students and the programmes that connect alumni with today's students.",
  faqs: [
    ...commonFaqs,
    { q: "Can we sponsor a specific part of a project?", a: "Yes. A laboratory, the library, a classroom or a student fund can carry your name, with regular updates on progress." },
    { q: "How do we pay?", a: "By bank transfer or the official Paybill shown on this website. We will confirm the details with you in writing; we never ask for money to a personal number." },
  ],
};

export const partnerships: SupportCopy = {
  kind: "partner",
  eyebrow: "Strategic partnerships",
  title: "Partner with us to open doors for students",
  intro:
    "We work with institutions that share our goals: the school, churches, universities, employers, professional bodies and development organisations. Together we can do more than either could alone.",
  cta: "Talk to us about a partnership",
  heroSpace: "support.partners.hero",
  whyTitle: "Why partner with us",
  why: [
    { title: "A committed community", text: "Thousands of alumni across generations, organised by class and region, ready to give time, skills and resources." },
    { title: "A direct line to the school", text: "We work closely with the school's Board of Management and leadership on what students actually need." },
    { title: "Shared, measurable goals", text: "We agree clear goals with each partner and report on them openly." },
  ],
  packagesTitle: "Ways we partner",
  packagesIntro: "Areas where we are looking for partners. Each partnership is agreed in writing.",
  packageLabel: "Area you are interested in",
  noPackages: "Partnership areas are being finalised by the leadership. Tell us what you have in mind.",
  wallTitle: "Our partners",
  wallEmpty: "Our first partnerships are being agreed. Yours could be one of them.",
  impactSpace: "support.partners.impact",
  impactTitle: "What we can do together",
  impactText:
    "Mentorship and career guidance for students, internships and jobs for graduates, scholarships, and improvements to the school's facilities.",
  faqs: [
    ...commonFaqs,
    { q: "How is a partnership agreed?", a: "We meet, agree goals and responsibilities, and sign a short memorandum of understanding approved by the association's leadership." },
  ],
};
