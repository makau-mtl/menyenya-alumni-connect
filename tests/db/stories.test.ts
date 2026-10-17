import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Alumni stories: members share or nominate; administrators, the Secretary and the Chairman approve;
// public only once approved and the person has agreed.
let db: Db;
let admin: string;
let a: { user: string; person: string };
let b: { user: string; person: string };
let chair: { user: string; person: string };
let own = "";
let nominated = "";

async function register(email: string, name: string, phone: string) {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: name, phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: 2010,
    occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  return { user: u, person: (await personFor(db, u))! };
}

const body = "From the dormitories of Menyenya to the operating theatre, this is a journey of many small steps.";

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  a = await register("a@example.com", "Alice Achieng", "0711 500 001");
  b = await register("b@example.com", "Brian Bosire", "0711 500 002");
  chair = await register("c@example.com", "Charles Chair", "0711 500 003");
  await assignRole(db, chair.person, "chair");
}, 90_000);

describe("alumni stories", () => {
  it("lets members share their own story or nominate someone, and keeps them private until approved", async () => {
    await as(db, { user: a.user }, async () => {
      own = (await db.query<{ id: string }>(
        "insert into public.alumni_stories (kind, submitted_by, subject_name, title, body, status, featured) values ('own', $1, 'Alice Achieng', 'From Menyenya to medicine', $2, 'published', true) returning id",
        [a.person, body])).rows[0].id;
      nominated = (await db.query<{ id: string }>(
        "insert into public.alumni_stories (kind, submitted_by, subject_name, subject_contact, title, body) values ('nomination', $1, 'Mr Ondieki', '0722 000 000', 'The teacher who never gave up', $2) returning id",
        [a.person, body])).rows[0].id;
      const rows = (await db.query<{ status: string; featured: boolean; consent_given: boolean }>("select status, featured, consent_given from public.alumni_stories order by kind desc")).rows;
      expect(rows).toEqual([{ status: "submitted", featured: false, consent_given: true }, { status: "submitted", featured: false, consent_given: false }]);
      expect((await db.query("update public.alumni_stories set status = 'published' where id = $1 returning id", [own])).rows).toEqual([]);
      await expect(db.query("insert into public.alumni_stories (kind, submitted_by, subject_name, title, body) values ('own', $1, 'Brian', 'Not mine to tell', $2)", [b.person, body])).rejects.toThrow();
    });
    await as(db, { user: b.user }, async () => {
      expect((await db.query("select * from public.alumni_stories")).rows).toEqual([]);
    });
    await as(db, "anon", async () => {
      expect((await db.query("select * from public.public_stories()")).rows).toEqual([]);
      expect((await db.query("select * from public.alumni_stories")).rows).toEqual([]);
    });
  });

  it("lets the Chairman publish, and refuses to publish a nomination without consent", async () => {
    await as(db, { user: chair.user }, async () => {
      await db.query("update public.alumni_stories set status = 'published', featured = true where id = $1", [own]);
      await expect(db.query("update public.alumni_stories set status = 'published' where id = $1", [nominated])).rejects.toThrow();
      await db.query("update public.alumni_stories set consent_given = true, consent_note = 'Agreed by phone', status = 'published' where id = $1", [nominated]);
    });
    await as(db, "anon", async () => {
      const list = (await db.query<{ title: string; featured: boolean; slug: string }>("select title, featured, slug from public.public_stories()")).rows;
      expect(list.map((r) => [r.title, r.featured])).toEqual([["From Menyenya to medicine", true], ["The teacher who never gave up", false]]);
      expect(list[0].slug).toMatch(/^from-menyenya-to-medicine-[0-9a-f]{5}$/);
      const one = (await db.query<{ body: string }>("select body from public.public_story($1)", [list[0].slug])).rows;
      expect(one[0].body).toBe(body);
      expect(Object.keys((await db.query("select * from public.public_stories()")).rows[0] as object)).not.toContain("subject_contact");
    });
  });

  it("keeps the web address when hidden and shown again, and an ordinary member cannot review", async () => {
    let slug = "";
    await as(db, { user: admin }, async () => {
      slug = (await db.query<{ slug: string }>("select slug from public.alumni_stories where id = $1", [own])).rows[0].slug;
      await db.query("update public.alumni_stories set status = 'archived' where id = $1", [own]);
      expect((await db.query<{ featured: boolean }>("select featured from public.alumni_stories where id = $1", [own])).rows[0].featured).toBe(false);
      await db.query("update public.alumni_stories set status = 'published', title = 'A new title for the story' where id = $1", [own]);
      expect((await db.query<{ slug: string }>("select slug from public.alumni_stories where id = $1", [own])).rows[0].slug).toBe(slug);
    });
    await as(db, { user: b.user }, async () => {
      expect((await db.query("update public.alumni_stories set status = 'declined' returning id")).rows).toEqual([]);
    });
  });
});

describe("review list", () => {
  it("shows officials who sent each story, and no one else", async () => {
    await as(db, { user: chair.user }, async () => {
      const r = (await db.query<{ submitted_by_name: string }>("select submitted_by_name from public.stories_for_review()")).rows;
      expect(r.map((x) => x.submitted_by_name)).toEqual(["Alice Achieng", "Alice Achieng"]);
    });
    await as(db, { user: b.user }, async () => {
      expect((await db.query("select * from public.stories_for_review()")).rows).toEqual([]);
    });
  });
});
