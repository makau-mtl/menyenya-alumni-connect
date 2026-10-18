import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Registration (M3): signing in creates nothing; finishing the steps creates everything at once.
let db: Db;
let admin: string;

const alumnus = (over: Record<string, unknown> = {}) => ({
  full_name: "Grace Kerubo Nyang'au",
  phone: "0712 000 111",
  phone_country: "KE",
  phone_whatsapp: true,
  category: "alumnus",
  year_left: 2008,
  admission_year: 2005,
  class_or_stream: "4 East",
  occupation_status: "employed",
  level: "Launch",
  county: "Nairobi",
  region: "Nairobi",
  consents: { membership_data: true, email_updates: true, directory_listing: true, public_profile: false },
  ...over,
});

const register = (user: string, payload: Record<string, unknown>) =>
  as(db, { user }, () => db.query<{ r: Record<string, unknown> }>("select public.complete_registration($1) as r", [JSON.stringify(payload)]));

const setModule = (key: string, enabled: boolean) =>
  db.query("update public.module_settings set enabled = $2 where module_key = $1", [key, enabled]);

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
}, 60_000);

describe("regions", () => {
  it("are the former provinces plus Diaspora, and every county has one", async () => {
    const r = await db.query<{ name: string }>("select name from public.clusters where active order by sort_order");
    expect(r.rows.map((x) => x.name)).toEqual([
      "Nairobi", "Central", "Coast", "Eastern", "North Eastern", "Nyanza", "Rift Valley", "Western", "Diaspora",
    ]);
    const missing = await db.query("select name from public.counties where cluster_id is null");
    expect(missing.rows).toEqual([]);
    const kisii = await db.query<{ name: string }>(
      "select cl.name from public.counties c join public.clusters cl on cl.id = c.cluster_id where c.name = 'Kisii'");
    expect(kisii.rows[0].name).toBe("Nyanza");
  });
});

describe("signing in", () => {
  it("creates no person, profile or consent on its own", async () => {
    const before = await db.query<{ n: number }>("select count(*)::int n from public.persons");
    await createLogin(db, "just.looking@example.com", "Just Looking");
    const after = await db.query<{ n: number }>("select count(*)::int n from public.persons");
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });
});

describe("finishing registration", () => {
  it("is refused while registration is closed, except for administrators", async () => {
    const u = await createLogin(db, "early@example.com");
    await expect(register(u, alumnus())).rejects.toThrow(/not open yet/);
    const adminPerson = await personFor(db, admin);
    await expect(register(admin, alumnus({ phone: "0712 999 999", full_name: "Ada Admin" }))).resolves.toBeTruthy();
    const r = await db.query("select 1 from public.member_profiles where person_id = $1", [adminPerson]);
    expect(r.rows.length).toBe(1);
  });

  it("checks every required answer in the database", async () => {
    await setModule("registration", true);
    const u = await createLogin(db, "checks@example.com");
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ full_name: "Grace" }, /full name/],
      [{ phone: "12345" }, /Kenyan phone/],
      [{ phone: "07123", phone_country: "GB" }, /country code/],
      [{ category: "stranger" }, /alumnus or friend/],
      [{ year_left: 1900 }, /year you left/],
      [{ level: "Platinum" }, /membership level/],
      [{ occupation_status: "astronaut" }, /what you do/],
      [{ county: "Atlantis" }, /county/],
      [{ region: "Moon" }, /region/],
      [{ consents: { membership_data: false } }, /agree/],
    ];
    for (const [over, message] of cases) await expect(register(u, alumnus(over))).rejects.toThrow(message);
    const r = await db.query<{ n: number }>("select count(*)::int n from public.persons where user_id = $1", [u]);
    expect(r.rows[0].n).toBe(0);
  });

  it("saves the person, phone, profile and consents together", async () => {
    const u = await createLogin(db, "Grace@Example.com", "Grace");
    const res = await register(u, alumnus());
    expect(res.rows[0].r.dues_reference).toBeNull();
    const p = await personFor(db, u);
    const profile = await db.query<{ year_left: number; region: string; status: string; level: string }>(`
      select mp.year_left, cl.name region, mp.membership_status status, ml.name level
      from public.member_profiles mp join public.clusters cl on cl.id = mp.cluster_id
      join public.membership_levels ml on ml.id = mp.level_id where mp.person_id = $1`, [p]);
    expect(profile.rows[0]).toEqual({ year_left: 2008, region: "Nairobi", status: "registered", level: "Launch" });
    const phone = await db.query<{ value: string; country: string; is_whatsapp: boolean }>(
      "select value, country, is_whatsapp from public.person_contacts where person_id = $1 and kind = 'phone'", [p]);
    expect(phone.rows[0]).toEqual({ value: "+254712000111", country: "KE", is_whatsapp: true });
    const consents = await db.query<{ purpose: string; granted: boolean }>(
      "select purpose, granted from public.consents where person_id = $1 order by purpose", [p]);
    expect(consents.rows.find((c) => c.purpose === "public_profile")?.granted).toBe(false);
    expect(consents.rows.find((c) => c.purpose === "membership_data")?.granted).toBe(true);
    await expect(register(u, alumnus())).rejects.toThrow(/already registered/);
  });

  it("gives friends no level and asks how they are connected", async () => {
    const u = await createLogin(db, "friend@example.com");
    const friend = alumnus({ full_name: "Peter Friend", phone: "0722 000 222", category: "friend", level: undefined,
      year_left: undefined, occupation_status: undefined, relationship: "", county: "Kisii", region: "Nyanza" });
    await expect(register(u, friend)).rejects.toThrow(/connected to the school/);
    await register(u, { ...friend, relationship: "Parent" });
    const r = await db.query<{ level_id: string | null; cohort_id: string | null }>(
      "select level_id, cohort_id from public.member_profiles where person_id = $1", [await personFor(db, u)]);
    expect(r.rows[0]).toEqual({ level_id: null, cohort_id: null });
  });

  it("accepts a diaspora number with its country", async () => {
    const u = await createLogin(db, "london@example.com");
    await register(u, alumnus({ full_name: "Diana Moraa", phone: "+44 7700 900123", phone_country: "GB",
      county: "Outside Kenya", region: "Diaspora" }));
    const r = await db.query<{ value: string; country: string }>(
      "select value, country from public.person_contacts where person_id = $1 and kind = 'phone'", [await personFor(db, u)]);
    expect(r.rows[0]).toEqual({ value: "+447700900123", country: "GB" });
  });

  it("links to the donor record with the same email instead of making a second person", async () => {
    await db.query(`select * from public.give('alumni-fund', 1000, 'once', 'Sam', 'Giver', 'sam@example.com',
      '0733 000 333', null, false, false, null)`);
    const donor = await db.query<{ person_id: string }>(
      "select person_id from public.person_contacts where kind = 'email' and value = 'sam@example.com'");
    const u = await createLogin(db, "sam@example.com", "Sam Giver");
    // signing in alone links the record back, but does not register
    expect(await personFor(db, u)).toBe(donor.rows[0].person_id);
    expect((await db.query("select 1 from public.member_profiles where person_id = $1", [donor.rows[0].person_id])).rows.length).toBe(0);
    await register(u, alumnus({ full_name: "Samuel Giver", phone: "0733 000 333" }));
    expect((await db.query("select 1 from public.member_profiles where person_id = $1", [donor.rows[0].person_id])).rows.length).toBe(1);
  });

  it("flags, never merges, a phone already on someone else's record", async () => {
    const u = await createLogin(db, "copycat@example.com");
    await register(u, alumnus({ full_name: "Grace Kerubo Nyang'au", phone: "0712 000 111" }));
    const p = await personFor(db, u);
    const flags = await db.query<{ reason: string }>(
      "select reason from public.duplicate_flags where person_a_id = $1 order by reason", [p]);
    expect(flags.rows.map((f) => f.reason)).toEqual(["same_name_cohort", "same_phone"]);
    const persons = await db.query<{ n: number }>("select count(*)::int n from public.persons where full_name = 'Grace Kerubo Nyang''au'");
    expect(persons.rows[0].n).toBe(2);
  });

  it("records a class invite and the person who invited", async () => {
    const inviter = await personFor(db, admin);
    const link = await db.query<{ token: string }>(`insert into public.invite_links (label, cohort_id, inviter_person_id)
      values ('Class of 2008', (select id from public.cohorts where year_left = 2008), $1) returning token`, [inviter]);
    const token = link.rows[0].token;
    await as(db, "anon", async () => {
      const info = await db.query<{ label: string; year_left: number }>("select * from public.invite_info($1)", [token]);
      expect(info.rows[0]).toEqual({ label: "Class of 2008", year_left: 2008, tester: false });
      expect((await db.query("select * from public.invite_links")).rows).toEqual([]);
    });
    const u = await createLogin(db, "invited@example.com");
    await register(u, alumnus({ full_name: "Ivy Invited", phone: "0711 555 555", invite: token }));
    const r = await db.query<{ invited_by_person_id: string; registration_source: string }>(
      "select invited_by_person_id, registration_source from public.member_profiles where person_id = $1", [await personFor(db, u)]);
    expect(r.rows[0]).toEqual({ invited_by_person_id: inviter, registration_source: "invite" });
  });

  it("adds a fee at the end only when the level has one and fees are switched on", async () => {
    await db.query("update public.membership_levels set fee_amount = 500, fee_type = 'annual' where name = 'Growth'");
    const u1 = await createLogin(db, "nofees@example.com");
    const r1 = await register(u1, alumnus({ full_name: "No Fees Yet", phone: "0711 111 222", level: "Growth" }));
    expect(r1.rows[0].r.dues_reference).toBeNull();

    await setModule("membership_fees", true);
    const u2 = await createLogin(db, "fees@example.com");
    const r2 = await register(u2, alumnus({ full_name: "Fee Payer", phone: "0711 111 333", level: "Growth" }));
    expect(r2.rows[0].r.dues_amount).toBe(500);
    expect(String(r2.rows[0].r.dues_reference)).toMatch(/^MSA-M-\d{4}-\d{6}$/);
    await as(db, { user: u2 }, async () => {
      expect((await db.query("select reference from public.membership_dues")).rows.length).toBe(1);
    });
    await setModule("membership_fees", false);
  });

  it("queues a welcome email", async () => {
    const r = await db.query<{ n: number }>("select count(*)::int n from public.notifications where template_key = 'registration_welcome'");
    expect(r.rows[0].n).toBeGreaterThan(3);
  });
});

describe("after registration", () => {
  it("lets members edit their details but not their own status or verification", async () => {
    const u = await createLogin(db, "self@example.com");
    await register(u, alumnus({ full_name: "Self Editor", phone: "0711 222 333" }));
    await as(db, { user: u }, async () => {
      await db.query("update public.member_profiles set headline = 'Civil engineer' where true");
      await expect(db.query("update public.member_profiles set membership_status = 'verified'")).rejects.toThrow(/administrator/);
      await expect(db.query("update public.persons set status = 'merged'")).rejects.toThrow();
      await expect(db.query(`insert into public.member_profiles (person_id, category_id)
        values ((select id from public.persons limit 1), (select id from public.member_categories limit 1))`)).rejects.toThrow();
    });
  });

  it("keeps next of kin to the member; the Welfare Coordinator's views are logged", async () => {
    const u = await createLogin(db, "kin@example.com");
    await register(u, alumnus({ full_name: "Kin Owner", phone: "0711 444 555" }));
    const p = await personFor(db, u);
    await as(db, { user: u }, async () => {
      await db.query("insert into public.next_of_kin (person_id, name, relationship, phone) values ($1, 'Mama', 'Mother', '+254700111222')", [p]);
    });
    const wc = await createUser(db, "welfare@example.com", "Wanjiru Welfare");
    await assignRole(db, (await personFor(db, wc))!, "welfare_coordinator");
    await as(db, { user: wc }, async () => {
      expect((await db.query("select * from public.next_of_kin")).rows.length).toBe(0);
      await expect(db.query("select * from public.view_next_of_kin($1, '')", [p])).rejects.toThrow(/why/);
      const r = await db.query<{ name: string }>("select * from public.view_next_of_kin($1, 'Bereavement support case')", [p]);
      expect(r.rows[0].name).toBe("Mama");
    });
    const log = await db.query<{ data_kind: string; reason: string }>(
      "select data_kind, reason from public.sensitive_access_log where subject_person_id = $1", [p]);
    expect(log.rows).toEqual([{ data_kind: "next_of_kin", reason: "Bereavement support case" }]);
  });

  it("lets members upload only into their own photo folder", async () => {
    const u = await createLogin(db, "photo@example.com");
    await register(u, alumnus({ full_name: "Photo Person", phone: "0711 666 777" }));
    const p = await personFor(db, u);
    await as(db, { user: u }, async () => {
      await db.query("insert into storage.objects (bucket_id, name) values ('member-photos', $1)", [`${p}/me-800.webp`]);
      await expect(db.query("insert into storage.objects (bucket_id, name) values ('member-photos', 'someone-else/me.webp')")).rejects.toThrow();
    });
    const outsider = await createLogin(db, "outsider@example.com");
    await as(db, { user: outsider }, async () => {
      expect((await db.query("select name from storage.objects where bucket_id = 'member-photos'")).rows.length).toBe(0);
    });
    // Every current member is in the directory, so fellow members see the photo.
    const peer = await createLogin(db, "peer@example.com");
    await register(peer, alumnus({ full_name: "Peer Member", phone: "0711 666 888" }));
    const visible = () => as(db, { user: peer }, async () =>
      (await db.query("select name from storage.objects where bucket_id = 'member-photos' and name like $1", [`${p}/%`])).rows.length);
    expect(await visible()).toBe(1);
  });
});

describe("giving officials a role", () => {
  it("works from the SQL editor for someone who has only signed in, and never from the website", async () => {
    const u = await createLogin(db, "sec@example.com");
    await db.query("select public.give_role('sec@example.com', 'secretary', 'Sarah Secretary')");
    const r = await db.query<{ key: string }>(`select r.key from public.role_assignments ra join public.roles r on r.id = ra.role_id
      join public.persons p on p.id = ra.person_id where p.user_id = $1`, [u]);
    expect(r.rows.map((x) => x.key)).toEqual(["secretary"]);
    await as(db, { user: u }, async () => {
      await expect(db.query("select public.give_role('sec@example.com', 'admin')")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("links the website names", () => {
  it("keeps the database link names the website uses to read a member's profile", async () => {
    // member_profiles points at persons three ways, so the website names this link explicitly.
    const r = await db.query<{ conname: string }>(
      "select conname from pg_constraint where conname = 'member_profiles_person_id_fkey'");
    expect(r.rows.length).toBe(1);
  });
});

describe("profile polish", () => {
  it("tidies names typed in capitals or lower case, and leaves mixed case alone", async () => {
    const r = await db.query<{ a: string; b: string; c: string; d: string }>(`select public.tidy_name('NEHEMIAH  MAKAU') a,
      public.tidy_name('grace kerubo') b, public.tidy_name('Ruth McDonald') c, public.tidy_name('PETER O''BRIEN') d`);
    expect(r.rows[0]).toEqual({ a: "Nehemiah Makau", b: "Grace Kerubo", c: "Ruth McDonald", d: "Peter O'Brien" });
    const u = await createLogin(db, "caps@example.com");
    await register(u, alumnus({ full_name: "JOHN OMONDI ONYANGO", phone: "0711 999 000" }));
    const p = await db.query<{ full_name: string }>("select full_name from public.persons where user_id = $1", [u]);
    expect(p.rows[0].full_name).toBe("John Omondi Onyango");
  });

  it("offers a shared skills list to everyone", async () => {
    await as(db, "anon", async () => {
      const r = await db.query<{ n: number }>("select count(*)::int n from public.skills where active");
      expect(r.rows[0].n).toBeGreaterThan(150);
    });
  });
});
