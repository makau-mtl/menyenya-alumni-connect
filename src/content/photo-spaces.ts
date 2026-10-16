// Every photo space on the website, listed so the admin area can show what goes where.
// Pages use <SitePhoto space="..." />; an uploaded photo replaces the "Photo to come" placeholder.

export type Ratio = "wide" | "video" | "landscape" | "square" | "portrait" | "tall";

export interface PhotoSpace {
  key: string;
  page: string;
  /** What belongs in the space; shown until a photo is uploaded. */
  label: string;
  ratio: Ratio;
}

export const photoSpaces: PhotoSpace[] = [
  { key: "home.hero.main", page: "Home", label: "students outside the school", ratio: "tall" },
  { key: "home.hero.side-1", page: "Home", label: "alumni at the plenary", ratio: "square" },
  { key: "home.hero.side-2", page: "Home", label: "the school gate", ratio: "square" },
  { key: "pillar.reconnect", page: "Home and Who we are", label: "alumni reunited at a homecoming", ratio: "landscape" },
  { key: "pillar.give-back", page: "Home and Who we are", label: "students in class at Menyenya", ratio: "landscape" },
  { key: "pillar.grow-together", page: "Home and Who we are", label: "an alumnus mentoring a recent graduate", ratio: "landscape" },
  { key: "home.give-today", page: "Home", label: "a student in the school library", ratio: "landscape" },
  { key: "home.pledge", page: "Home", label: "classmates planning their pledge", ratio: "landscape" },
  { key: "home.join", page: "Home", label: "alumni at a regional meet-up", ratio: "landscape" },
  { key: "home.closing", page: "Home", label: "today's students, tomorrow's alumni", ratio: "landscape" },
  { key: "who.history.main", page: "Who we are", label: "the school in its early years", ratio: "tall" },
  { key: "who.history.side-1", page: "Who we are", label: "a class photo from the archives", ratio: "square" },
  { key: "who.history.side-2", page: "Who we are", label: "the plenary, September 2026", ratio: "square" },
  { key: "ways.hero.main", page: "Ways to give", label: "students in a crowded classroom today", ratio: "landscape" },
  { key: "ways.hero.side", page: "Ways to give", label: "the site of the tuition block", ratio: "portrait" },
  { key: "ways.give-today", page: "Ways to give", label: "a student reading in the library", ratio: "landscape" },
  { key: "ways.pledge", page: "Ways to give", label: "a class celebrating their pledge", ratio: "landscape" },
  { key: "ways.other", page: "Ways to give", label: "alumni volunteers at the school", ratio: "landscape" },
  { key: "ways.story.main", page: "Ways to give", label: "a student who stayed in school (with consent)", ratio: "portrait" },
  { key: "ways.story.side-1", page: "Ways to give", label: "the computer laboratory today", ratio: "square" },
  { key: "ways.story.side-2", page: "Ways to give", label: "students at assembly", ratio: "square" },
  { key: "join.hero", page: "Join", label: "classmates reunited at a homecoming", ratio: "landscape" },
  { key: "careers.hero", page: "Careers", label: "the association's team at work", ratio: "landscape" },
  { key: "people.hero", page: "Our people", label: "alumni of many classes together", ratio: "landscape" },
  { key: "people.join", page: "Our people", label: "classmates at a homecoming", ratio: "landscape" },
  { key: "support.sponsors.hero", page: "Corporate sponsorships", label: "students in a new classroom", ratio: "landscape" },
  { key: "support.sponsors.impact", page: "Corporate sponsorships", label: "the tuition block site or students learning", ratio: "landscape" },
  { key: "support.partners.hero", page: "Strategic partnerships", label: "an alumnus mentoring students", ratio: "landscape" },
  { key: "support.partners.impact", page: "Strategic partnerships", label: "students at a career day", ratio: "landscape" },
  { key: "shop.hero", page: "Alumni merchandise", label: "alumni wearing Menyenya merchandise", ratio: "landscape" },
];

export const photoSpaceKeys = new Set(photoSpaces.map((s) => s.key));

export function getPhotoSpace(key: string): PhotoSpace {
  const space = photoSpaces.find((s) => s.key === key);
  if (!space) throw new Error(`Unknown photo space: ${key}`);
  return space;
}
