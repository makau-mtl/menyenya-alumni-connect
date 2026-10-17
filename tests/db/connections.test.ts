import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Part B: personal invites, class WhatsApp groups, meet-ups.
let db: Db;
let admin: string;
let a: { user: string; person: string }; // class of 2010, Nairobi
let b: { user: string; person: string }; // class of 2010, Nyanza
let c: { user: string; person: string }; // class of 2004, Nairobi

async function register(email: string, name: string, phone: string, year: number, region: string) {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: name, phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: year,
    occupation_status: "employed", level: "Growth", county: region === "Nyanza" ? "Kisii" : region, region,
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  return { user: u, person: (await personFor(db, u))! };
}

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  a = await register("a@example.com", "Alice Achieng", "0711 200 001", 2010, "Nairobi");
  b = await register("b@example.com", "Brian Bosire", "0711 200 002", 2010, "Nyanza");
  c = await register("c@example.com", "Carol Chebet", "0711 200 003", 2004, "Nairobi");
}, 90_000);

describe("connections", () => {
  it("gives each member one personal invite link", async () => {
    await as(db, { user: a.user }, async () => {
      const t1 = (await db.query<{ t: string }>("select public.my_invite_link() as t")).rows[0].t;
      const t2 = (await db.query<{ t: string }>("select public.my_invite_link() as t")).rows[0].t;
      expect(t1).toBe(t2);
      expect((await db.query<{ n: number }>("select public.my_invites_joined() as n")).rows[0].n).toBe(0);
    });
    await as(db, "anon", async () => {
      await expect(db.query("select public.my_invite_link()")).rejects.toThrow(/permission denied/);
    });
  });

  it("shows the class WhatsApp link only to that class, set by an administrator or the class rep", async () => {
    await as(db, { user: a.user }, async () => {
      await expect(db.query("select public.set_class_group(2010, 'https://chat.whatsapp.com/AbC123')")).rejects.toThrow(/class rep/);
    });
    await as(db, { user: admin }, () => db.query("select public.set_class_group(2010, 'https://chat.whatsapp.com/AbC123')"));
    await as(db, { user: b.user }, async () => {
      expect((await db.query("select whatsapp_url from public.my_class_group()")).rows).toEqual([{ whatsapp_url: "https://chat.whatsapp.com/AbC123" }]);
    });
    await as(db, { user: c.user }, async () => {
      expect((await db.query("select whatsapp_url from public.my_class_group()")).rows).toEqual([{ whatsapp_url: null }]);
      expect((await db.query("select * from public.class_groups")).rows).toEqual([]);
    });
  });

  it("shows meet-ups to the right audience and records who is going", async () => {
    let classOnly = "";
    await as(db, { user: a.user }, async () => {
      await db.query("insert into public.meetups (organiser_id, title, place, happens_on, audience) values ($1, 'Nyama choma', 'Kisii town', current_date + 3, 'everyone')", [a.person]);
      classOnly = (await db.query<{ id: string }>("insert into public.meetups (organiser_id, title, place, happens_on, audience) values ($1, 'Class 2010 lunch', 'Westlands', current_date + 5, 'class') returning id", [a.person])).rows[0].id;
      await expect(db.query("insert into public.meetups (organiser_id, title, place, happens_on) values ($1, 'Fake', 'X town', current_date + 1)", [b.person])).rejects.toThrow();
      await expect(db.query("insert into public.meetups (organiser_id, title, place, happens_on) values ($1, 'Past', 'Kisii', current_date - 1)", [a.person])).rejects.toThrow();
    });
    await as(db, { user: c.user }, async () => {
      const r = await db.query<{ title: string }>("select title from public.upcoming_meetups()");
      expect(r.rows.map((x) => x.title)).toEqual(["Nyama choma"]); // not the class-only one
      await expect(db.query("insert into public.meetup_responses (meetup_id, person_id) values ($1, $2)", [classOnly, c.person])).rejects.toThrow();
    });
    await as(db, { user: b.user }, async () => {
      await db.query("insert into public.meetup_responses (meetup_id, person_id) values ($1, $2)", [classOnly, b.person]);
      const r = await db.query<{ title: string; going_count: string; i_am_going: boolean; going_names: string[] }>(
        "select title, going_count, i_am_going, going_names from public.upcoming_meetups() where id = $1", [classOnly]);
      expect(r.rows[0]).toMatchObject({ i_am_going: true, going_names: ["Brian Bosire"] });
      expect(Number(r.rows[0].going_count)).toBe(1);
      await expect(db.query("update public.meetups set title = 'Hijacked' where id = $1", [classOnly])).resolves.toBeDefined();
    });
    await as(db, { user: a.user }, async () => {
      expect((await db.query<{ title: string }>("select title from public.meetups where id = $1", [classOnly])).rows[0].title).toBe("Class 2010 lunch");
    });
  });
});
