import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Part C: memories feed — members only, straight away, reportable, hidden by administrators.
let db: Db;
let admin: string;
let a: { user: string; person: string };
let b: { user: string; person: string };
let stranger: string;
let memory = "";

async function register(email: string, name: string, phone: string) {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: name, phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: 2010,
    occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  return { user: u, person: (await personFor(db, u))! };
}

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  a = await register("a@example.com", "Alice Achieng", "0711 300 001");
  b = await register("b@example.com", "Brian Bosire", "0711 300 002");
  stranger = await createLogin(db, "s@example.com");
}, 90_000);

describe("memories", () => {
  it("lets members post into their own folder only", async () => {
    await as(db, { user: a.user }, async () => {
      memory = (await db.query<{ id: string }>("insert into public.memories (person_id, photo_path, caption) values ($1, $2, 'Form 4 trip') returning id", [a.person, `${a.person}/one`])).rows[0].id;
      await expect(db.query("insert into public.memories (person_id, photo_path) values ($1, $2)", [a.person, `${b.person}/x`])).rejects.toThrow();
    });
    await as(db, { user: stranger }, async () => {
      expect((await db.query("select * from public.memories")).rows).toEqual([]);
      expect((await db.query("select * from public.memory_feed()")).rows).toEqual([]);
    });
  });

  it("shows the feed to members with hearts and comments", async () => {
    await as(db, { user: b.user }, async () => {
      await db.query("insert into public.memory_reactions (memory_id, person_id) values ($1, $2)", [memory, b.person]);
      await db.query("insert into public.memory_comments (memory_id, person_id, body) values ($1, $2, 'Good old days!')", [memory, b.person]);
      const f = await db.query<{ caption: string; hearts: string; i_hearted: boolean; comments: string; mine: boolean; reports: string | null }>("select * from public.memory_feed()");
      expect(f.rows[0]).toMatchObject({ caption: "Form 4 trip", i_hearted: true, mine: false, reports: null });
      expect(Number(f.rows[0].hearts)).toBe(1);
      expect((await db.query("select full_name, body from public.memory_comment_list($1)", [memory])).rows).toEqual([{ full_name: "Brian Bosire", body: "Good old days!" }]);
      await expect(db.query("update public.memories set status = 'hidden' where id = $1", [memory])).resolves.toBeDefined();
    });
    await as(db, { user: a.user }, async () => {
      expect((await db.query<{ status: string }>("select status from public.memories where id = $1", [memory])).rows[0].status).toBe("published");
    });
  });

  it("lets members report, and administrators hide; the owner cannot bring it back", async () => {
    await as(db, { user: b.user }, () => db.query("insert into public.memory_reports (memory_id, person_id, reason) values ($1, $2, 'Shows a student')", [memory, b.person]));
    await as(db, { user: admin }, async () => {
      const r = await db.query<{ reports: string }>("select reports from public.memory_feed(24, null, true)");
      expect(Number(r.rows[0].reports)).toBe(1);
      await db.query("update public.memories set status = 'hidden' where id = $1", [memory]);
    });
    await as(db, { user: b.user }, async () => {
      expect((await db.query("select * from public.memory_feed()")).rows).toEqual([]);
    });
    await as(db, { user: a.user }, async () => {
      await expect(db.query("update public.memories set status = 'published' where id = $1", [memory])).rejects.toThrow(/hidden/);
    });
  });
});
