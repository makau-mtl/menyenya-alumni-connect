import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Active / Inactive: calendar year, grace to 31 March, no arrears, everyone active while fees are off.
let db: Db;
let admin: string;
let m: { user: string; person: string };
let other: { user: string; person: string };

async function register(email: string, name: string, phone: string) {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: name, phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus",
    year_left: 2010, occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  return { user: u, person: (await personFor(db, u))! };
}

const standing = async (person: string, on: string) =>
  (await db.query<{ s: string | null }>("select public.standing_of($1, $2::date) as s", [person, on])).rows[0].s;

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  m = await register("m@example.com", "Mary Member", "0711 000 021");
  other = await register("o@example.com", "Otto Other", "0711 000 022");
}, 60_000);

describe("membership standing", () => {
  it("treats every member as active while fees are switched off", async () => {
    expect(await standing(m.person, "2027-06-01")).toBe("active");
    await as(db, { user: m.user }, async () => {
      const r = await db.query<{ standing: string; fees_on: boolean }>("select standing, fees_on from public.my_standing()");
      expect(r.rows[0]).toMatchObject({ standing: "active", fees_on: false });
    });
  });

  it("follows the calendar year, grace to 31 March, and no arrears once fees are on", async () => {
    await db.query("update public.module_settings set enabled = true where module_key = 'membership_fees'");
    expect(await standing(m.person, "2027-06-01")).toBe("inactive");
    await as(db, { user: admin }, () => db.query("insert into public.membership_years (person_id, year) values ($1, 2027)", [m.person]));
    expect(await standing(m.person, "2027-06-01")).toBe("active");
    expect(await standing(m.person, "2028-03-31")).toBe("active");   // grace
    expect(await standing(m.person, "2028-04-01")).toBe("inactive"); // grace over
    expect(await standing(m.person, "2029-02-01")).toBe("inactive"); // skipped 2028: no grace into 2029
    // Paying for 2029 alone makes them active again; 2028 is never owed.
    await as(db, { user: admin }, () => db.query("insert into public.membership_years (person_id, year) values ($1, 2029)", [m.person]));
    expect(await standing(m.person, "2029-02-01")).toBe("active");
  });

  it("keeps paid years fixed and private", async () => {
    await as(db, { user: m.user }, async () => {
      await expect(db.query("insert into public.membership_years (person_id, year) values ($1, 2030)", [m.person])).rejects.toThrow();
      expect((await db.query("select year from public.membership_years order by year")).rows).toEqual([{ year: 2027 }, { year: 2029 }]);
      await expect(db.query("select public.standing_of($1)", [other.person])).rejects.toThrow(/permission denied/);
      expect((await db.query("select * from public.member_standings()")).rows).toEqual([]);
    });
    await as(db, { user: other.user }, async () => {
      expect((await db.query("select * from public.membership_years")).rows).toEqual([]);
    });
    await as(db, { user: admin }, async () => {
      await db.query("update public.membership_years set year = 2031");
      expect((await db.query("select 1 from public.membership_years where year = 2031")).rows).toEqual([]);
      const r = await db.query<{ standing: string }>("select standing from public.member_standings() order by standing");
      expect(r.rows.length).toBe(2);
    });
  });

  it("gives terminated members no standing", async () => {
    await db.query("update public.member_profiles set membership_status = 'terminated' where person_id = $1", [other.person]);
    expect(await standing(other.person, "2027-06-01")).toBeNull();
  });
});
