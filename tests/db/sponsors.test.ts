import { beforeAll, describe, expect, it } from "vitest";
import { as, createLogin, createUser, freshDatabase, type Db } from "./harness";

// Ways to support: sponsors, partners, packages and enquiries.
let db: Db;
let admin: string;
let stranger: string;
let pkg: string;

beforeAll(async () => {
  db = await freshDatabase();
  admin = await createUser(db, "admin@example.com", "Ada Admin");
  await db.query("select public.bootstrap_admin('admin@example.com')");
  stranger = await createLogin(db, "someone@example.com");
}, 60_000);

describe("sponsors and partners", () => {
  it("lets only administrators add packages and supporters", async () => {
    await as(db, { user: stranger }, async () => {
      await expect(db.query("insert into public.supporters (kind, name) values ('sponsor', 'Acme Ltd')")).rejects.toThrow();
    });
    await as(db, { user: admin }, async () => {
      pkg = (await db.query<{ id: string }>(
        "insert into public.support_packages (kind, name, benefits) values ('sponsor', 'Business Alliance', '{Logo on the website}') returning id")).rows[0].id;
      await db.query("insert into public.support_packages (kind, name, status) values ('sponsor', 'Hidden package', 'draft')");
      await db.query("insert into public.supporters (kind, name, package_id, featured) values ('sponsor', 'Acme Ltd', $1, true)", [pkg]);
      await db.query("insert into public.supporters (kind, name, status) values ('partner', 'Draft Partner', 'draft')");
    });
  });

  it("shows only published packages and supporters to the public", async () => {
    await as(db, "anon", async () => {
      expect((await db.query<{ name: string }>("select name from public.support_packages")).rows.map((r) => r.name)).toEqual(["Business Alliance"]);
      expect((await db.query<{ name: string }>("select name from public.supporters")).rows.map((r) => r.name)).toEqual(["Acme Ltd"]);
      await expect(db.query("update public.supporters set name = 'Hacked'")).resolves.toBeDefined();
    });
    await as(db, { user: admin }, async () => {
      expect((await db.query("select 1 from public.supporters where name = 'Hacked'")).rows).toEqual([]);
    });
  });

  it("accepts enquiries from the public but keeps them private", async () => {
    await as(db, "anon", async () => {
      await db.query("select public.submit_support_enquiry('sponsor', 'Acme Ltd', 'Jane Doe', 'Jane@Acme.co.ke', '0711 000 000', $1, 'We would like to sponsor.')", [pkg]);
      await expect(db.query("select public.submit_support_enquiry('sponsor', 'Acme Ltd', 'Jane Doe', 'not-an-email')")).rejects.toThrow(/email/);
      await expect(db.query("insert into public.support_enquiries (kind, organisation, contact_name, email) values ('sponsor','x','y','z@z.z')")).rejects.toThrow();
      expect((await db.query("select * from public.support_enquiries")).rows).toEqual([]);
    });
    await as(db, { user: stranger }, async () => {
      expect((await db.query("select * from public.support_enquiries")).rows).toEqual([]);
    });
    await as(db, { user: admin }, async () => {
      const r = await db.query<{ email: string; status: string }>("select email, status from public.support_enquiries");
      expect(r.rows).toEqual([{ email: "jane@acme.co.ke", status: "new" }]);
    });
  });

  it("limits repeated enquiries from one address", async () => {
    await as(db, "anon", async () => {
      for (let i = 0; i < 4; i++) await db.query("select public.submit_support_enquiry('partner', 'Acme Ltd', 'Jane Doe', 'jane@acme.co.ke')");
      await expect(db.query("select public.submit_support_enquiry('partner', 'Acme Ltd', 'Jane Doe', 'jane@acme.co.ke')")).rejects.toThrow(/too many/);
    });
  });
});
