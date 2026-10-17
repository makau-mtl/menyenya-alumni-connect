import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Cohort pages: members-only; the elected rep (given the role by an administrator) keeps the page.
let db: Db;

let rep: { user: string; person: string };
let mate: { user: string; person: string };
let other: { user: string; person: string };

async function register(email: string, name: string, phone: string, year: number) {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: name, phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: year,
    occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  return { user: u, person: (await personFor(db, u))! };
}

beforeAll(async () => {
  db = await freshDatabase();
  await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  rep = await register("r@example.com", "Rita Rep", "0711 900 001", 2004);
  mate = await register("m@example.com", "Moses Mate", "0711 900 002", 2004);
  other = await register("o@example.com", "Olive Other", "0711 900 003", 2010);
  const cohort = (await db.query<{ id: string }>("select id from public.cohorts where year_left = 2004")).rows[0].id;
  await assignRole(db, rep.person, "cohort_rep", "cohort", cohort);
}, 90_000);

describe("cohort pages", () => {
  it("lets the rep write the welcome and WhatsApp link; others cannot", async () => {
    await as(db, { user: rep.user }, async () => {
      await db.query("select public.set_cohort_welcome(2004, 'Karibu, 2004!')");
      await db.query("select public.set_class_group(2004, 'https://chat.whatsapp.com/abc')");
    });
    await as(db, { user: mate.user }, async () => {
      await expect(db.query("select public.set_cohort_welcome(2004, 'Hijack')")).rejects.toThrow(/cohort rep/);
    });
  });

  it("shows the page to members, with the WhatsApp link only for the cohort", async () => {
    const page = async (user: string) => as(db, { user }, async () => (await db.query<{ p: Record<string, unknown> }>("select public.cohort_page(2004) as p")).rows[0].p);
    const mine = await page(mate.user);
    expect(mine).toMatchObject({ year: 2004, mine: true, members: 2, rank: 1, welcome: "Karibu, 2004!", whatsapp_url: "https://chat.whatsapp.com/abc" });
    expect((mine.reps as { name: string }[]).map((r) => r.name)).toEqual(["Rita Rep"]);
    const theirs = await page(other.user);
    expect(theirs).toMatchObject({ mine: false, whatsapp_url: null, welcome: "Karibu, 2004!" });
    const stranger = await createLogin(db, "s@example.com");
    expect(await page(stranger)).toBeNull();
    const role = await db.query<{ name: string }>("select name from public.roles where key = 'cohort_rep'");
    expect(role.rows[0].name).toBe("Cohort rep");
  });
});
