import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, personFor, type Db } from "./harness";

// Part D: cases for support — private to the raiser and the right handlers; opening one is logged.
let db: Db;
let admin: string;
let a: { user: string; person: string };
let b: { user: string; person: string };
let welfare: { user: string; person: string };
let caseId = "";

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
  a = await register("a@example.com", "Alice Achieng", "0711 400 001");
  b = await register("b@example.com", "Brian Bosire", "0711 400 002");
  welfare = await register("w@example.com", "Wanjiru Welfare", "0711 400 003");
  await db.query(`insert into public.role_assignments (person_id, role_id, scope_type)
                  select $1, id, 'association' from public.roles where key = 'welfare_coordinator'`, [welfare.person]);
}, 90_000);

describe("cases for support", () => {
  it("lets a member raise a case that only they and the right handlers see", async () => {
    await as(db, { user: a.user }, async () => {
      caseId = (await db.query<{ id: string }>(
        "insert into public.support_cases (person_id, kind, title, details) values ($1, 'member_in_need', 'Hospital bill', 'My mother is in hospital and the bill is large.') returning id",
        [a.person])).rows[0].id;
      await expect(db.query("insert into public.support_cases (person_id, kind, title, details) values ($1, 'other', 'Fake', 'Raised for someone else')", [b.person])).rejects.toThrow();
    });
    await as(db, { user: b.user }, async () => {
      expect((await db.query("select * from public.support_cases")).rows).toEqual([]);
      await expect(db.query("select public.log_case_view($1)", [caseId])).rejects.toThrow(/Not allowed/);
    });
    await as(db, { user: welfare.user }, async () => {
      expect((await db.query<{ title: string }>("select title from public.cases_for_handler()")).rows).toEqual([{ title: "Hospital bill" }]);
      await db.query("select public.log_case_view($1)", [caseId]);
    });
    const log = await db.query<{ data_kind: string }>("select data_kind from public.sensitive_access_log where data_kind = 'support_case'");
    expect(log.rows.length).toBe(1);
  });

  it("keeps internal notes from the raiser, and the case as written", async () => {
    await as(db, { user: welfare.user }, async () => {
      await db.query("insert into public.case_updates (case_id, author_id, body, visible_to_raiser) values ($1, $2, 'Checking with the class rep', false)", [caseId, welfare.person]);
      await db.query("insert into public.case_updates (case_id, author_id, body) values ($1, $2, 'We are sorry to hear this. We will call you today.')", [caseId, welfare.person]);
      await db.query("update public.support_cases set status = 'responded' where id = $1", [caseId]);
      await expect(db.query("update public.support_cases set title = 'Changed' where id = $1", [caseId])).rejects.toThrow(/rewritten/);
    });
    await as(db, { user: a.user }, async () => {
      const t = await db.query<{ body: string; from_handler: boolean }>("select body, from_handler from public.case_thread($1)", [caseId]);
      expect(t.rows).toEqual([{ body: "We are sorry to hear this. We will call you today.", from_handler: true }]);
      await db.query("insert into public.case_updates (case_id, author_id, body) values ($1, $2, 'Thank you')", [caseId, a.person]);
      await expect(db.query("update public.support_cases set status = 'closed' where id = $1", [caseId])).resolves.toBeDefined();
    });
    await as(db, { user: admin }, async () => {
      expect((await db.query<{ status: string }>("select status from public.support_cases where id = $1", [caseId])).rows[0].status).toBe("responded");
      expect((await db.query("select * from public.case_thread($1)", [caseId])).rows.length).toBe(3);
    });
  });
});
