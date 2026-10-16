import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// "Our people": positions shown publicly without term dates; terms for members; alerts for admins.
let db: Db;
let admin: string;
let chair: { user: string; person: string };

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  const u = await createLogin(db, "chair@example.com");
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: "Charles Chair", phone: "0711 000 010", phone_country: "KE", phone_whatsapp: true, category: "alumnus",
    year_left: 1995, occupation_status: "business", level: "Impact", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  chair = { user: u, person: (await personFor(db, u))! };
  await db.query("update public.member_profiles set headline = 'Businessman in Nairobi' where person_id = $1", [chair.person]);
}, 60_000);

describe("our people", () => {
  it("lets only administrators manage positions", async () => {
    await as(db, { user: chair.user }, async () => {
      await expect(db.query("insert into public.public_positions (section, title, display_name) values ('leadership', 'X', 'Y')")).rejects.toThrow();
    });
    await as(db, { user: admin }, async () => {
      await db.query(`insert into public.public_positions (section, title, sort_order, person_id, has_tenure, term_starts, term_ends)
                      values ('leadership', 'Chairman', 1, $1, true, '2026-09-20', current_date + 10)`, [chair.person]);
      await db.query(`insert into public.public_positions (section, title, sort_order, display_name, capacity_note, has_tenure)
                      values ('leadership', 'School Principal (ex officio)', 9, 'Mr J. Principal', 'In his official capacity as Principal', false)`);
    });
  });

  it("shows positions publicly with the holder's details but never term dates", async () => {
    await as(db, "anon", async () => {
      const r = await db.query<Record<string, unknown>>("select * from public.people_positions()");
      expect(r.rows.map((x) => x.name)).toEqual(["Charles Chair", "Mr J. Principal"]);
      expect(r.rows[0].summary).toBe("Businessman in Nairobi");
      expect(r.rows[0].year_left).toBe(1995);
      expect(Object.keys(r.rows[0]).some((k) => k.startsWith("term"))).toBe(false);
      await expect(db.query("select * from public.people_terms()")).rejects.toThrow(/permission denied/);
      expect((await db.query("select * from public.public_positions")).rows).toEqual([]);
    });
  });

  it("shows term dates to members, and alerts administrators before a term ends", async () => {
    await as(db, { user: chair.user }, async () => {
      expect((await db.query("select * from public.people_terms()")).rows.length).toBe(1);
      expect((await db.query("select * from public.position_alerts()")).rows).toEqual([]);
    });
    await as(db, { user: admin }, async () => {
      const r = await db.query<{ title: string; ended: boolean }>("select title, ended from public.position_alerts()");
      expect(r.rows).toEqual([{ title: "Chairman", ended: false }]);
    });
  });

  it("lists office holders among public members even without a public profile", async () => {
    await as(db, "anon", async () => {
      const r = await db.query<{ full_name: string }>("select full_name from public.public_members()");
      expect(r.rows.map((x) => x.full_name)).toEqual(["Charles Chair"]);
    });
  });
});
