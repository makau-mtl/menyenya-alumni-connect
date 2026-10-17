import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Bursary Fund, impact figures and impact stories.
let db: Db;
let admin: string;
let secretary: { user: string; person: string };
let member: { user: string; person: string };
let causeId = "";

async function register(email: string, name: string, phone: string) {
  const u = await createLogin(db, email);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: name, phone, phone_country: "KE", phone_whatsapp: false, category: "alumnus", year_left: 2008,
    occupation_status: "employed", level: "Growth", county: "Nairobi", region: "Nairobi",
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  return { user: u, person: (await personFor(db, u))! };
}

const body = "Wanjiku was close to dropping out in Form 2 when her fees fell behind. A bursary kept her in class all year.";

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  secretary = await register("s@example.com", "Sara Secretary", "0711 700 001");
  member = await register("m@example.com", "Mike Member", "0711 700 002");
  await assignRole(db, secretary.person, "secretary");
  causeId = (await db.query<{ id: string }>("select id from public.causes where slug = 'bursary-fund'")).rows[0].id;
}, 90_000);

describe("bursary fund", () => {
  it("replaces Keep a child in school, with its own association account", async () => {
    const r = await db.query<{ title: string; holder: string; channel: string }>(
      `select c.title, pc.holder, pc.key as channel from public.causes c join public.funds f on f.id = c.fund_id
       join public.payment_channels pc on pc.id = f.channel_id where c.slug = 'bursary-fund'`);
    expect(r.rows[0]).toEqual({ title: "Menyenya Alumni Bursary Fund", holder: "association", channel: "association-bursary" });
    expect((await db.query("select 1 from public.causes where slug = 'keep-a-child-in-school'")).rows).toEqual([]);
  });

  it("shows the fees and yearly need publicly once the school gives them", async () => {
    await as(db, { user: admin }, async () => {
      await db.query("insert into public.school_stats (as_of, students, needy_students) values ('2026-10-01', 1200, 180)");
      await db.query("insert into public.school_stats (as_of, students, fees_year, term_fee_kes, annual_fee_kes, needy_admitted_per_year) values ('2026-10-02', 1200, 2027, 18000, 54000, 60)");
    });
    const f = await as(db, "anon", async () => (await db.query<{ f: Record<string, unknown> }>("select public.public_figures() as f")).rows[0].f);
    expect(f).toMatchObject({ fees_year: 2027, annual_fee_kes: 54000, term_fee_kes: 18000, needy_admitted_per_year: 60 });
  });
});

describe("impact", () => {
  it("lets officials add impact figures that everyone can read; members cannot", async () => {
    await as(db, { user: secretary.user }, () =>
      db.query("insert into public.impact_figures (cause_id, value, label, as_of) values ($1, '12', 'students on bursaries in 2027', '2027-03-31')", [causeId]));
    await as(db, { user: member.user }, async () => {
      await expect(db.query("insert into public.impact_figures (cause_id, value, label, as_of) values ($1, '99', 'made up', '2027-03-31')", [causeId])).rejects.toThrow();
    });
    await as(db, "anon", async () => {
      expect((await db.query<{ value: string }>("select value from public.impact_figures")).rows).toEqual([{ value: "12" }]);
    });
  });

  it("lets officials write impact stories with a video, published only with consent", async () => {
    let id = "";
    await as(db, { user: secretary.user }, async () => {
      id = (await db.query<{ id: string }>(
        "insert into public.alumni_stories (kind, submitted_by, subject_name, title, body, cause_id, video_url) values ('impact', $1, 'Wanjiku, Form 3', 'Back in class', $2, $3, 'https://youtu.be/abcdefghijk') returning id",
        [secretary.person, body, causeId])).rows[0].id;
      await expect(db.query("update public.alumni_stories set status = 'published' where id = $1", [id])).rejects.toThrow();
      await expect(db.query("update public.alumni_stories set video_url = 'https://evil.example/x' where id = $1", [id])).rejects.toThrow();
      await db.query("update public.alumni_stories set consent_given = true, consent_note = 'Parent and Principal agreed in writing', status = 'published' where id = $1", [id]);
    });
    await as(db, { user: member.user }, async () => {
      await expect(db.query("insert into public.alumni_stories (kind, submitted_by, subject_name, title, body) values ('impact', $1, 'X', 'Not allowed here', $2)", [member.person, body])).rejects.toThrow(/officials/);
    });
    await as(db, "anon", async () => {
      const list = (await db.query<{ title: string; is_impact: boolean; has_video: boolean; cause_slug: string }>("select title, is_impact, has_video, cause_slug from public.public_stories(24, false, 'impact', 'bursary-fund')")).rows;
      expect(list).toEqual([{ title: "Back in class", is_impact: true, has_video: true, cause_slug: "bursary-fund" }]);
      expect((await db.query("select * from public.public_stories(24, false, 'alumni')")).rows).toEqual([]);
    });
  });
});
