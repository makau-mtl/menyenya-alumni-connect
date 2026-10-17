import { beforeAll, describe, expect, it } from "vitest";
import { as, assignRole, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Public figures, and reports: the Treasurer publishes financial reports, the Chairman the moral report.
let db: Db;
let admin: string;
let treasurer: { user: string; person: string };
let chair: { user: string; person: string };
let member: { user: string; person: string };

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
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  treasurer = await register("t@example.com", "Tom Treasurer", "0711 600 001", 2005);
  chair = await register("c@example.com", "Carol Chair", "0711 600 002", 2001);
  member = await register("m@example.com", "Mike Member", "0711 600 003", 2005);
  await assignRole(db, treasurer.person, "treasurer");
  await assignRole(db, chair.person, "chair");
}, 90_000);

describe("public figures", () => {
  it("gives visitors totals only", async () => {
    await as(db, { user: admin }, () => db.query("insert into public.school_stats (as_of, students, needy_students, supported_by_alumni) values ('2026-10-01', 1200, 180, 12)"));
    const f = await as(db, "anon", async () => (await db.query<{ f: Record<string, unknown> }>("select public.public_figures() as f")).rows[0].f);
    expect(f).toMatchObject({ members: 3, alumni: 3, classes: 2, students: 1200, needy_students: 180, supported_by_alumni: 12 });
  });
});

describe("reports", () => {
  let first = "";
  it("lets the Treasurer upload a financial report that stays private until published", async () => {
    await as(db, { user: treasurer.user }, async () => {
      first = (await db.query<{ id: string }>("insert into public.reports (kind, year, title, file_path, status) values ('financial', 2026, 'Financial statements 2026', 'a.pdf', 'published') returning id")).rows[0].id;
      expect((await db.query<{ status: string }>("select status from public.reports where id = $1", [first])).rows[0].status).toBe("draft");
      await expect(db.query("insert into public.reports (kind, year, title, file_path) values ('moral', 2026, 'Moral report', 'b.pdf')")).rejects.toThrow();
    });
    await as(db, "anon", async () => {
      expect((await db.query("select * from public.reports")).rows).toEqual([]);
    });
    await as(db, { user: member.user }, async () => {
      expect((await db.query("update public.reports set status = 'published' returning id")).rows).toEqual([]);
    });
    await as(db, { user: treasurer.user }, () => db.query("update public.reports set status = 'published' where id = $1", [first]));
    await as(db, "anon", async () => {
      expect((await db.query<{ title: string }>("select title from public.reports")).rows).toEqual([{ title: "Financial statements 2026" }]);
    });
  });

  it("lets the Chairman publish the moral report, and keeps earlier versions", async () => {
    await as(db, { user: chair.user }, async () => {
      const id = (await db.query<{ id: string }>("insert into public.reports (kind, year, title, file_path) values ('moral', 2026, 'Moral report 2026', 'c.pdf') returning id")).rows[0].id;
      await db.query("update public.reports set status = 'published' where id = $1", [id]);
      await expect(db.query("update public.reports set title = 'x' where id = $1", [first])).resolves.toBeDefined();
    });
    await as(db, { user: treasurer.user }, async () => {
      await expect(db.query("update public.reports set file_path = 'z.pdf' where id = $1", [first])).rejects.toThrow(/new version/);
      const v2 = (await db.query<{ id: string }>("insert into public.reports (kind, year, title, file_path, replaces_id) values ('financial', 2026, 'Financial statements 2026 (audited)', 'd.pdf', $1) returning id", [first])).rows[0].id;
      await db.query("update public.reports set status = 'published' where id = $1", [v2]);
    });
    await as(db, "anon", async () => {
      const rows = (await db.query<{ title: string; status: string }>("select title, status from public.reports order by created_at")).rows;
      expect(rows).toEqual([
        { title: "Financial statements 2026", status: "replaced" },
        { title: "Moral report 2026", status: "published" },
        { title: "Financial statements 2026 (audited)", status: "published" },
      ]);
    });
  });
});
