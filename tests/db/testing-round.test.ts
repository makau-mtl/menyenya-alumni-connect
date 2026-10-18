import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Committee testing: a testers' link opens registration while it is closed; testers give feedback.
let db: Db;
let admin: string;
let token = "";

const answers = (invite: string | null, phone: string) => JSON.stringify({
  full_name: "Tess Tester", phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: 2001,
  occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi", invite,
  consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false },
});

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await as(db, { user: admin }, async () => {
    token = (await db.query<{ token: string }>("insert into public.invite_links (label, tester) values ('Technical Committee testers', true) returning token")).rows[0].token;
    await db.query("insert into public.invite_links (label) values ('Ordinary link')");
  });
}, 90_000);

describe("testers' link", () => {
  it("lets testers register while registration is closed, and marks them", async () => {
    const outsider = await createLogin(db, "out@example.com");
    await as(db, { user: outsider }, async () => {
      await expect(db.query("select public.complete_registration($1)", [answers(null, "0711 120 001")])).rejects.toThrow(/not open/);
    });
    const tester = await createLogin(db, "tess@example.com");
    await as(db, { user: tester }, async () => {
      await db.query("select public.complete_registration($1)", [answers(token, "0711 120 002")]);
      const p = await personFor(db, tester);
      expect((await db.query<{ is_tester: boolean }>("select is_tester from public.member_profiles where person_id = $1", [p])).rows[0].is_tester).toBe(true);
      await expect(db.query("update public.member_profiles set is_tester = false where person_id = $1", [p])).rejects.toThrow(/administrator/);
      expect((await db.query<{ tester: boolean }>("select tester from public.invite_info($1)", [token])).rows[0].tester).toBe(true);
    });
  });

  it("lets testers give feedback that only administrators read", async () => {
    const tester = (await db.query<{ user_id: string }>("select user_id from public.persons where full_name = 'Tess Tester'")).rows[0].user_id;
    await as(db, { user: tester }, async () => {
      const me = await personFor(db, tester);
      await db.query("insert into public.feedback (person_id, page, what_happened, severity) values ($1, '/app', 'The save button did nothing', 'blocks')", [me]);
      expect((await db.query("select * from public.feedback")).rows.length).toBe(1);
    });
    await as(db, { user: admin }, async () => {
      expect((await db.query<{ severity: string }>("select severity from public.feedback")).rows).toEqual([{ severity: "blocks" }]);
      await db.query("update public.feedback set status = 'agreed'");
    });
  });
});
