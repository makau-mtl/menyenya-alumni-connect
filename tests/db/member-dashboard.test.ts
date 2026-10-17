import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Dashboard Part A: community figures, the school today, priorities and members' views, confirmers.
let db: Db;
let admin: string;
const members: { user: string; person: string }[] = [];

async function register(i: number, year: number, region: string, gender: string | null) {
  const u = await createLogin(db, `m${i}@example.com`);
  await as(db, { user: u }, () => db.query("select public.complete_registration($1)", [JSON.stringify({
    full_name: `Member Number${i}`, phone: `0711 100 ${String(i).padStart(3, "0")}`, phone_country: "KE", phone_whatsapp: false,
    category: "alumnus", year_left: year, occupation_status: "employed", level: "Growth", county: region, region,
    consents: { membership_data: true, directory_listing: true, public_profile: false, email_updates: false, whatsapp_updates: false } })]));
  const person = (await personFor(db, u))!;
  if (gender) await as(db, { user: u }, () => db.query("update public.member_profiles set gender = $1 where person_id = $2", [gender, person]));
  return { user: u, person };
}

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  await db.query("update public.module_settings set enabled = true where module_key = 'registration'");
  for (let i = 0; i < 7; i++) members.push(await register(i, i < 4 ? 2010 : 2004, "Nairobi", i < 6 ? "female" : "male"));
}, 90_000);

describe("member dashboard", () => {
  it("gives members community figures, hiding groups smaller than 5", async () => {
    await as(db, { user: members[0].user }, async () => {
      const s = (await db.query<{ s: Record<string, unknown> }>("select public.dashboard_stats() as s")).rows[0].s;
      expect(s.total).toBe(7);
      expect(s.my_class).toBe(2010);
      expect(s.my_class_count).toBe(4);
      expect(s.my_class_rank).toBe(1);
      expect(s.female).toBe(6);
      expect(s.male).toBeNull(); // only one: hidden
      expect(s.gender_answered).toBe(7);
    });
    await as(db, "anon", async () => {
      await expect(db.query("select public.dashboard_stats()")).rejects.toThrow(/permission denied/);
    });
  });

  it("lets only administrators or the school liaison update the school's figures", async () => {
    await as(db, { user: members[0].user }, async () => {
      await expect(db.query("insert into public.school_stats (as_of, students) values (current_date, 900)")).rejects.toThrow();
    });
    await as(db, { user: admin }, async () => {
      await db.query("insert into public.school_stats (as_of, students, needy_students, supported_by_alumni) values (current_date, 1240, 180, 12)");
      await db.query("insert into public.academic_results (year, value, grade) values (2025, 7.12, 'C+')");
      await db.query("insert into public.school_priorities (title, sort_order) values ('Tuition block', 1), ('Science laboratory', 2)");
    });
    await as(db, { user: members[1].user }, async () => {
      expect((await db.query<{ students: number }>("select students from public.school_stats")).rows[0].students).toBe(1240);
    });
    await as(db, "anon", async () => {
      expect((await db.query("select * from public.school_stats")).rows).toEqual([]);
    });
  });

  it("collects each member's view on priorities privately and shows the overall picture", async () => {
    let first = "";
    await as(db, { user: members[0].user }, async () => {
      first = (await db.query<{ id: string }>("select id from public.priority_summary() order by sort_order limit 1")).rows[0].id;
      await db.query("insert into public.priority_views (priority_id, person_id, importance, comment) values ($1, $2, 5, 'Most urgent')", [first, members[0].person]);
      await expect(db.query("insert into public.priority_views (priority_id, person_id, importance) values ($1, $2, 1)", [first, members[1].person])).rejects.toThrow();
    });
    await as(db, { user: members[1].user }, async () => {
      await db.query("insert into public.priority_views (priority_id, person_id, importance) values ($1, $2, 4)", [first, members[1].person]);
      expect((await db.query("select * from public.priority_views")).rows.length).toBe(1); // only their own
      const r = await db.query<{ responses: string; average: string; my_importance: number }>("select responses, average, my_importance from public.priority_summary() where id = $1", [first]);
      expect(r.rows[0]).toMatchObject({ my_importance: 4 });
      expect(Number(r.rows[0].responses)).toBe(2);
      expect(Number(r.rows[0].average)).toBe(4.5);
    });
    await as(db, { user: admin }, async () => {
      expect((await db.query("select comment from public.priority_views where comment <> ''")).rows).toEqual([{ comment: "Most urgent" }]);
    });
  });

  it("knows who is set up to confirm members", async () => {
    await as(db, { user: admin }, async () => {
      expect((await db.query<{ c: boolean }>("select public.is_confirmer() as c")).rows[0].c).toBe(false); // confirmation off
    });
    await db.query("update public.module_settings set enabled = true where module_key = 'verification'");
    await as(db, { user: admin }, async () => {
      expect((await db.query<{ c: boolean }>("select public.is_confirmer() as c")).rows[0].c).toBe(true);
    });
    await as(db, { user: members[0].user }, async () => {
      expect((await db.query<{ c: boolean }>("select public.is_confirmer() as c")).rows[0].c).toBe(false);
    });
  });

  it("gives members the full breakdown, and nobody else", async () => {
    await as(db, { user: members[2].user }, async () => {
      const b = (await db.query<{ b: Record<string, unknown> }>("select public.community_breakdown() as b")).rows[0].b;
      expect(b.classes).toEqual([{ year: 2010, count: 4 }, { year: 2004, count: 3 }]);
      expect(b.male).toBeNull();
      expect((b.joined_by_month as unknown[]).length).toBe(1);
    });
    await as(db, "anon", async () => {
      await expect(db.query("select public.community_breakdown()")).rejects.toThrow(/permission denied/);
    });
  });
});
