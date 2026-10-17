import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Opportunities: jobs, businesses, business opportunities and volunteering. Members only; reportable.
let db: Db;
let admin: string;
let a: { user: string; person: string };
let b: { user: string; person: string };
let secretary: { user: string; person: string };
let stranger: string;
let job = "";
let role = "";

async function register(email: string, name: string, phone: string) {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: name, phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: 2012,
    occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  return { user: u, person: (await personFor(db, u))! };
}

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  a = await register("a@example.com", "Amos Achieng", "0711 110 001");
  b = await register("b@example.com", "Beth Bosire", "0711 110 002");
  secretary = await register("s@example.com", "Sara Secretary", "0711 110 003");
  await assignRole(db, secretary.person, "secretary");
  stranger = await createLogin(db, "x@example.com");
}, 90_000);

describe("jobs", () => {
  it("lets members post jobs that members see, until the closing date", async () => {
    await as(db, { user: a.user }, async () => {
      job = (await db.query<{ id: string }>(
        `insert into public.job_posts (posted_by, title, organisation, location, work_type, apply_url, closes_on)
         values ($1, 'Accountant', 'Kisii Traders', 'Kisii', 'full_time', 'https://example.com/apply', current_date + 14) returning id`, [a.person])).rows[0].id;
      await db.query(`insert into public.job_posts (posted_by, title, organisation, location, work_type, apply_email, closes_on)
                      values ($1, 'Old job', 'X Ltd', 'Nairobi', 'contract', 'jobs@x.co.ke', current_date - 1)`, [a.person]);
      await expect(db.query(`insert into public.job_posts (posted_by, from_association, title, organisation, location, work_type, apply_url, closes_on)
                             values ($1, true, 'Fake official', 'Association', 'Kisii', 'contract', 'https://x.example', current_date + 3)`, [a.person])).rejects.toThrow(/officials/);
    });
    await as(db, { user: b.user }, async () => {
      expect((await db.query<{ title: string; poster: string }>("select title, poster from public.open_jobs()")).rows).toEqual([{ title: "Accountant", poster: "Amos Achieng" }]);
      await db.query("insert into public.opportunity_reports (target_type, target_id, person_id, reason) values ('job', $1, $2, 'Looks like a scam')", [job, b.person]);
      expect((await db.query("update public.job_posts set status = 'hidden' where id = $1 returning id", [job])).rows).toEqual([]);
    });
    await as(db, { user: stranger }, async () => {
      expect((await db.query("select * from public.open_jobs()")).rows).toEqual([]);
    });
  });

  it("lets administrators see reports and hide; the poster cannot bring it back", async () => {
    await as(db, { user: admin }, async () => {
      expect(Number((await db.query<{ reports: string }>("select reports from public.open_jobs() where id = $1", [job])).rows[0].reports)).toBe(1);
      await db.query("update public.job_posts set status = 'hidden' where id = $1", [job]);
    });
    await as(db, { user: a.user }, async () => {
      await expect(db.query("update public.job_posts set status = 'published' where id = $1", [job])).rejects.toThrow(/hidden/);
    });
  });
});

describe("businesses", () => {
  it("lists businesses for members, and publicly only when the owner chooses", async () => {
    await as(db, { user: a.user }, async () => {
      await db.query(`insert into public.businesses (posted_by, name, description, sector, county, public_listing) values
                      ($1, 'Amos Agrovet', 'Animal feeds and vet supplies', 'Agriculture', 'Kisii', true),
                      ($1, 'Quiet Consulting', 'Tax and audit services for SMEs', 'Professional services', 'Nairobi', false)`, [a.person]);
      await db.query(`insert into public.business_opportunities (posted_by, kind, title, details, contact) values
                      ($1, 'distributor', 'Distributors wanted', 'Seeking distributors in Nyamira and Migori.', '0711 110 001')`, [a.person]);
    });
    await as(db, { user: b.user }, async () => {
      expect((await db.query("select * from public.business_directory()")).rows.length).toBe(2);
      expect((await db.query<{ title: string }>("select title from public.open_business_opportunities()")).rows).toEqual([{ title: "Distributors wanted" }]);
    });
    await as(db, "anon", async () => {
      expect((await db.query<{ name: string }>("select name from public.public_businesses()")).rows).toEqual([{ name: "Amos Agrovet" }]);
      expect((await db.query("select * from public.businesses")).rows).toEqual([]);
    });
  });
});

describe("volunteering", () => {
  it("lets the Secretary post, members sign up, and only officials see who signed up", async () => {
    await as(db, { user: a.user }, async () => {
      await expect(db.query("insert into public.volunteer_roles (title) values ('Not allowed')")).rejects.toThrow();
    });
    await as(db, { user: secretary.user }, async () => {
      role = (await db.query<{ id: string }>("insert into public.volunteer_roles (title, place, people_needed, skills) values ('Career day speakers', 'Menyenya', 5, '{Medicine}') returning id")).rows[0].id;
    });
    await as(db, { user: b.user }, async () => {
      await db.query("insert into public.volunteer_signups (role_id, person_id, note) values ($1, $2, 'I can talk about nursing')", [role, b.person]);
      const v = (await db.query<{ signed_up: string; i_signed_up: boolean }>("select signed_up, i_signed_up from public.volunteer_board()")).rows[0];
      expect(Number(v.signed_up)).toBe(1);
      expect(v.i_signed_up).toBe(true);
      expect((await db.query("select * from public.volunteer_signup_list($1)", [role])).rows).toEqual([]);
    });
    await as(db, { user: secretary.user }, async () => {
      const list = (await db.query<{ full_name: string; phone: string }>("select full_name, phone from public.volunteer_signup_list($1)", [role])).rows;
      expect(list[0].full_name).toBe("Beth Bosire");
      expect(list[0].phone).toBeTruthy();
    });
  });
});
